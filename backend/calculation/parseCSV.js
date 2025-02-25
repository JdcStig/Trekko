// import fs from 'fs';
// import csvParser from 'csv-parser';
// import SessionPlayerData from '../models/sessionPlayerDataModel.js';
// import Session from '../models/sessionModel.js';
// import createPlayersFromCSV from './createPlayersFromCSV.js';
// import { Readable } from 'stream';
// import mongoose from 'mongoose';
// import calculateAverageDistance from '../calculation/calculateAverageDistance.js';


// // Calculates the distance, topspeed, highspeedRunning and Sprinting
// const metricsCalculations = {
//     Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
//     TopSpeed: (values) => Math.max(...values), // max speed (top speed)
//     HighSpeedRunning: (values) => (values.filter(v => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
//     Sprinting: (values) => (values.filter(v => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000 // in km
//   };


//   const parseCSV = async (fileBuffer, sessionId, userId) => {
//     console.log(`📌 Starting CSV parsing for session ${sessionId} | User: ${userId}`);
//     const startTime = Date.now();

//     try {
//         if (!fileBuffer || fileBuffer.length === 0) {
//             console.error("🚨 File buffer is empty!");
//             throw new Error("Uploaded file is empty.");
//         }
//         console.log(`✅ File buffer received: ${fileBuffer.length} bytes`);

//         if (!mongoose.Types.ObjectId.isValid(sessionId)) {
//             console.error("🚨 Invalid sessionId:", sessionId);
//             throw new Error("Invalid session ID.");
//         }

//         if (!mongoose.Types.ObjectId.isValid(userId)) {
//             console.error("🚨 Invalid userId:", userId);
//             throw new Error("Invalid user ID.");
//         }

//         console.log("🔍 Detecting delimiter...");
//         const delimiterStart = Date.now();
//         const fileString = fileBuffer.toString('utf-8');
//         let delimiter = ',';
//         if (fileString.includes('\t')) delimiter = '\t';
//         else if (fileString.includes(';')) delimiter = ';';
//         else if (fileString.includes('  ')) delimiter = ' ';
//         console.log(`✅ Delimiter detected: "${delimiter}" in ${Date.now() - delimiterStart}ms`);

//         console.log("🔄 Parsing CSV...");
//         const parseStart = Date.now();
//         const stream = Readable.from(fileString);
//         const results = [];
//         await new Promise((resolve, reject) => {
//             stream.pipe(csvParser({ separator: delimiter, trim: true }))
//                 .on('data', (row) => results.push(row))
//                 .on('end', resolve)
//                 .on('error', reject);
//         });
//         console.log(`✅ CSV parsed in ${Date.now() - parseStart}ms | Rows: ${results.length}`);

//         if (!results.length) throw new Error("CSV file is empty or not parsed correctly.");

//         console.log("🔄 Fetching session...");
//         const sessionStart = Date.now();
//         const session = await Session.findById(sessionId);
//         console.log(`✅ Session fetched in ${Date.now() - sessionStart}ms`);

//         if (!session) {
//             throw new Error(`Session not found: ${sessionId}`);
//         }

//         console.log("📊 Processing player data...");
//         const metricsStart = Date.now();
//         const playersData = {};

//         // Process CSV rows efficiently, avoiding duplicates
//         results.forEach(row => {
//             const playerId = row['Player Display Name'] || "Unknown Player";
//             const speed = parseFloat(row['Speed (m/s)']) || 0;

//             if (!playersData[playerId]) {
//                 playersData[playerId] = {
//                     sessionId, 
//                     userId,
//                     playerId,
//                     speeds: [],
//                 };
//             }
//             playersData[playerId].speeds.push(speed);
//         });

//         console.log(`✅ Processed ${Object.keys(playersData).length} unique players in ${Date.now() - metricsStart}ms`);

//         console.log("📊 Calculating metrics...");
//         const metricCalcStart = Date.now();

