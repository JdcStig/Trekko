
// parseCSV.js
import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Team from '../models/teamModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js'; // <-- Import the new helper

// ========== Overall Metrics Calculation Helpers (for non-split metrics) ==========
const metricsCalculations = {
  // Summation-based distance: sum(speeds) / 10 / 1000 => speeds are 10/s
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
  TopSpeed: (values) => Math.max(...values),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

// ====================== parseCSV ======================
// 1) Groups rows by player (via "Player Display Name").
// 2) Inserts SessionPlayerData docs (one per player).
// 3) Calculates overall & per-split metrics (via calculateSplitPlayerMetrics).
// 4) Updates Session with these metrics.
// 5) Creates missing players.
// 6) Recalculates average distance.
// 7) Returns the updated Session.
const parseCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`\n📌 [parseCSV] Start for session=${sessionId} | user=${userId}`);

  // 0) Basic checks
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // 1) Convert buffer to string & detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`🔍 [parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV rows into an array of objects
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`✅ [parseCSV] CSV parsed. Total rows: ${rows.length}`);
  if (!rows.length) {
    throw new Error("CSV is empty or could not be parsed.");
  }

  // 3) Fetch the session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 4) Build in-memory data for each player
  console.log("🔄 [parseCSV] Building in-memory data for each player...");
  const playersData = {}; // key: playerId
  rows.forEach((row) => {
    const playerId = row['Player Display Name'] || 'Unknown Player';
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;
    const dateStr = row['UTC Date'];
    const timeStr = row['UTC Time'];
    const combinedDateTime =
      dateStr && timeStr ? new Date(`${dateStr}T${timeStr}Z`) : new Date();

    if (!playersData[playerId]) {
      playersData[playerId] = {
        userId,
        sessionId,
        playerId,
        times: [],
        lats: [],
        lons: [],
        speeds: [],
        heartRates: [],
        accelerations: [],
      };
    }
    // Push data
    playersData[playerId].times.push(combinedDateTime);
    playersData[playerId].lats.push(lat);
    playersData[playerId].lons.push(lon);
    playersData[playerId].speeds.push(speed);
    playersData[playerId].heartRates.push(hr);
    playersData[playerId].accelerations.push(accel);
  });

  // 5) Prepare documents for insertion
  console.log("💾 [parseCSV] Preparing SessionPlayerData documents for insertion...");
  const insertArray = [];
  for (const [playerId, pdata] of Object.entries(playersData)) {
    const sortedTimes = pdata.times.sort((a, b) => a - b);
    const startTime = sortedTimes[0] || new Date();
    const endTime = sortedTimes[sortedTimes.length - 1] || new Date();
    insertArray.push({
      userId,
      sessionId,
      playerId,
      startTime,
      endTime,
      lats: pdata.lats,
      lons: pdata.lons,
      speeds: pdata.speeds,
      heartRates: pdata.heartRates,
      accelerationImpulses: pdata.accelerations,
    });
  }

  if (!insertArray.length) {
    console.log("✅ [parseCSV] Inserted 0 SessionPlayerData documents. (No data?)");
  }
  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`✅ [parseCSV] Inserted ${insertedDocs.length} SessionPlayerData documents.`);

  // 6) Calculate metrics for each inserted doc & attach to session.sessionPlayerData
  console.log("📊 [parseCSV] Generating overall and per-split metrics...");
  session.sessionPlayerData = []; // Clear existing

  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allPlayerDocs) {
    const speeds = doc.speeds.length ? doc.speeds : [0];

    // --- Overall metrics (distance, topSpeed, etc.) ---
    const sessionPlayerMetrics = [
      {
        MetricName: 'Distance',
        Value: metricsCalculations.Distance(speeds),
        Unit: 'km',
      },
      {
        MetricName: 'TopSpeed',
        Value: metricsCalculations.TopSpeed(speeds),
        Unit: 'm/s',
      },
      {
        MetricName: 'HighSpeedRunning',
        Value: metricsCalculations.HighSpeedRunning(speeds),
        Unit: 'km',
      },
      {
        MetricName: 'Sprinting',
        Value: metricsCalculations.Sprinting(speeds),
        Unit: 'km',
      },
    ];

    // --- NEW: per-split metrics using the helper (with console logs) ---
    console.log(
      `\n[parseCSV] Calculating split metrics for playerId="${doc.playerId}"`
    );
    const splitPlayerMetrics = calculateSplitPlayerMetrics(
      speeds,
      session.splits || []
    );

    // Attach to session
    session.sessionPlayerData.push({
      csvId: doc._id,
      playerName: doc.playerId,
      sessionPlayerMetrics,
      splitPlayerMetrics,
    });
  }

  // Save updated session
  await session.save();
  console.log("✅ [parseCSV] Session updated with new CSV metrics.");

  // 7) Create any missing players
  console.log("🛠️ [parseCSV] Creating any missing players...");
  await createPlayersFromCSV(sessionId, userId);
  console.log("✅ [parseCSV] createPlayersFromCSV done.");

  // 8) Recalculate average distance for the session
  console.log("🔄 [parseCSV] Recalculating average distance...");
  await calculateAverageDistance(sessionId);
  console.log("✅ [parseCSV] Average distance updated.");

  // 9) Return the updated session (populated)
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  console.log("🚀 [parseCSV] Done. Returning updated session.");
  return updatedSession;
};

export default parseCSV;

// ====================== POST /api/sessions/upload ======================
// Route handler to upload & process CSV for a session.
export const uploadSessionCSV = asyncHandler(async (req, res) => {
  console.log('📌 Received CSV upload request for session:', req.body.sessionId);
  const { sessionId } = req.body;
  if (!sessionId) {
    console.error('🚨 No session ID provided!');
    return res.status(400).json({ message: 'Session ID is required.' });
  }
  if (!req.file) {
    console.error('🚨 No file uploaded!');
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  console.log(`✅ File received: ${req.file.originalname} | Size: ${req.file.size} bytes`);

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    console.error('🚨 Invalid sessionId:', sessionId);
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    const updatedSession = await parseCSV(req.file.buffer, sessionId, req.user._id);
    console.log('🚀 CSV processing complete! Returning updated session.');
    return res.status(201).json(updatedSession);
  } catch (error) {
    console.error('🚨 Error processing CSV:', error.message);
    return res.status(500).json({ message: error.message });
  }
});
