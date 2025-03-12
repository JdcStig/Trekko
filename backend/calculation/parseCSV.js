// import mongoose from 'mongoose';
// import csvParser from 'csv-parser';
// import { Readable } from 'stream';

// import Session from '../models/sessionModel.js';
// import SessionPlayerData from '../models/sessionPlayerDataModel.js';
// import Player from '../models/playerModel.js';
// import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
// import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
// import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';
// import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';

// // Basic distance-based metrics
// const metricsCalculations = {
//   Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
//   TopSpeed: (values) => Math.max(...values),
//   HighSpeedRunning: (values) =>
//     (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
//   Sprinting: (values) =>
//     (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
// };

// /**
//  * parseCSV:
//  *  1) Reads CSV from fileBuffer
//  *  2) Inserts data into SessionPlayerData (storing CSV name in "playerName")
//  *  3) Creates missing Player docs
//  *  4) Updates sessionPlayerData.playerId to reference real Player
//  *  5) Recomputes metrics & attaches them to session.sessionPlayerData
//  *  6) Recalculates average distance
//  *  7) Returns updated session
//  */
// export default async function parseCSV(fileBuffer, sessionId, userId) {
//   console.log(`\n📌 parseCSV: session=${sessionId}, user=${userId}`);

//   // 0) Validate input
//   if (!fileBuffer || fileBuffer.length === 0) {
//     throw new Error("Uploaded file is empty.");
//   }
//   if (!mongoose.Types.ObjectId.isValid(sessionId)) {
//     throw new Error("Invalid session ID.");
//   }
//   if (!mongoose.Types.ObjectId.isValid(userId)) {
//     throw new Error("Invalid user ID.");
//   }

//   // 1) Convert buffer to string & detect delimiter
//   const fileString = fileBuffer.toString('utf-8');
//   let delimiter = ',';
//   if (fileString.includes('\t')) delimiter = '\t';
//   else if (fileString.includes(';')) delimiter = ';';
//   else if (fileString.includes('  ')) delimiter = ' ';
//   console.log(`🔍 Detected delimiter: "${delimiter}"`);

//   // 2) Parse CSV rows
//   const rows = [];
//   await new Promise((resolve, reject) => {
//     Readable.from(fileString)
//       .pipe(csvParser({ separator: delimiter, trim: true }))
//       .on('data', (row) => rows.push(row))
//       .on('end', resolve)
//       .on('error', reject);
//   });
//   console.log(`✅ CSV parsed. Total rows: ${rows.length}`);
//   if (!rows.length) {
//     throw new Error("CSV is empty or could not be parsed.");
//   }

//   // 3) Fetch session & build an object for each distinct playerName
//   const session = await Session.findById(sessionId);
//   if (!session) {
//     throw new Error(`Session not found: ${sessionId}`);
//   }

//   const sessionDate = new Date(session.date);
//   const playersData = {}; // { [csvName]: {...} }

//   for (const row of rows) {
//     const csvName = row['Player Display Name'] || 'Unknown Player';
//     const speed = parseFloat(row['Speed (m/s)']) || 0;
//     const lat = parseFloat(row['Latitude']) || 0;
//     const lon = parseFloat(row['Longitude']) || 0;
//     const hr = parseFloat(row['Heart Rate']) || 0;
//     const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;

//     // Example: "Time" column is "HH:MM:SS"
//     const timeStr = row['Time'] || '00:00:00';
//     const [hh, mm, ss] = timeStr.split(':').map(Number);

//     // Combine session date + CSV time
//     const combinedDateTime = new Date(sessionDate);
//     combinedDateTime.setHours(hh, mm, ss || 0, 0);

//     // If storing times as milliseconds
//     const unixMs = combinedDateTime.getTime();

//     // If you prefer storing seconds:
//     // const unixSeconds = Math.floor(combinedDateTime.getTime() / 1000);

//     if (!playersData[csvName]) {
//       playersData[csvName] = {
//         userId,
//         sessionId,
//         playerName: csvName, // from CSV
//         times: [],
//         lats: [],
//         lons: [],
//         speeds: [],
//         heartRates: [],
//         accelerations: [],
//       };
//     }

//     playersData[csvName].times.push(unixMs);
//     playersData[csvName].lats.push(lat);
//     playersData[csvName].lons.push(lon);
//     playersData[csvName].speeds.push(speed);
//     playersData[csvName].heartRates.push(hr);
//     playersData[csvName].accelerations.push(accel);
//   }

