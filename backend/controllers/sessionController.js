import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Team from '../models/teamModel.js';
import { parsePlayByPlayCSV } from "../controllers/playByPlayAnalysisController.js";

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js'; 
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js'; 

// ====================== Metrics Calculation Helpers ======================
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000, // sum in km
  TopSpeed: (values) => Math.max(...values), // max speed (m/s)
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000, // in km
};

// ====================== parseCSV ======================
// This function does a single-pass parsing of the CSV file:
//  1) Groups rows by player (using the column "Player Display Name").
//  2) Uses the "Speed (m/s)" column (and optionally others if available)
//     to build an object per player.
//  3) Inserts one SessionPlayerData document per unique player,
//     calculates per‑player metrics, attaches them to the Session document,
//     creates any missing players, and recalculates average distance.
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

  // 1) Convert buffer to string & detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`🔍 [parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV rows into an array of objects
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

  // 3) Fetch the session from DB
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 4) Build in-memory data for each player.
  // We use "Player Display Name" and "Speed (m/s)" (and optionally Latitude, Longitude, Heart Rate, Acceleration)
  console.log("🔄 [parseCSV] Building in-memory data for each player...");
  const playersData = {}; // key: playerId
  const sessionDate = new Date(session.date);
  rows.forEach((row) => {
    const playerId = row['Player Display Name'] || 'Unknown Player';
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;
    const timeStr = row['Time'];
    const timeParts = timeStr.split(':').map(parseFloat);
    const combinedDateTime = new Date();
    combinedDateTime.setUTCHours(timeParts[0], timeParts[1], timeParts[2] || 0, 0);
    const unixTimestamp = Math.floor(combinedDateTime.getTime() / 1000);

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
    playersData[playerId].times.push(unixTimestamp);
    playersData[playerId].lats.push(lat);
    playersData[playerId].lons.push(lon);
    playersData[playerId].speeds.push(speed);
    playersData[playerId].heartRates.push(hr);
    playersData[playerId].accelerations.push(accel);
  });

  // 5) Prepare documents for insertion (one per unique player)
  console.log("💾 [parseCSV] Preparing SessionPlayerData documents for insertion...");
  const insertArray = [];
  for (const [playerId, pdata] of Object.entries(playersData)) {
    const sortedTimes = pdata.times.sort((a, b) => a - b);
    const startTime = sortedTimes[0] ? Math.floor(sortedTimes[0] / 1000) : Math.floor(Date.now() / 1000);
    const endTime = sortedTimes[sortedTimes.length - 1] ? Math.floor(sortedTimes[sortedTimes.length - 1] / 1000) : Math.floor(Date.now() / 1000);
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

  // 6) Calculate metrics for each inserted document and update session.sessionPlayerData.
  console.log("📊 [parseCSV] Generating metrics and updating session...");
  session.sessionPlayerData = []; // Clear existing array.
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allPlayerDocs) {
    const speeds = doc.speeds.length ? doc.speeds : [0];
    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];

    // --- NEW: per-split metrics using the helper (with console logs) ---
    console.log(
      `\n[parseCSV] Calculating split metrics for playerId="${doc.playerId}"`
    );
    const splitPlayerMetrics = calculateSplitPlayerMetrics(
      speeds,
      session.splits || []
    );

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

  // 9) Fetch and return the updated session (populated with sessionPlayerData)
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');

  // Compute playPlayerMetrics
 // await calculatePlayPlayerMetrics(sessionId, updatedSession.plays);
  
  console.log("🚀 [parseCSV] Done. Returning updated session.");
  return updatedSession;
};

export default parseCSV;

// ====================== POST /api/sessions/upload ======================
// Route handler to upload and process a CSV file for a session.
export const uploadSessionCSV = asyncHandler(async (req, res) => {
  console.log("📌 Received CSV upload request for session:", req.body.sessionId);
  const { sessionId, type } = req.body; // Added 'type' to determine file type

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
      updatedData = await parseCSV(req.file.buffer, sessionId, req.user._id);
      console.log("🚀 Session CSV processing complete!");
    } else if (type === "playbyplay") {
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

// ====================== POST /api/sessions (Create Session) ======================
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

// ====================== GET /api/sessions (Get All Sessions) ======================
export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id });
  if (!sessions || sessions.length === 0) {
    res.status(404);
    throw new Error('No sessions found.');
  }
  res.status(200).json(sessions);
});

// ====================== GET /api/sessions/:id (Get Session by ID) ======================
export const getSessionByID = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (session) {
    res.status(200).json(session);
  } else {
    res.status(404);
    throw new Error('Session not found');
  }
});

// ====================== DELETE /api/sessions/:id (Delete Session) ======================
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

// ====================== PUT /api/sessions/:id (Update Session) ======================

export const updateSession = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;

  // 1) Find the session in the database
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  // 2) Update the basic fields if provided
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

  // 3) If the request includes a new splits array, update and recalc
  let convertedSplits = session.splits; // Default to existing splits
  if (splits && Array.isArray(splits)) {
    // Convert each split's start/end from HH:mm:ss or numeric to numeric seconds
    convertedSplits = splits.map((split, index) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const startSec = typeof split.start === 'number'
        ? split.start
        : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      const endSec = typeof split.end === 'number'
        ? split.end
        : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);

      return {
        title: split.title,
        splitNumber: index + 1,
        start: startSec,
        end: endSec,
      };
    });

    // Update the session's splits array
    session.splits = convertedSplits;
  }

  // 4) Save the session now so it has the latest splits in DB
  await session.save();

  // 5) If splits were updated, we need to recalc per-split metrics
  if (splits && Array.isArray(splits)) {
    // a) Re-fetch all player data for this session
    const allPlayerDocs = await SessionPlayerData.find({ sessionId: session._id });

    // b) Clear out the old sessionPlayerData
    session.sessionPlayerData = [];

    // c) For each player's doc, recalc both overall + per-split metrics
    for (const doc of allPlayerDocs) {
      const speeds = doc.speeds || [];

      // Overall metrics
      const sessionPlayerMetrics = [
        { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
        { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
        { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
        { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
      ];

      // Per-split/play metrics (distance, HSR, sprinting, topSpeed) for each split
      console.log(`\n[parseCSV] Calculating split metrics for playerId="${doc.playerId}"`);
      const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits);

      console.log(`\n[parseCSV] Calculating play metrics for playerId="${doc.playerId}"`);
      const playPlayerMetrics = calculatePlayPlayerMetrics(speeds, session.plays || []);

      session.sessionPlayerData.push({
        csvId: doc._id,
        playerName: doc.playerId,
        sessionPlayerMetrics,
        splitPlayerMetrics,
        playPlayerMetrics,
      });
    }

    // d) Save the session again with the updated metrics
    await session.save();
  }

  // 6) Return the final updated session
  res.status(200).json(session);
});



// ====================== DELETE /api/sessions/:id/csvs/all (Delete All CSV Data) ======================
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

