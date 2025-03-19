import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import moment from 'moment';

import PlayByPlayAnalysis from '../models/playByPlayAnalysisModel.js';
import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js'; // For patching real name

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';

// ====================== Overall Metrics Helper ======================
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
  TopSpeed: (values) => Math.max(...values, 0),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

// ====================== parsePlayByPlayCSV ======================
// 1) Parse CSV rows into new plays
// 2) Insert them into PlayByPlayAnalysis + session.plays
// 3) Create missing players from CSV
// 4) Patch SessionPlayerData docs so playerName is the real name
// 5) Calculate overall/per-play/per-split metrics
// 6) Update each play's avgDistance + numSprint
// 7) Recalculate session.avgDistance
// 8) Return updated session
export const parsePlayByPlayCSV = async (fileBuffer, sessionId, userId) => {
  // Validate inputs
  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Uploaded file is empty.');
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error('Invalid session ID.');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID.');
  }

  // Convert buffer to string & detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`[parsePlayByPlayCSV] Detected delimiter: "${delimiter}"`);

  // Parse CSV rows
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`[parsePlayByPlayCSV] CSV parse complete. Total rows: ${rows.length}`);
  if (!rows.length) {
    throw new Error('CSV is empty or could not be parsed.');
  }

  // Fetch the session (use let so we can update later)
  let session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Convert session date (in ms) for proper plays timestamp calculation
  const sessionDateMs = session.date;
  
  // Build array of plays using fraction-of-day conversion
  const playData = rows.map((row, index) => {
    const fractionStart = parseFloat(row['StartTime']) || 0;
    const fractionEnd = parseFloat(row['EndTime']) || 0;
    const offsetStartMs = fractionStart * 24 * 60 * 60 * 1000;
    const offsetEndMs = fractionEnd * 24 * 60 * 60 * 1000;
    const finalStartMs = Math.floor(sessionDateMs + offsetStartMs);
    const finalEndMs = Math.floor(sessionDateMs + offsetEndMs);
    return {
      userId,
      sessionId,
      timeStart: finalStartMs,
      timeEnd: finalEndMs,
      duration: parseFloat(row['Duration']) || 0,
      half: parseInt(row['Half'], 10) || 1,
      teamStartPossession: row['StartPossession'] || 'Unknown',
      teamEndPossession: row['EndPossession'] || 'Unknown',
      turnovers: parseInt(row['Turnovers'], 10) || 0,
      startAction: row['StartAction'] || 'Unknown',
      endAction: row['EndAction'] || 'Unknown',
    };
  });

  // Insert new plays into PlayByPlayAnalysis
  await PlayByPlayAnalysis.insertMany(playData, { ordered: false });
  console.log(`[parsePlayByPlayCSV] Inserted ${playData.length} play documents into PlayByPlayAnalysis.`);

  // Append new plays to session.plays
  const existingPlays = session.plays || [];
  const newPlays = playData.map((play, index) => ({
    title: `Play ${existingPlays.length + index + 1}`,
    playNumber: existingPlays.length + index + 1,
    ...play,
  }));
  console.log(`[parsePlayByPlayCSV] New plays to append: ${newPlays.length}`);
  session.plays = existingPlays.concat(newPlays);
  console.log(`[parsePlayByPlayCSV] session.plays BEFORE save: ${session.plays.length}`);

  // Mark plays as modified and save the session
  session.markModified('plays');
  await session.save();
  console.log(`[parsePlayByPlayCSV] Saved session with new plays.`);

  // Re-fetch session so that plays are updated in-memory
  session = await Session.findById(sessionId);
  console.log(`[parsePlayByPlayCSV] Re-fetched session.plays length: ${session.plays.length}`);

  // Create missing players from CSV
  await createPlayersFromCSV(sessionId, userId);

  // Patch each SessionPlayerData doc with the real Player name
  const allDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allDocs) {
    const playerDoc = await Player.findOne({ userId, playerId: doc.playerName });
    if (playerDoc) {
      doc.playerId = playerDoc._id;
      doc.playerName = playerDoc.name;
      await doc.save();
    }
  }

  // Fetch updated SessionPlayerData docs and calculate metrics
  const playerDocs = await SessionPlayerData.find({ sessionId });
  if (!playerDocs.length) {
    console.warn('⚠️ No SessionPlayerData found. Skipping metrics calculation.');
  } else {
    // Combine times and speeds from all docs for overall play metrics.
    const combinedTimes = playerDocs.flatMap(doc => doc.times || []);
    const combinedSpeeds = playerDocs.flatMap(doc => doc.speeds || []);
    console.log(`[parsePlayByPlayCSV] Combined times length: ${combinedTimes.length}`);
    console.log(`[parsePlayByPlayCSV] Combined speeds length: ${combinedSpeeds.length}`);

    const combinedPlayMetrics = calculatePlayPlayerMetrics(combinedTimes, combinedSpeeds, session.plays || []);
    console.log('[parsePlayByPlayCSV] Combined play metrics:', combinedPlayMetrics);

    // Update each play in session.plays with avgDistance and numSprint from snippet metrics.
    session.plays = session.plays.map(play => {
      const pm = combinedPlayMetrics.find(m => m.PlayNumber === play.playNumber);
      return {
        ...play,
        avgDistance: pm ? pm.AvgDistance : 0,
        numSprint: pm ? pm.NumSprint : 0,
      };
    });

    // Update sessionPlayerData metrics for each player.
    session.sessionPlayerData = playerDocs.map(doc => {
      const speeds = doc.speeds || [];
      const sessionPlayerMetrics = [
        { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
        { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
        { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
        { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
      ];
      const playPlayerMetrics = calculatePlayPlayerMetrics(doc.times || [], doc.speeds || [], session.plays || []);
      const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits || []);
      return {
        csvId: doc._id,
        playerId: doc.playerId,
        playerName: doc.playerName,
        sessionPlayerMetrics,
        playPlayerMetrics,
        splitPlayerMetrics,
      };
    });

    await session.save();
  }

  // ── FIX: Wait a short period to ensure all CSV processing and writes are complete ──
  await new Promise(resolve => setTimeout(resolve, 500));

  // Recalculate average distance for the session (now including new CSV data)
  await calculateAverageDistance(sessionId);

  // Return updated session with populated sessionPlayerData
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  return updatedSession;
};

// ====================== POST /api/playByPlayAnalysiss/upload ======================
export const uploadPlayByPlayAnalysisCSV = asyncHandler(async (req, res) => {
  const { playByPlayAnalysisId } = req.body;
  if (!playByPlayAnalysisId) {
    return res.status(400).json({ message: 'PlayByPlayAnalysis ID is required.' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  if (!mongoose.Types.ObjectId.isValid(playByPlayAnalysisId)) {
    return res.status(400).json({ message: 'Invalid playByPlayAnalysis ID.' });
  }
  try {
    const updatedSession = await parsePlayByPlayCSV(
      req.file.buffer,
      playByPlayAnalysisId,
      req.user._id
    );
    return res.status(201).json(updatedSession);
  } catch (error) {
    console.error('Error processing CSV:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

// ====================== Other CRUD Methods ======================
export const registerPlayByPlayAnalysis = asyncHandler(async (req, res) => {
  const { timeStart, timeEnd, duration, teamStartPosession, teamEndPosession, turnovers, startAction, endAction } = req.body;
  const userId = req.user._id;
  const playByPlayAnalysis = await PlayByPlayAnalysis.create({
    userId,
    timeStart,
    timeEnd,
    duration,
    teamStartPosession,
    teamEndPosession,
    turnovers,
    startAction,
    endAction,
  });
  if (playByPlayAnalysis) {
    return res.status(200).json(playByPlayAnalysis);
  } else {
    res.status(400);
    throw new Error('Invalid playByPlayAnalysis data');
  }
});

export const getPlayByPlayAnalysiss = asyncHandler(async (req, res) => {
  const playByPlayAnalysiss = await PlayByPlayAnalysis.find({ userId: req.user._id });
  if (!playByPlayAnalysiss || playByPlayAnalysiss.length === 0) {
    res.status(404);
    throw new Error('No playByPlayAnalysiss found.');
  }
  res.status(200).json(playByPlayAnalysiss);
});

export const getPlayByPlayAnalysisByID = asyncHandler(async (req, res) => {
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (playByPlayAnalysis) {
    res.status(200).json(playByPlayAnalysis);
  } else {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }
});

export const deletePlayByPlayAnalysis = asyncHandler(async (req, res) => {
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (!playByPlayAnalysis) {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }
  await PlayByPlayAnalysis.deleteOne({ _id: playByPlayAnalysis._id });
  res.status(200).json({ message: 'PlayByPlayAnalysis deleted successfully' });
});

export const updatePlayByPlayAnalysis = asyncHandler(async (req, res) => {
  const { teamName, playByPlayAnalysisName, date, type, duration, splits, notes } = req.body;
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (!playByPlayAnalysis) {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }
  if (teamName) playByPlayAnalysis.teamName = teamName;
  if (playByPlayAnalysisName) playByPlayAnalysis.playByPlayAnalysisName = playByPlayAnalysisName;
  if (date) {
    const parsedDate = new Date(date).getTime();
    if (!isNaN(parsedDate)) {
      playByPlayAnalysis.date = parsedDate;
    }
  }
  if (type) playByPlayAnalysis.type = type;
  if (duration) playByPlayAnalysis.duration = Number(duration);
  if (notes) playByPlayAnalysis.notes = notes;
  if (splits && Array.isArray(splits)) {
    playByPlayAnalysis.splits = splits.map((split, i) => {
      if (!split.title) {
        throw new Error('Split title is required.');
      }
      const startTime = moment(split.start, ['HH:mm', 'HH:mm:ss'], true);
      const endTime = moment(split.end, ['HH:mm', 'HH:mm:ss'], true);
      if (!startTime.isValid()) {
        throw new Error(`Invalid start time (“${split.start}”) for split ${split.title}. Must be 24-hour, e.g. "05:00" or "17:30:00".`);
      }
      if (!endTime.isValid()) {
        throw new Error(`Invalid end time (“${split.end}”) for split ${split.title}. Must be 24-hour, e.g. "05:00" or "17:30:00".`);
      }
      const formattedStart = startTime.format('HH:mm:ss');
      const formattedEnd = endTime.format('HH:mm:ss');
      return { title: split.title, splitNumber: i + 1, start: formattedStart, end: formattedEnd };
    });
  }
  const updatedPlayByPlayAnalysis = await playByPlayAnalysis.save();
  res.status(200).json(updatedPlayByPlayAnalysis);
});

export const deleteAllPlayByPlayAnalysisCSVs = asyncHandler(async (req, res) => {
  const playByPlayAnalysisId = req.params.id;
  if (!playByPlayAnalysisId) {
    res.status(400);
    throw new Error('PlayByPlayAnalysis ID is required.');
  }
  const playByPlayAnalysis = await PlayByPlayAnalysis.findByIdAndUpdate(
    playByPlayAnalysisId,
    { playByPlayAnalysisPlayerData: [], number: 0, avgDistance: 0 },
    { new: true }
  );
  if (!playByPlayAnalysis) {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found.');
  }
  res.status(200).json({ message: 'All CSV data deleted', playByPlayAnalysis });
});
