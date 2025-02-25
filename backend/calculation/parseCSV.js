import { Readable } from 'stream';
import csvParser from 'csv-parser';
import mongoose from 'mongoose';

import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import Player from '../models/playerModel.js';

import createPlayersFromCSV from './createPlayersFromCSV.js';
import calculateAverageDistance from './calculateAverageDistance.js';

// --------------------- Metrics Calculation Helpers ---------------------
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
  TopSpeed: (values) => Math.max(...values), // in m/s
  HighSpeedRunning: (values) =>
    (values.filter(v => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
  Sprinting: (values) =>
    (values.filter(v => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
};

/**
 * Single-pass CSV parser that:
 *  1) Groups rows by player.
 *  2) Inserts one SessionPlayerData document per player.
 *  3) Computes per-player metrics.
 *  4) Updates the Session with session-level data.
 *  5) Creates missing players.
 *  6) Recalculates average distance.
 *  7) Returns the updated Session.
 *
 * @param {Buffer} fileBuffer - The CSV file buffer.
 * @param {String} sessionId   - The ID of the session.
 * @param {String} userId      - The ID of the user.
 * @returns {Promise<Session>} - The updated session.
 */
const parseCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`📌 [parseCSV] Start for session=${sessionId} | user=${userId}`);

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // 1) Convert buffer to string and detect delimiter.
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`🔍 [parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV into an array of row objects.
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

  // 3) Fetch the session from the DB.
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 4) Build in-memory data for each player.
  // Adjust the header names as needed.
  console.log("🔄 [parseCSV] Building in-memory data for each player...");
  const playersData = {};
  for (const row of rows) {
    const playerId = row['Player Display Name'] || 'Unknown Player';

    // Build a UTC datetime from "UTC Date" and "UTC Time" (if provided).
    const dateStr = row['UTC Date'];
    const timeStr = row['UTC Time'];
    const combinedDateTime = (dateStr && timeStr)
      ? new Date(`${dateStr}T${timeStr}Z`)
      : new Date();

    // Convert numeric columns.
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;

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
    playersData[playerId].times.push(combinedDateTime);
    playersData[playerId].lats.push(lat);
    playersData[playerId].lons.push(lon);
    playersData[playerId].speeds.push(speed);
    playersData[playerId].heartRates.push(hr);
    playersData[playerId].accelerations.push(accel);
  }

  // 5) Prepare documents for insertion (one doc per unique player).
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

  // 6) Generate metrics and update session.sessionPlayerData.
  console.log("📊 [parseCSV] Generating metrics and updating session...");
  session.sessionPlayerData = [];
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allPlayerDocs) {
    const speeds = doc.speeds.length ? doc.speeds : [0];
    const distance = speeds.reduce((acc, val) => acc + val, 0) / 10 / 1000;
    const topSpeed = Math.max(...speeds);
    const highSpeedRunning = speeds.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10 / 1000;
    const sprinting = speeds.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10 / 1000;

    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: distance, Unit: 'km' },
      { MetricName: 'TopSpeed', Value: topSpeed, Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: highSpeedRunning, Unit: 'km' },
      { MetricName: 'Sprinting', Value: sprinting, Unit: 'km' },
    ];

    const splitPlayerMetrics = [];
    for (let i = 0; i < session.splits.length; i++) {
      // For demonstration, we simply duplicate the same metrics for each split.
      splitPlayerMetrics.push({
        SplitNumber: i + 1,
        SplitMetrics: [
          { MetricName: 'Distance', Value: distance, Unit: 'km' },
          { MetricName: 'TopSpeed', Value: topSpeed, Unit: 'm/s' },
          { MetricName: 'HighSpeedRunning', Value: highSpeedRunning, Unit: 'km' },
          { MetricName: 'Sprinting', Value: sprinting, Unit: 'km' },
        ],
      });
    }

    session.sessionPlayerData.push({
      csvId: doc._id,
      playerName: doc.playerId,
      sessionPlayerMetrics,
      splitPlayerMetrics,
    });
  }
  await session.save();
  console.log("✅ [parseCSV] Session updated with CSV metrics.");

  // 7) Create any missing players (once)
  console.log("🛠️ [parseCSV] Creating any missing players...");
  await createPlayersFromCSV(sessionId, userId);
  console.log("✅ [parseCSV] createPlayersFromCSV done.");

  // 8) Recalculate average distance for the session
  console.log("🔄 [parseCSV] Recalculating average distance...");
  await calculateAverageDistance(sessionId);
  console.log("✅ [parseCSV] Average distance updated.");

  // 9) Re-fetch and return the updated session (populated with sessionPlayerData)
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  console.log("🚀 [parseCSV] Done. Returning updated session.");
  return updatedSession;
};

export default parseCSV;
