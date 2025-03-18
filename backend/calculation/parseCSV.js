// file: controllers/parseCSV.js
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js'; // snippet-based

const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
  TopSpeed: (values) => Math.max(...values),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

export default async function parseCSV(fileBuffer, sessionId, userId) {
  console.log(`\n[parseCSV] sessionId=${sessionId}, userId=${userId}`);

  // 0) Validate
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // 1) Detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`[parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`[parseCSV] CSV parse complete. Total rows: ${rows.length}`);
  if (!rows.length) {
    throw new Error("CSV is empty or could not be parsed.");
  }

  // 3) Fetch the session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 4) Build data for each distinct player
  const sessionDate = new Date(session.date);
  const playersData = {};

  for (const row of rows) {
    const csvName = row['Player Display Name'] || 'Unknown Player';
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;

    // Time is "HH:MM:SS" or similar
    const timeStr = row['Time'] || '00:00:00';
    const [hh, mm, ss] = timeStr.split(':').map(Number);

    // Combine with session date
    const combinedDateTime = new Date(sessionDate);
    combinedDateTime.setHours(hh || 0, mm || 0, ss || 0, 0);
    const unixMs = combinedDateTime.getTime();

    if (!playersData[csvName]) {
      playersData[csvName] = {
        userId,
        sessionId,
        playerName: csvName,
        times: [],
        speeds: [],
        lats: [],
        lons: [],
        heartRates: [],
        accelerations: [],
      };
    }

    playersData[csvName].times.push(unixMs);
    playersData[csvName].speeds.push(speed);
    playersData[csvName].lats.push(lat);
    playersData[csvName].lons.push(lon);
    playersData[csvName].heartRates.push(hr);
    playersData[csvName].accelerations.push(accel);
  }

  // 5) Insert SessionPlayerData
  const insertArray = [];
  for (const [csvName, pdata] of Object.entries(playersData)) {
    pdata.times.sort((a, b) => a - b);
    const startMs = pdata.times[0] || Date.now();
    const endMs = pdata.times[pdata.times.length - 1] || Date.now();

    insertArray.push({
      userId,
      sessionId,
      playerName: csvName,
      startTime: startMs,
      endTime: endMs,
      times: pdata.times,
      speeds: pdata.speeds,
      lats: pdata.lats,
      lons: pdata.lons,
      heartRates: pdata.heartRates,
      accelerationImpulses: pdata.accelerations,
      playerId: null,
    });
  }

  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`[parseCSV] Inserted ${insertedDocs.length} SessionPlayerData docs.`);

  // 6) Create missing players
  await createPlayersFromCSV(sessionId, userId);

  // 7) Link doc with real Player
  for (const doc of insertedDocs) {
    const playerDoc = await Player.findOne({
      userId,
      playerId: doc.playerName,
    });
    if (playerDoc) {
      doc.playerId = playerDoc._id;
      doc.playerName = playerDoc.name;
      await doc.save();
    }
  }

  // 8) Rebuild session.sessionPlayerData
  session.sessionPlayerData = [];
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });

  for (const doc of allPlayerDocs) {
    console.log(`\n[parseCSV] Building metrics for docId=${doc._id}, playerName=${doc.playerName}`);
    console.log('[parseCSV] times=', doc.times);

    const speeds = doc.speeds || [];
    const times = doc.times || [];

    // Overall doc metrics
    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];

    // Snippet-based per-play
    console.log(`[parseCSV] session.plays.length=${session.plays ? session.plays.length : 0}`);
    const playPlayerMetrics = calculatePlayPlayerMetrics(times, speeds, session.plays || []);
    console.log(`[parseCSV] playPlayerMetrics=`, playPlayerMetrics);

    // Splits (still index-based if you want)
    const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits || []);

    session.sessionPlayerData.push({
      csvId: doc._id,
      playerId: doc.playerId,
      playerName: doc.playerName,
      sessionPlayerMetrics,
      splitPlayerMetrics,
      playPlayerMetrics,
    });
  }

  await session.save();

  // 9) Recalc average distance
  await calculateAverageDistance(sessionId);

  // 10) Return updated session
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  return updatedSession;
}
