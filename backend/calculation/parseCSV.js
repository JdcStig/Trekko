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

// Basic distance-based metrics (same as in sessionController)
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
  TopSpeed: (values) => Math.max(...values),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

/**
 * parseCSV
 * Reads a CSV file (buffer), parses player data, inserts SessionPlayerData documents,
 * creates missing Player docs, links them, and rebuilds session metrics.
 *
 * @param {Buffer} fileBuffer - The CSV file buffer.
 * @param {String} sessionId - The session's ID.
 * @param {String} userId - The user's ID.
 * @returns {Object} The updated session document.
 */
export default async function parseCSV(fileBuffer, sessionId, userId) {
  console.log(`\n[parseCSV] sessionId=${sessionId}, userId=${userId}`);

  // 0) Validate inputs
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // 1) Detect CSV delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`[parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV rows
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

  // 3) Fetch the session document
  let session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 4) Build playersData object from CSV rows
  const sessionDate = new Date(session.date);
  const playersData = {};

  for (const row of rows) {
    const csvName = row['Player Display Name'] || 'Unknown Player';
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;
    const timeStr = row['Time'] || '00:00:00';
    const [hh, mm, ss] = timeStr.split(':').map(Number);

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

  // 5) Prepare SessionPlayerData documents for insertion
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
      lats: pdata.lats,
      lons: pdata.lons,
      speeds: pdata.speeds,
      heartRates: pdata.heartRates,
      accelerationImpulses: pdata.accelerations,
      playerId: null,
    });
  }

  console.log(`[parseCSV] Inserting ${insertArray.length} SessionPlayerData docs.`);
  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`[parseCSV] Inserted ${insertedDocs.length} docs.`);

  // 6) Create missing Player documents
  await createPlayersFromCSV(sessionId, userId);

  // 7) Link inserted docs with actual Player docs
  for (const doc of insertedDocs) {
    const csvName = doc.playerName;
    const playerDoc = await Player.findOne({ userId, playerId: csvName });
    if (playerDoc) {
      doc.playerId = playerDoc._id;
      doc.playerName = playerDoc.name;
      await doc.save();
    }
  }

  // 8) Rebuild session.sessionPlayerData with calculated metrics
  session = await Session.findById(sessionId);
  session.sessionPlayerData = [];
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allPlayerDocs) {
    const times = doc.times || [];
    const speeds = doc.speeds || [];
    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];

    const playPlayerMetrics = calculatePlayPlayerMetrics(times, speeds, session.plays || []);
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

  // 9) Recalculate session.avgDistance
  await calculateAverageDistance(sessionId);

  // 10) Update each play's sprint count and average distance
  // (This uses the same aggregation function as in the session controller)
  const aggregateSprintMetrics = (sessionDoc) => {
    if (!sessionDoc || !sessionDoc.plays || !sessionDoc.sessionPlayerData) return;
    sessionDoc.plays.forEach((play) => {
      let sprintCount = 0;
      let totalDistance = 0;
      let distanceCount = 0;
      sessionDoc.sessionPlayerData.forEach((playerData) => {
        if (!playerData.playPlayerMetrics) return;
        const pm = playerData.playPlayerMetrics.find(p => p.PlayNumber === play.playNumber);
        if (!pm) return;
        const topSpeedMetric = pm.PlayMetrics.find(m => m.MetricName === 'TopSpeed');
        if (topSpeedMetric && topSpeedMetric.Value >= 7) {
          sprintCount++;
        }
        const distanceMetric = pm.PlayMetrics.find(m => m.MetricName === 'Distance');
        if (distanceMetric && typeof distanceMetric.Value === 'number') {
          totalDistance += distanceMetric.Value;
          distanceCount++;
        }
      });
      play.numSprint = sprintCount;
      play.avgDistance = distanceCount > 0 ? totalDistance / distanceCount : 0;
    });
  };

  aggregateSprintMetrics(session);
  await session.save();

  // 11) Return updated session (populated with sessionPlayerData)
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  return updatedSession;
}
