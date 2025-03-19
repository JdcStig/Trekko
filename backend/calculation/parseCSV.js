import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';

/**
 * parseCSV
 * Reads a CSV file (buffer), parses player data and inserts SessionPlayerData documents,
 * creates missing Player docs, and links inserted docs with Player documents.
 *
 * Note: All heavy metric recalculation is removed from this function.
 *       Instead, the caller should trigger a full recalculation (e.g. via recalcSessionMetrics)
 *       after the final CSV is processed.
 *
 * @param {Buffer} fileBuffer - The CSV file buffer.
 * @param {String} sessionId - The session's ID.
 * @param {String} userId - The user's ID.
 * @returns {Object} An object with a message and the count of inserted docs.
 */
export default async function parseCSV(fileBuffer, sessionId, userId) {
  console.log(`\n[parseCSV] sessionId=${sessionId}, userId=${userId}`);

  // Validate inputs
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // Detect CSV delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`[parseCSV] Detected delimiter: "${delimiter}"`);

  // Parse CSV rows
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

  // Fetch the session document
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Build playersData object from CSV rows
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

  // Prepare SessionPlayerData docs for insertion
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

  // Create missing Player documents and link inserted docs
  await createPlayersFromCSV(sessionId, userId);
  for (const doc of insertedDocs) {
    const csvName = doc.playerName;
    const playerDoc = await Player.findOne({ userId, playerId: csvName });
    if (playerDoc) {
      doc.playerId = playerDoc._id;
      doc.playerName = playerDoc.name;
      await doc.save();
    }
  }

  // Do NOT perform any metric recalculation here.
  // The caller (via the finalize flag) will trigger a full recalc via recalcSessionMetrics.
  return { message: 'CSV parsed and data inserted successfully.', insertedCount: insertedDocs.length };
}