//   // 4) Insert SessionPlayerData docs
//   console.log("💾 Preparing SessionPlayerData docs...");
//   const insertArray = [];

//   for (const [csvName, pdata] of Object.entries(playersData)) {
//     // Sort times ascending
//     pdata.times.sort((a, b) => a - b);

//     // If storing times as seconds, convert from ms -> seconds
//     // const startSec = Math.floor(pdata.times[0] / 1000);
//     // const endSec = Math.floor(pdata.times[pdata.times.length - 1] / 1000);

//     // If storing times as ms, just use them directly:
//     const startMs = pdata.times[0] || Date.now();
//     const endMs = pdata.times[pdata.times.length - 1] || Date.now();

//     insertArray.push({
//       userId,
//       sessionId,
//       playerName: csvName,
//       // store as numeric if your schema has Number
//       startTime: startMs,
//       endTime: endMs,
//       lats: pdata.lats,
//       lons: pdata.lons,
//       speeds: pdata.speeds,
//       heartRates: pdata.heartRates,
//       accelerationImpulses: pdata.accelerations,
//       playerId: null, // We'll set later
//     });
//   }

//   const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
//   console.log(`✅ Inserted ${insertedDocs.length} SessionPlayerData docs.`);

//   // 5) Create any missing Player docs (based on CSV names)
//   await createPlayersFromCSV(sessionId, userId);

//   // 6) Update each doc with the real Player ID
//   for (const doc of insertedDocs) {
//     const playerDoc = await Player.findOne({
//       userId,
//       playerId: doc.playerName, // We stored CSV name in "playerId" for the Player
//     });
//     if (playerDoc) {
//       doc.playerId = playerDoc._id;
//       await doc.save();
//     }
//   }

//   // 7) Recompute metrics & build session.sessionPlayerData
//   session.sessionPlayerData = []; // clear old

//   const allPlayerDocs = await SessionPlayerData.find({ sessionId });
//   for (const doc of allPlayerDocs) {
//     const speeds = doc.speeds || [];

//     // fetch real name from Player doc if we have a playerId
//     let realName = doc.playerName;
//     if (doc.playerId) {
//       const realPlayer = await Player.findById(doc.playerId);
//       if (realPlayer && realPlayer.name) {
//         realName = realPlayer.name;
//       }
//     }

//     // Overall metrics
//     const sessionPlayerMetrics = [
//       {
//         MetricName: 'Distance',
//         Value: metricsCalculations.Distance(speeds),
//         Unit: 'km',
//       },
//       {
//         MetricName: 'TopSpeed',
//         Value: metricsCalculations.TopSpeed(speeds),
//         Unit: 'm/s',
//       },
//       {
//         MetricName: 'HighSpeedRunning',
//         Value: metricsCalculations.HighSpeedRunning(speeds),
//         Unit: 'km',
//       },
//       {
//         MetricName: 'Sprinting',
//         Value: metricsCalculations.Sprinting(speeds),
//         Unit: 'km',
//       },
//     ];

//     // Per-split & per-play metrics
//     const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits || []);
//     const playPlayerMetrics = calculatePlayPlayerMetrics(speeds, session.plays || []);

//     session.sessionPlayerData.push({
//       csvId: doc._id,
//       playerId: doc.playerId,
//       playerName: realName,
//       sessionPlayerMetrics,
//       splitPlayerMetrics,
//       playPlayerMetrics,
//     });
//   }

//   await session.save();

//   // 8) Recalculate average distance
//   await calculateAverageDistance(sessionId);

//   // 9) Return updated session
//   const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
//   return updatedSession;
// }
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js';
import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';

// Basic distance-based metrics
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
  TopSpeed: (values) => Math.max(...values),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

/**
 * parseCSV:
 *  1) Reads CSV from fileBuffer
 *  2) Inserts data into SessionPlayerData (storing CSV name in "playerName")
 *  3) Creates missing Player docs
 *  4) Updates sessionPlayerData.playerId to reference real Player
 *  5) Recomputes metrics & attaches them to session.sessionPlayerData
 *  6) Recalculates average distance
 *  7) Returns updated session
 */
