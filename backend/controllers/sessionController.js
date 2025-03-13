import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js';
import Team from '../models/teamModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';
import { parsePlayByPlayCSV } from './playByPlayAnalysisController.js'; // if needed

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
 *  1) Reads CSV from fileBuffer.
 *  2) Inserts data into SessionPlayerData with the CSV’s “Player Display Name” stored in playerName.
 *  3) Calls createPlayersFromCSV (which creates missing Player docs).
 *  4) Links each SessionPlayerData doc to the corresponding Player doc and forces playerName to the real name.
 *  5) Recomputes metrics and rebuilds session.sessionPlayerData.
 *  6) Recalculates average distance.
 *  7) Returns the updated session.
 */
const parseCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`\n📌 [parseCSV] Starting for sessionId=${sessionId}, userId=${userId}`);
  
  // Validate inputs
  if (!fileBuffer || fileBuffer.length === 0) {
    console.log("[parseCSV] Error: File buffer is empty.");
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    console.log("[parseCSV] Error: Invalid session ID.");
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log("[parseCSV] Error: Invalid user ID.");
    throw new Error("Invalid user ID.");
  }

  // Convert buffer to string and detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`[parseCSV] Detected delimiter: "${delimiter}"`);

  // Parse CSV into rows
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`[parseCSV] Completed CSV parsing. Total rows: ${rows.length}`);
  if (!rows.length) {
    console.log("[parseCSV] No rows found in CSV.");
    throw new Error("CSV is empty or could not be parsed.");
  }

  // Fetch the session document
  const session = await Session.findById(sessionId);
  if (!session) {
    console.log(`[parseCSV] Session not found: ${sessionId}`);
    throw new Error(`Session not found: ${sessionId}`);
  }
  const sessionDate = new Date(session.date);

  // Build an object keyed by CSV's player name
  const playersData = {};
  console.log("[parseCSV] Processing CSV rows to build playersData...");
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
    combinedDateTime.setHours(hh, mm, ss || 0, 0);
    const unixMs = combinedDateTime.getTime();

    if (!playersData[csvName]) {
      playersData[csvName] = {
        userId,
        sessionId,
        playerName: csvName, // exactly what the CSV contains
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
  console.log(`[parseCSV] Unique CSV player names: ${Object.keys(playersData)}`);

  // Insert SessionPlayerData documents
  const insertArray = [];
  for (const [csvName, pdata] of Object.entries(playersData)) {
    pdata.times.sort((a, b) => a - b);
    const startMs = pdata.times[0] || Date.now();
    const endMs = pdata.times[pdata.times.length - 1] || Date.now();

    insertArray.push({
      userId,
      sessionId,
      playerName: csvName, // keep the CSV name as-is
      startTime: startMs,
      endTime: endMs,
      lats: pdata.lats,
      lons: pdata.lons,
      speeds: pdata.speeds,
      heartRates: pdata.heartRates,
      accelerationImpulses: pdata.accelerations,
      playerId: null, // will update below
    });
  }
  console.log(`[parseCSV] Inserting ${insertArray.length} SessionPlayerData docs...`);
  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`[parseCSV] Inserted ${insertedDocs.length} docs into SessionPlayerData.`);

  // Create missing Player docs from CSV names
  console.log("[parseCSV] Calling createPlayersFromCSV...");
  await createPlayersFromCSV(sessionId, userId);
  console.log("[parseCSV] createPlayersFromCSV finished.");

  // Link each inserted SessionPlayerData doc with the corresponding Player doc
  console.log("[parseCSV] Linking SessionPlayerData docs with Player docs...");
  for (const doc of insertedDocs) {
    const csvName = doc.playerName;
    console.log(`   [parseCSV] Processing doc _id=${doc._id} (CSV name: "${csvName}")`);
    const playerDoc = await Player.findOne({ userId, playerId: csvName });
    if (playerDoc) {
      console.log(`   [parseCSV] Found Player: _id=${playerDoc._id}, name="${playerDoc.name}"`);
      doc.playerId = playerDoc._id;
      // Force the real Player name into the SessionPlayerData doc
      doc.playerName = playerDoc.name;
      await doc.save();
    } else {
      console.log(`   [parseCSV] No Player found for CSV name "${csvName}"`);
    }
  }

  // Rebuild session.sessionPlayerData from all SessionPlayerData docs
  console.log("[parseCSV] Rebuilding session.sessionPlayerData...");
  session.sessionPlayerData = [];
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  console.log(`[parseCSV] Found ${allPlayerDocs.length} SessionPlayerData docs in DB.`);
  for (const doc of allPlayerDocs) {
    const speeds = doc.speeds || [];
    let finalName = doc.playerName; // should be updated to the real Player name

    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];
    const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits || []);
    const playPlayerMetrics = calculatePlayPlayerMetrics(speeds, session.plays || []);

    session.sessionPlayerData.push({
      csvId: doc._id,
      playerId: doc.playerId,
      playerName: finalName,
      sessionPlayerMetrics,
      splitPlayerMetrics,
      playPlayerMetrics,
    });
  }
  await session.save();
  console.log(`[parseCSV] Rebuilt session.sessionPlayerData. Count=${session.sessionPlayerData.length}`);

  // Recalculate average distance
  console.log("[parseCSV] Recalculating average distance...");
  const avgDist = await calculateAverageDistance(sessionId);
  console.log(`[parseCSV] Average distance updated to ${avgDist} km`);

  // Return the updated session (with populated sessionPlayerData)
  console.log("[parseCSV] Returning updated session document.");
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  return updatedSession;
};

