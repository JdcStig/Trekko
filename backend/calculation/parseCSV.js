// parseCSV.js
import { Readable } from 'stream';
import csvParser from 'csv-parser';
import mongoose from 'mongoose';

import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import Player from '../models/playerModel.js';

import createPlayersFromCSV from './createPlayersFromCSV.js';
import updateSessionCount from './updateSessionCount.js'; // <-- NEW import

/**
 * Single-pass CSV parser that:
 *  1) Groups rows by player.
 *  2) Inserts one SessionPlayerData document per player.
 *  3) Computes per-player metrics.
 *  4) Updates the Session with session-level data.
 *  5) Creates missing players.
 *  6) (NEW) Calls updateSessionCount(userId).
 *  7) Returns the updated Session.
 *
 * @param {Buffer} fileBuffer - The CSV file buffer.
 * @param {String} sessionId   - The ID of the session.
 * @param {String} userId      - The ID of the user.
 * @returns {Promise<Session>} - The updated session.
 */
const parseCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`📌 [parseCSV] Start for session=${sessionId} | user=${userId}`);

  // 0) Basic checks
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Uploaded file is empty.');
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error('Invalid session ID.');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID.');
  }

  // 1) Convert buffer to string and detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`🔍 [parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV into an array of row objects
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
    throw new Error('CSV is empty or could not be parsed.');
  }

  // 3) Fetch the session from the DB
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 4) Build in-memory data for each player
  const playersData = {}; // key: playerId
  for (const row of rows) {
    const playerId = row['Player Display Name'] || 'Unknown Player';

    // Parse date/time if present
    const dateStr = row['UTC Date'];
    const timeStr = row['UTC Time'];
    const combinedDateTime =
      dateStr && timeStr
        ? new Date(`${dateStr}T${timeStr}Z`)
        : new Date();

    // Parse numeric columns
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;

    // Prepare structure
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
    // Accumulate
    playersData[playerId].times.push(combinedDateTime);
    playersData[playerId].lats.push(lat);
    playersData[playerId].lons.push(lon);
    playersData[playerId].speeds.push(speed);
    playersData[playerId].heartRates.push(hr);
    playersData[playerId].accelerations.push(accel);
  }

  // 5) Insert one SessionPlayerData doc per unique player
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
  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`✅ [parseCSV] Inserted ${insertedDocs.length} SessionPlayerData documents.`);

  // 6) Generate metrics and attach them to session.sessionPlayerData
  session.sessionPlayerData = [];
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allPlayerDocs) {
    // Example metric calculations
    const speeds = doc.speeds || [];
    const distance = speeds.reduce((acc, val) => acc + val, 0) / 10 / 1000;
    const topSpeed = Math.max(...speeds, 0);
    const highSpeedRunning = speeds.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10 / 1000;
    const sprinting = speeds.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10 / 1000;

    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: distance, Unit: 'km' },
      { MetricName: 'TopSpeed', Value: topSpeed, Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: highSpeedRunning, Unit: 'km' },
      { MetricName: 'Sprinting', Value: sprinting, Unit: 'km' },
    ];

    // For each split in session, replicate or refine metrics
    const splitPlayerMetrics = [];
    (session.splits || []).forEach((split, index) => {
      // Example: ignoring actual time-based slicing and just reusing full metrics
      splitPlayerMetrics.push({
        SplitNumber: index + 1,
        SplitMetrics: [
          { MetricName: 'Distance', Value: distance, Unit: 'km' },
          { MetricName: 'TopSpeed', Value: topSpeed, Unit: 'm/s' },
          { MetricName: 'HighSpeedRunning', Value: highSpeedRunning, Unit: 'km' },
          { MetricName: 'Sprinting', Value: sprinting, Unit: 'km' },
        ],
      });
    });

    session.sessionPlayerData.push({
      csvId: doc._id,
      playerName: doc.playerId,
      sessionPlayerMetrics,
      splitPlayerMetrics,
    });
  }

  // Save the updated session (but do NOT set session.number here)
  await session.save();
  console.log('✅ [parseCSV] Session updated with CSV metrics.');

  // 7) Create any missing players
  console.log('🛠️ [parseCSV] Creating any missing players...');
  await createPlayersFromCSV(sessionId, userId);
  console.log('✅ [parseCSV] createPlayersFromCSV done.');

  // 8) Use the helper function to update session.number for *all* sessions
  console.log('🔄 [parseCSV] Updating session.count for all sessions of this user...');
  await updateSessionCount(userId);
  console.log('✅ [parseCSV] session.number fields updated.');

  // 9) Re-fetch & return the updated session (so we see the new 'number')
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  console.log('🚀 [parseCSV] Done. Returning updated session.');
  return updatedSession;
};

export default parseCSV;
