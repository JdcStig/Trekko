import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

// 1) IMPORT the real parsePlayByPlayCSV from your playByPlayAnalysisController
import { parsePlayByPlayCSV } from '../controllers/playByPlayAnalysisController.js';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Team from '../models/teamModel.js';
import Player from '../models/playerModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';

// ====================== METRICS CALCULATIONS ======================
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
  TopSpeed: (values) => Math.max(...values),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

// ====================== parseCSV FUNCTION (For "session") ======================
/**
 * parseCSV (for "session" type):
 *  1) Reads CSV from fileBuffer
 *  2) Inserts data into SessionPlayerData (storing CSV name in "playerName")
 *  3) Creates missing Player docs
 *  4) Finds the real Player._id and updates sessionPlayerData.playerId
 *  5) Recomputes metrics & attaches them to session.sessionPlayerData
 *  6) Recalculates average distance
 *  7) Returns updated session
 */
async function parseCSV(fileBuffer, sessionId, userId) {
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

  // 1) Convert buffer to string & detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`🔍 [parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV rows
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

  // 3) Fetch session & build in-memory data for each "playerName"
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

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

    // Combine the session date with the CSV time
    const combinedDateTime = new Date(sessionDate);
    combinedDateTime.setHours(hh, mm, ss || 0, 0);
    const unixTimestamp = combinedDateTime.getTime(); // in ms

    if (!playersData[csvName]) {
      playersData[csvName] = {
        userId,
        sessionId,
        playerName: csvName, // store CSV name initially
        times: [],
        lats: [],
        lons: [],
        speeds: [],
        heartRates: [],
        accelerations: [],
      };
    }
    playersData[csvName].times.push(unixTimestamp);
    playersData[csvName].lats.push(lat);
    playersData[csvName].lons.push(lon);
    playersData[csvName].speeds.push(speed);
    playersData[csvName].heartRates.push(hr);
    playersData[csvName].accelerations.push(accel);
  }

  // 4) Insert SessionPlayerData documents
  console.log("💾 [parseCSV] Preparing SessionPlayerData documents for insertion...");
  const insertArray = [];
  for (const [csvName, pdata] of Object.entries(playersData)) {
    pdata.times.sort((a, b) => a - b);

    const startTime = new Date(pdata.times[0] || Date.now());
    const endTime = new Date(pdata.times[pdata.times.length - 1] || Date.now());

    insertArray.push({
      userId,
      sessionId,
      playerName: csvName, // CSV "Player Display Name"
      startTime,
      endTime,
      lats: pdata.lats,
      lons: pdata.lons,
      speeds: pdata.speeds,
      heartRates: pdata.heartRates,
      accelerationImpulses: pdata.accelerations,
      playerId: null, // We'll fill this once we find the real Player doc
    });
  }

  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`✅ [parseCSV] Inserted ${insertedDocs.length} SessionPlayerData documents.`);

  // 5) Create any missing Player docs (based on CSV names)
  console.log("🛠️ [parseCSV] Creating any missing players...");
  await createPlayersFromCSV(sessionId, userId);
  console.log("✅ [parseCSV] createPlayersFromCSV done.");

  // 6) Now that Players exist, update each SessionPlayerData with the real playerId
  for (const doc of insertedDocs) {
    const playerDoc = await Player.findOne({
      userId,
      // We used "playerId" in the Player doc to store the CSV name in createPlayersFromCSV
      playerId: doc.playerName,
    });
    if (playerDoc) {
      doc.playerId = playerDoc._id;
      await doc.save();
    }
  }

  // 7) Recompute metrics & build session.sessionPlayerData
  console.log("📊 [parseCSV] Generating metrics & updating session...");
  session.sessionPlayerData = []; // Clear existing array

  // Re-fetch them (now they have playerId set)
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allPlayerDocs) {
    const speeds = doc.speeds || [];

    // Retrieve the real name from the Player doc if possible
    let realName = doc.playerName;
    if (doc.playerId) {
      const realPlayer = await Player.findById(doc.playerId);
      if (realPlayer && realPlayer.name) {
        realName = realPlayer.name; // <--- use real name from DB
      }
    }

    // Overall metrics
    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];

    // Per-split & per-play metrics
    const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits || []);
    const playPlayerMetrics = calculatePlayPlayerMetrics(speeds, session.plays || []);

    session.sessionPlayerData.push({
      csvId: doc._id,
      playerId: doc.playerId,
      // Use real name if found, else fallback
      playerName: realName,
      sessionPlayerMetrics,
      splitPlayerMetrics,
      playPlayerMetrics,
    });
  }

  await session.save();
  console.log("✅ [parseCSV] Session updated with CSV metrics.");

  // 8) Recalculate average distance
  console.log("🔄 [parseCSV] Recalculating average distance...");
  await calculateAverageDistance(sessionId);
  console.log("✅ [parseCSV] Average distance updated.");

  // 9) Return updated session
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  console.log("🚀 [parseCSV] Done. Returning updated session.");
  return updatedSession;
}

// ========== EXPORTS ==========

/**
 * POST /api/sessions/upload
 * Handles CSV file upload for either "session" or "playbyplay" type.
 */
export const uploadSessionCSV = asyncHandler(async (req, res) => {
  console.log("📌 Received CSV upload request for session:", req.body.sessionId);
  const { sessionId, type } = req.body;

  if (!sessionId) {
    console.error("🚨 No session ID provided!");
    return res.status(400).json({ message: "Session ID is required." });
  }
  if (!req.file) {
    console.error("🚨 No file uploaded!");
    return res.status(400).json({ message: "No file uploaded." });
  }
  console.log(`✅ File received: ${req.file.originalname} | Size: ${req.file.size} bytes`);

  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    console.error("🚨 Invalid sessionId:", sessionId);
    return res.status(400).json({ message: "Invalid session ID." });
  }

  try {
    let updatedData;
    if (type === "session") {
      // Use our parseCSV for standard session files
      updatedData = await parseCSV(req.file.buffer, sessionId, req.user._id);
      console.log("🚀 Session CSV processing complete!");
    } else if (type === "playbyplay") {
      // Use the real parsePlayByPlayCSV from playByPlayAnalysisController
      updatedData = await parsePlayByPlayCSV(req.file.buffer, sessionId, req.user._id);
      console.log("🚀 Play-by-Play CSV processing complete!");
    } else {
      return res.status(400).json({ message: "Invalid CSV type." });
    }

    return res.status(201).json(updatedData);
  } catch (error) {
    console.error("🚨 Error processing CSV:", error.message);
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