// ===================================================
// Controller endpoint for CSV upload
// ===================================================
export const uploadSessionCSV = asyncHandler(async (req, res) => {
  console.log(`\n📌 [uploadSessionCSV] Request received. sessionId=${req.body.sessionId}, type=${req.body.type}`);
  const { sessionId, type } = req.body;
  if (!sessionId) {
    console.log("[uploadSessionCSV] No session ID provided.");
    return res.status(400).json({ message: "Session ID is required." });
  }
  if (!req.file) {
    console.log("[uploadSessionCSV] No file uploaded.");
    return res.status(400).json({ message: "No file uploaded." });
  }
  console.log(`[uploadSessionCSV] Received file: ${req.file.originalname}, size=${req.file.size} bytes`);
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    console.log(`[uploadSessionCSV] Invalid session ID: ${sessionId}`);
    return res.status(400).json({ message: "Invalid session ID." });
  }
  try {
    let updatedData;
    if (type === "session") {
      console.log("[uploadSessionCSV] Handling type 'session'; calling parseCSV...");
      updatedData = await parseCSV(req.file.buffer, sessionId, req.user._id);
      console.log("[uploadSessionCSV] parseCSV completed.");
    } else if (type === "playbyplay") {
      console.log("[uploadSessionCSV] Handling type 'playbyplay'; calling parsePlayByPlayCSV...");
      updatedData = await parsePlayByPlayCSV(req.file.buffer, sessionId, req.user._id);
      console.log("[uploadSessionCSV] parsePlayByPlayCSV completed.");
    } else {
      console.log(`[uploadSessionCSV] Invalid CSV type: ${type}`);
      return res.status(400).json({ message: "Invalid CSV type." });
    }
    return res.status(201).json(updatedData);
  } catch (error) {
    console.error("[uploadSessionCSV] ERROR:", error.message);
    return res.status(500).json({ message: error.message });
  }
});
/**
 * POST /api/sessions
 * Create a new session
 */