export default async function parseCSV(fileBuffer, sessionId, userId) {
  console.log(`\n📌 parseCSV: session=${sessionId}, user=${userId}`);

  // 0) Validate input
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
  console.log(`🔍 Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV rows
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`✅ CSV parsed. Total rows: ${rows.length}`);
  if (!rows.length) {
    throw new Error("CSV is empty or could not be parsed.");
  }

  // 3) Fetch session & build an object for each distinct playerName
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const sessionDate = new Date(session.date);
  const playersData = {}; // { [csvName]: {...} }

  for (const row of rows) {
    const csvName = row['Player Display Name'] || 'Unknown Player';
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;

    // Example: "Time" column is "HH:MM:SS"
    const timeStr = row['Time'] || '00:00:00';
    const [hh, mm, ss] = timeStr.split(':').map(Number);

    // Combine session date + CSV time
    const combinedDateTime = new Date(sessionDate);
    combinedDateTime.setHours(hh, mm, ss || 0, 0);

    // If storing times as milliseconds
    const unixMs = combinedDateTime.getTime();

    // If you prefer storing seconds:
    // const unixSeconds = Math.floor(combinedDateTime.getTime() / 1000);

    if (!playersData[csvName]) {
      playersData[csvName] = {
        userId,
        sessionId,
        playerName: csvName, // from CSV
        times: [],
        lats: [],
        lons: [],
        speeds: [],
        heartRates: [],
        accelerations: [],
      };
    }

    playersData[csvName].times.push(unixMs);
    playersData[csvName].lats.push(lat);
    playersData[csvName].lons.push(lon);
    playersData[csvName].speeds.push(speed);
    playersData[csvName].heartRates.push(hr);
    playersData[csvName].accelerations.push(accel);
  }

  // 4) Insert SessionPlayerData docs
  console.log("💾 Preparing SessionPlayerData docs...");
  const insertArray = [];

  for (const [csvName, pdata] of Object.entries(playersData)) {
    // Sort times ascending
    pdata.times.sort((a, b) => a - b);

    // If storing times as seconds, convert from ms -> seconds
    // const startSec = Math.floor(pdata.times[0] / 1000);
    // const endSec = Math.floor(pdata.times[pdata.times.length - 1] / 1000);

    // If storing times as ms, just use them directly:
    const startMs = pdata.times[0] || Date.now();
    const endMs = pdata.times[pdata.times.length - 1] || Date.now();

    insertArray.push({
      userId,
      sessionId,
      playerName: csvName,
      // store as numeric if your schema has Number
      startTime: startMs,
      endTime: endMs,
      lats: pdata.lats,
      lons: pdata.lons,
      speeds: pdata.speeds,
      heartRates: pdata.heartRates,
      accelerationImpulses: pdata.accelerations,
      playerId: null, // We'll set later
    });
  }

  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`✅ Inserted ${insertedDocs.length} SessionPlayerData docs.`);

  // 5) Create any missing Player docs (based on CSV names)
  await createPlayersFromCSV(sessionId, userId);

  // 6) Update each doc with the real Player ID
  for (const doc of insertedDocs) {
    const playerDoc = await Player.findOne({
      userId,
      playerId: doc.playerName, // We stored CSV name in "playerId" for the Player
    });
    if (playerDoc) {
      doc.playerId = playerDoc._id;
      await doc.save();
    }
  }

  // 7) Recompute metrics & build session.sessionPlayerData
  session.sessionPlayerData = []; // clear old

  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allPlayerDocs) {
    const speeds = doc.speeds || [];

    // fetch real name from Player doc if we have a playerId
    let realName = doc.playerName;
    if (doc.playerId) {
      const realPlayer = await Player.findById(doc.playerId);
      if (realPlayer && realPlayer.name) {
        realName = realPlayer.name;
      }
    }

    // Overall metrics
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

    // Per-split & per-play metrics
    const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits || []);
    const playPlayerMetrics = calculatePlayPlayerMetrics(speeds, session.plays || []);

    session.sessionPlayerData.push({
      csvId: doc._id,
      playerId: doc.playerId,
      playerName: realName,
      sessionPlayerMetrics,
      splitPlayerMetrics,
      playPlayerMetrics,
    });
  }

  await session.save();

  // 8) Recalculate average distance
  await calculateAverageDistance(sessionId);

  // 9) Return updated session
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  return updatedSession;
}