//         // Generate metrics efficiently
//         const metrics = Object.values(playersData).map(player => ({
//             sessionId,
//             userId,
//             playerId: player.playerId,
//             speeds: player.speeds,
//             Distance: metricsCalculations.Distance(player.speeds),
//             TopSpeed: metricsCalculations.TopSpeed(player.speeds),
//             HighSpeedRunning: metricsCalculations.HighSpeedRunning(player.speeds),
//             Sprinting: metricsCalculations.Sprinting(player.speeds)
//         }));

//         console.log(`✅ Metrics calculated in ${Date.now() - metricCalcStart}ms`);

//         console.log("🔎 Logging first player data for verification...");
//         console.log(metrics[0]); // Only log the first for readability

//         console.log("💾 Saving all player data (batch insert)...");
//         const saveStart = Date.now();
//         await SessionPlayerData.insertMany(metrics, { ordered: false });
//         console.log(`✅ Player data saved in ${Date.now() - saveStart}ms`);

//         console.log("🔄 Updating session data...");
//         const sessionUpdateStart = Date.now();
//         await Session.findByIdAndUpdate(
//             sessionId,
//             { $inc: { number: Object.keys(playersData).length } },
//             { new: true }
//         );
//         console.log(`✅ Session updated in ${Date.now() - sessionUpdateStart}ms`);

//         console.log("🔄 Recalculating average distance...");
//         const avgDistStart = Date.now();
//         await calculateAverageDistance(sessionId);
//         console.log(`✅ Average distance recalculated in ${Date.now() - avgDistStart}ms`);

//         console.log(`🚀 CSV processing completed in ${Date.now() - startTime}ms`);
//     } catch (error) {
//         console.error("🚨 CSV processing error:", error.message);
//         throw error;
//     }
// };


// export default parseCSV;
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import mongoose from 'mongoose';

import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import Player from '../models/playerModel.js';

import createPlayersFromCSV from './createPlayersFromCSV.js';
import calculateAverageDistance from './calculateAverageDistance.js';

/**
 * Single-pass CSV parser that:
 *  1) Groups rows by player
 *  2) Inserts one SessionPlayerData doc per player
 *  3) Computes per-player metrics
 *  4) Updates the Session with session-level data
 *  5) Creates missing players
 *  6) Recalculates average distance
 *  7) Returns the updated Session
 *
 * @param {Buffer} fileBuffer - The CSV file buffer
 * @param {String} sessionId   - The ID of the session
 * @param {String} userId      - The ID of the user
 * @returns {Promise<Session>} - The updated session
 */
const parseCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`📌 [parseCSV] Start for session=${sessionId} | user=${userId}`);

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }

  // Validate IDs
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // 1) Convert buffer to string, detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';

  console.log(`🔍 [parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV into an array of row objects
  const rows = [];
  const readable = Readable.from(fileString);
  await new Promise((resolve, reject) => {
    readable
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`✅ [parseCSV] CSV parsed. Total rows: ${rows.length}`);

  if (!rows.length) {
    throw new Error("CSV is empty or could not be parsed.");
  }

  // 3) Fetch session from DB
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 4) Build in-memory data for each player
  //    We assume columns: 
  //      "Player Display Name", "Latitude", "Longitude", "Speed (m/s)",
  //      "Heart Rate", "Acceleration (m/s^2)", "UTC Date", "UTC Time", etc.
  //
  //    Adjust the names below to match your actual CSV columns.
  console.log("🔄 [parseCSV] Building in-memory data for each player...");
  const playersData = {};

  for (const row of rows) {
    const playerId = row['Player Display Name'] || 'Unknown Player';

    // Build a single UTC datetime from your date/time columns if needed:
    // Example: "UTC Date" = 2025-01-26, "UTC Time" = 10:15:30
    // Adjust if your CSV has a single combined datetime, etc.
    const dateStr = row['UTC Date'];
    const timeStr = row['UTC Time'];
    let combinedDateTime;
    if (dateStr && timeStr) {
      combinedDateTime = new Date(`${dateStr}T${timeStr}Z`);
    } else {
      // fallback if missing
      combinedDateTime = new Date();
    }

    // Convert numeric columns
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;

    // Initialize data object for this player if not existing
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

    // Push the values
    playersData[playerId].times.push(combinedDateTime);
    playersData[playerId].lats.push(lat);
    playersData[playerId].lons.push(lon);
    playersData[playerId].speeds.push(speed);
    playersData[playerId].heartRates.push(hr);
    playersData[playerId].accelerations.push(accel);
  }

  // 5) Prepare docs for insertion (one doc per player)
  console.log("💾 [parseCSV] Inserting SessionPlayerData documents...");
  const insertArray = [];

  for (const [playerId, pdata] of Object.entries(playersData)) {
    // For each player, define startTime as earliest time, endTime as latest
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
  } else {
    const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
    console.log(`✅ [parseCSV] Inserted ${insertedDocs.length} SessionPlayerData documents.`);
  }

  // 6) [Optional] If you want to do session-level metrics or per-player metrics now,
  //    do them here in one pass. For example:
  console.log("📊 [parseCSV] Generating metrics and updating session...");

  // Clear out any existing sessionPlayerData array in the session doc if you prefer:
  session.sessionPlayerData = [];

  // Re-fetch newly inserted docs so we can compute metrics in-memory
  // (Alternatively, we could compute them in the loop above before insertion.)
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });

  // Example metric calculations. Adjust to your needs.
  for (const doc of allPlayerDocs) {
    // Basic sums
    const distance = doc.speeds.reduce((acc, val) => acc + val, 0) / 10 / 1000; // same formula as before
    const topSpeed = Math.max(...doc.speeds);
    const highSpeedRunning = doc.speeds.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10 / 1000;
    const sprinting = doc.speeds.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10 / 1000;

    // Build an array of "sessionPlayerMetrics"
    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: distance, Unit: 'km' },
      { MetricName: 'TopSpeed', Value: topSpeed, Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: highSpeedRunning, Unit: 'km' },
      { MetricName: 'Sprinting', Value: sprinting, Unit: 'km' },
    ];

    // Optionally handle splits from session.splits, if you want per-split metrics
    const splitPlayerMetrics = [];
    for (let i = 0; i < session.splits.length; i++) {
      const split = session.splits[i];
      // Convert each split's start/end to Date, or filter times array, etc.
      // For demonstration, we'll just do the same calculations on the entire speeds array:
      const splittedDistance = distance; // or filter doc.speeds by time
      const splittedTopSpeed = topSpeed;
      const splittedHSR = highSpeedRunning;
      const splittedSprinting = sprinting;
      splitPlayerMetrics.push({
        SplitNumber: i + 1,
        SplitMetrics: [
          { MetricName: 'Distance', Value: splittedDistance, Unit: 'km' },
          { MetricName: 'TopSpeed', Value: splittedTopSpeed, Unit: 'm/s' },
          { MetricName: 'HighSpeedRunning', Value: splittedHSR, Unit: 'km' },
          { MetricName: 'Sprinting', Value: splittedSprinting, Unit: 'km' },
        ],
      });
    }

    // Now push an object to session.sessionPlayerData
    session.sessionPlayerData.push({
      csvId: doc._id,        // reference to the SessionPlayerData doc
      playerName: doc.playerId,
      sessionPlayerMetrics,
      splitPlayerMetrics,
    });
  }

  // Save session with updated sessionPlayerData
  await session.save();
  console.log("✅ [parseCSV] Session updated with CSV metrics.");

  // 7) Create any missing players (once)
  console.log("🛠️ [parseCSV] Creating any missing players...");
  await createPlayersFromCSV(sessionId, userId); // Make sure it only does it once
  console.log("✅ [parseCSV] createPlayersFromCSV done.");

  // 8) Recalculate average distance for the session
  console.log("🔄 [parseCSV] Recalculating average distance...");
  await calculateAverageDistance(sessionId);
  console.log("✅ [parseCSV] Average distance updated.");

  // 9) Re-fetch or return the updated session
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  console.log("🚀 [parseCSV] Done. Returning updated session.");

  return updatedSession;
};

export default parseCSV;