export const registerSession = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
  const userId = req.user._id;

  let parsedDate;
  if (typeof date === 'string') {
    parsedDate = new Date(date).getTime();
  } else if (typeof date === 'number') {
    parsedDate = date;
  } else {
    res.status(400);
    throw new Error('Invalid date format. Please send a valid date.');
  }
  if (isNaN(parsedDate)) {
    res.status(400);
    throw new Error('Invalid date format. Could not parse date.');
  }

  const team = await Team.findOne({ name: teamName, userId });
  if (!team) {
    res.status(400);
    throw new Error('Team does not exist. Please create a team first.');
  }

  let processedSplits = [];
  if (splits && Array.isArray(splits)) {
    processedSplits = splits.map((split, i) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const startSec =
        typeof split.start === 'number'
          ? split.start
          : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      const endSec =
        typeof split.end === 'number'
          ? split.end
          : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
      return {
        title: split.title,
        splitNumber: i + 1,
        start: startSec,
        end: endSec,
      };
    });
  }

  const session = await Session.create({
    teamName,
    sessionName,
    date: parsedDate,
    type,
    duration,
    splits: processedSplits,
    notes,
    userId,
    number: 0,
  });
  if (session) {
    return res.status(200).json(session);
  } else {
    res.status(400);
    throw new Error('Invalid session data');
  }
});

/**
 * GET /api/sessions
 * Get all sessions for the logged-in user
 * Return an empty array with 200 if none found
 */
export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id });
  return res.status(200).json(sessions); // sessions will be [] if none
});

/**
 * GET /api/sessions/:id
 */
export const getSessionByID = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  res.status(200).json(session);
});

/**
 * DELETE /api/sessions/:id
 */
export const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  await SessionPlayerData.deleteMany({ sessionId: session._id });
  await Session.deleteOne({ _id: session._id });
  res.status(200).json({ message: 'Session deleted successfully' });
});

/**
 * PUT /api/sessions/:id
 */
export const updateSession = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;

  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  if (teamName) session.teamName = teamName;
  if (sessionName) session.sessionName = sessionName;
  if (date) {
    const parsedDate = new Date(date).getTime();
    if (!isNaN(parsedDate)) {
      session.date = parsedDate;
    }
  }
  if (type) session.type = type;
  if (duration) session.duration = Number(duration);
  if (notes) session.notes = notes;

  if (splits && Array.isArray(splits)) {
    const convertedSplits = splits.map((split, index) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const startSec =
        typeof split.start === 'number'
          ? split.start
          : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      const endSec =
        typeof split.end === 'number'
          ? split.end
          : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);

      return {
        title: split.title,
        splitNumber: index + 1,
        start: startSec,
        end: endSec,
      };
    });
    session.splits = convertedSplits;
  }

  await session.save();

  // Recompute metrics if splits changed
  if (splits && Array.isArray(splits)) {
    const allPlayerDocs = await SessionPlayerData.find({ sessionId: session._id });
    session.sessionPlayerData = [];

    for (const doc of allPlayerDocs) {
      const speeds = doc.speeds || [];

      // Fetch real name if available
      let realName = doc.playerName;
      const playerDoc = await Player.findOne({ userId: session.userId, playerId: doc.playerName });
      const realPlayerId = playerDoc ? playerDoc._id : null;
      if (playerDoc && playerDoc.name) {
        realName = playerDoc.name;
      }

      const sessionPlayerMetrics = [
        { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
        { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
        { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
        { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
      ];

      const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits);
      const playPlayerMetrics = calculatePlayPlayerMetrics(speeds, session.plays || []);

      session.sessionPlayerData.push({
        csvId: doc._id,
        playerId: realPlayerId,
        playerName: realName,
        sessionPlayerMetrics,
        splitPlayerMetrics,
        playPlayerMetrics,
      });
    }

    await session.save();
  }

  res.status(200).json(session);
});

/**
 * DELETE /api/sessions/:id/csvs/all
 */
export const deleteAllSessionCSVs = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  if (!sessionId) {
    res.status(400);
    throw new Error('Session ID is required.');
  }
  await SessionPlayerData.deleteMany({ sessionId });
  const session = await Session.findByIdAndUpdate(
    sessionId,
    { sessionPlayerData: [], number: 0, avgDistance: 0 },
    { new: true }
  );
  if (!session) {
    res.status(404);
    throw new Error('Session not found.');
  }
  res.status(200).json({ message: 'All CSV data deleted', session });
});