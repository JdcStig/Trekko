import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';

// ========== Overall Metrics Calculation Helpers (for non-split metrics) ==========
const metricsCalculations = {
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

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // Detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`🔍 [parseCSV] Detected delimiter: "${delimiter}"`);

  // Parse CSV into an array of objects
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

  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Build in-memory data for each player
  console.log("🔄 [parseCSV] Building in-memory data for each player...");
  const playersData = {}; // key: playerName
  const sessionDate = new Date(session.date);

  for (const row of rows) {
    const playerName = row['Player Display Name'] || 'Unknown Player';
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;
    const timeStr = row['Time'];

    const timeParts = timeStr.split(':').map(Number);
    const combinedDateTime = new Date(sessionDate);
    combinedDateTime.setUTCHours(timeParts[0], timeParts[1], timeParts[2] || 0, 0);
    const unixTimestamp = Math.floor(combinedDateTime.getTime() / 1000);

    if (!playersData[playerName]) {
      playersData[playerName] = {
        userId,
        sessionId,
        playerId: playerName, // Temporary, will be replaced with actual playerId
        times: [],
        lats: [],
        lons: [],
        speeds: [],
        heartRates: [],
        accelerations: [],
      };
    }

    playersData[playerName].times.push(unixTimestamp);
    playersData[playerName].lats.push(lat);
    playersData[playerName].lons.push(lon);
    playersData[playerName].speeds.push(speed);
    playersData[playerName].heartRates.push(hr);
    playersData[playerName].accelerations.push(accel);
  }

  console.log("🔄 [parseCSV] Checking existing players and assigning playerId...");
  const playerNames = Object.keys(playersData);
  const existingPlayers = await Player.find({ userId, name: { $in: playerNames } });
  const playerMap = new Map(existingPlayers.map(player => [player.name, player.playerId]));

  for (const [playerName, data] of Object.entries(playersData)) {
    if (playerMap.has(playerName)) {
      data.playerId = playerMap.get(playerName);
    }
  }

  console.log("💾 [parseCSV] Preparing SessionPlayerData documents for insertion...");
  const insertArray = [];
  for (const [playerName, pdata] of Object.entries(playersData)) {
    const sortedTimes = pdata.times.sort((a, b) => a - b);
    const startTime = sortedTimes[0] || Math.floor(Date.now() / 1000);
    const endTime = sortedTimes[sortedTimes.length - 1] || Math.floor(Date.now() / 1000);

    insertArray.push({
      userId,
      sessionId,
      playerId: pdata.playerId,
      playerName,
      startTime,
      endTime,
      lats: pdata.lats,
      lons: pdata.lons,
      speeds: pdata.speeds,
      heartRates: pdata.heartRates,
      accelerationImpulses: pdata.accelerations,
    });
  }

  if (insertArray.length) {
    await SessionPlayerData.insertMany(insertArray, { ordered: false });
    console.log(`✅ [parseCSV] Inserted ${insertArray.length} SessionPlayerData records.`);
  }

  console.log("🛠️ [parseCSV] Creating any missing players...");
  await createPlayersFromCSV(sessionId, userId);

  console.log("🔄 [parseCSV] Recalculating average distance...");
  await calculateAverageDistance(sessionId);

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

  try {
    const updatedSession = await parseCSV(req.file.buffer, sessionId, req.user._id);
    return res.status(201).json(updatedSession);
  } catch (error) {
    console.error('🚨 Error processing CSV:', error.message);
    return res.status(500).json({ message: error.message });
  }
});
