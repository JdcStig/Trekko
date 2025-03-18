// file: controllers/sessionController.js

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
// This version of calculatePlayPlayerMetrics no longer uses *900, 
// and DOES store snippet-based top speed in each player's per-play metrics.
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';
import { parsePlayByPlayCSV } from './playByPlayAnalysisController.js'; // if needed

// Basic distance-based metrics
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
  TopSpeed: (values) => Math.max(...values),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v >= 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

/**
 * ===========================
 * parseCSV (Players CSV)
 * ===========================
 */
export const parseCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`\n[parseCSV] sessionId=${sessionId}, userId=${userId}`);

  // 0) Validate
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Uploaded file is empty.');
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error('Invalid session ID.');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID.');
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
    throw new Error('CSV is empty or could not be parsed.');
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

  // 5) Insert SessionPlayerData docs
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

  console.log(`[parseCSV] Ready to insert ${insertArray.length} SessionPlayerData docs.`);
  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`[parseCSV] Inserted ${insertedDocs.length} docs.`);

  // 6) Create any missing Player docs
  await createPlayersFromCSV(sessionId, userId);

  // 7) Link each doc with the real Player doc
  for (const doc of insertedDocs) {
    const csvName = doc.playerName;
    const playerDoc = await Player.findOne({ userId, playerId: csvName });
    if (playerDoc) {
      doc.playerId = playerDoc._id;
      doc.playerName = playerDoc.name;
      await doc.save();
    }
  }

  // 8) Rebuild session.sessionPlayerData with snippet-based per-play metrics
  session.sessionPlayerData = [];
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });

  for (const doc of allPlayerDocs) {
    const times = doc.times || [];
    const speeds = doc.speeds || [];

    // Overall doc metrics
    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];

    // Snippet-based per-play
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

  // 9) Save the session
  await session.save();

  // 10) Recalculate overall session.avgDistance
  await calculateAverageDistance(sessionId);

  // 11) Now that snippet-based top speeds are stored, let's update each play's 
  //     sprint count based on snippet top speeds:
  aggregateSprintMetrics(session);
  await session.save();

  // 12) Return updated session
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  return updatedSession;
};

/**
 * ===========================
 * uploadSessionCSV
 * ===========================
 */
export const uploadSessionCSV = asyncHandler(async (req, res) => {
  const { sessionId, type } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required.' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  try {
    let updatedData;
    if (type === 'session') {
      updatedData = await parseCSV(req.file.buffer, sessionId, req.user._id);
    } else {
      // or parsePlayByPlayCSV if needed
      return res.status(400).json({ message: 'Invalid CSV type.' });
    }
    return res.status(201).json(updatedData);
  } catch (error) {
    console.error('[uploadSessionCSV] ERROR:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * ===========================
 * uploadPlayCSV
 * ===========================
 */
export const uploadPlayCSV = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required.' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({ message: 'Invalid session ID.' });
  }
  try {
    const updatedSession = await parsePlayByPlayCSV(req.file.buffer, sessionId, req.user._id);
    return res.status(201).json(updatedSession);
  } catch (error) {
    console.error('[uploadPlayCSV] ERROR:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

/**
 * ===========================
 * registerSession
 * ===========================
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
    throw new Error('Invalid date format.');
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
    const parseTimeString = (timeStr) => {
      const parts = timeStr.split(':').map(Number);
      const hours = parts[0] || 0;
      const minutes = parts[1] || 0;
      const seconds = parts[2] || 0;
      return ((hours * 3600) + (minutes * 60) + seconds) * 1000;
    };

    processedSplits = splits.map((split, i) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const startOffset = typeof split.start === 'number'
        ? split.start
        : parseTimeString(split.start);
      const endOffset = typeof split.end === 'number'
        ? split.end
        : parseTimeString(split.end);

      const finalStartMs = parsedDate + startOffset;
      const finalEndMs = parsedDate + endOffset;

      return {
        title: split.title,
        splitNumber: i + 1,
        start: finalStartMs,
        end: finalEndMs,
      };
    });
  }

  const session = await Session.create({
    userId,
    teamName,
    sessionName,
    date: parsedDate,
    type,
    duration,
    splits: processedSplits,
    notes,
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
 * ===========================
 * getSessions
 * ===========================
 */
export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id });
  return res.status(200).json(sessions);
});

/**
 * ===========================
 * getSessionByID
 * ===========================
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
 * ===========================
 * deleteSession
 * ===========================
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
 * ===========================
 * updateSession
 * ===========================
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
    session.splits = splits.map((split, index) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const newStart = Number(split.start) || 0;
      const newEnd   = Number(split.end)   || 0;
      return {
        title: split.title,
        splitNumber: index + 1,
        start: newStart,
        end: newEnd,
      };
    });
  }

  // Save the updated session
  await session.save();

  // If you want to re-run snippet-based metrics for each player after updating,
  // you can do so here (similar to parseCSV). Then re-run `aggregateSprintMetrics`.

  res.status(200).json(session);
});

/**
 * ===========================
 * deleteAllSessionCSVs
 * ===========================
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

/**
 * ===========================
 * deleteAllPlayCSVs
 * ===========================
 */
export const deleteAllPlayCSVs = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  if (!sessionId) {
    res.status(400);
    throw new Error('Session ID is required.');
  }

  const session = await Session.findById(sessionId);
  if (!session) {
    res.status(404);
    throw new Error('Session not found.');
  }

  session.plays = [];
  if (session.sessionPlayerData && session.sessionPlayerData.length > 0) {
    session.sessionPlayerData.forEach(doc => {
      doc.playPlayerMetrics = [];
    });
    session.markModified('sessionPlayerData');
  }

  session.avgDistance = 0;
  await session.save();
  res.status(200).json({ message: 'All play CSV data deleted', session });
});

/**
 * ===========================
 * aggregateSprintMetrics
 * ===========================
 * For each play in session.plays, sets play.numSprint to the number of players 
 * whose snippet top speed >= 7 m/s for that play.
 */
function aggregateSprintMetrics(session) {
  console.log('[aggregateSprintMetrics] START');
  if (!session || !session.plays || !session.sessionPlayerData) {
    console.log('[aggregateSprintMetrics] Missing session data');
    return;
  }

  session.plays.forEach((play, playIndex) => {
    console.log(`\n[aggregateSprintMetrics] Checking play #${play.playNumber} (index=${playIndex})`);
    let sprintCount = 0;

    session.sessionPlayerData.forEach((playerData, pdIndex) => {
      if (!playerData.playPlayerMetrics) return;

      const pm = playerData.playPlayerMetrics.find(
        (p) => p.PlayNumber === play.playNumber
      );
      if (!pm) return;

      // The snippet-based top speed is stored in pm.PlayMetrics
      const topSpeedMetric = pm.PlayMetrics.find(
        (m) => m.MetricName === 'TopSpeed'
      );
      if (topSpeedMetric && topSpeedMetric.Value >= 7) {
        sprintCount++;
        console.log(
          `[aggregateSprintMetrics] Player "${playerData.playerName}" snippet TopSpeed=${topSpeedMetric.Value} => sprintCount=${sprintCount}`
        );
      }
    });

    // Store the final sprint count on the play
    play.numSprint = sprintCount;
    console.log(`[aggregateSprintMetrics] Final for Play #${play.playNumber}: numSprint=${sprintCount}`);
  });

  console.log('[aggregateSprintMetrics] DONE');
}
