import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import moment from 'moment';

import PlayByPlayAnalysis from '../models/playByPlayAnalysisModel.js';
import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';

// ====================== Overall Metrics Helper ======================
// For each player's 'sessionPlayerMetrics'
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
// 3) Create missing players
// 4) Calculate overall, per-play, and per-split metrics for each player
// 5) Also aggregate each play's avgDistance and numSprint into session.plays
// 6) Recalculate session.avgDistance
// 7) Return updated session
const parsePlayByPlayCSV = async (fileBuffer, sessionId, userId) => {
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

  // Parse CSV
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  if (!rows.length) {
    throw new Error('CSV is empty or could not be parsed.');
  }

  // Fetch the session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Build array of plays from CSV
  const playData = rows.map((row, index) => {
    // If your StartTime/EndTime in CSV are "hours from session start", multiply by 24
    const startTime = parseFloat(row['StartTime']) * 24 || 0;
    const endTime = parseFloat(row['EndTime']) * 24 || 0;
    return {
      userId,
      sessionId,
      timeStart: moment.unix(session.date / 1000).add(startTime, 'hours').unix(),
      timeEnd: moment.unix(session.date / 1000).add(endTime, 'hours').unix(),
      duration: parseFloat(row['Duration']) || 0,
      half: parseInt(row['Half']) || 1,
      teamStartPossession: row['StartPossession'] || 'Unknown',
      teamEndPossession: row['EndPossession'] || 'Unknown',
      turnovers: parseInt(row['Turnovers']) || 0,
      startAction: row['StartAction'] || 'Unknown',
      endAction: row['EndAction'] || 'Unknown',
    };
  });

  // Insert new play data into DB
  await PlayByPlayAnalysis.insertMany(playData, { ordered: false });

  // Append new plays to session.plays
  const existingPlays = session.plays || [];
  const newPlays = playData.map((play, index) => ({
    title: `Play ${existingPlays.length + index + 1}`,
    playNumber: existingPlays.length + index + 1,
    ...play,
  }));
  session.plays = existingPlays.concat(newPlays);

  // Save so the session now has these new plays
  await session.save();

  // Create any missing players from the CSV
  await createPlayersFromCSV(sessionId, userId);

  // Fetch all SessionPlayerData docs for this session
  const playerDocs = await SessionPlayerData.find({ sessionId });
  if (!playerDocs.length) {
    console.warn('⚠️ No SessionPlayerData found. Skipping metrics calculation.');
  } else {
    //
    // 1) AGGREGATE each play's avgDistance + numSprint for the entire session
    //    so you can display them in your "Plays" table
    //
    const combinedSpeeds = playerDocs.flatMap(doc => doc.speeds || []);
    const combinedPlayMetrics = calculatePlayPlayerMetrics(combinedSpeeds, session.plays || []);

    // Update each play in session.plays
    session.plays = session.plays.map((play) => {
      const pm = combinedPlayMetrics.find((m) => m.PlayNumber === play.playNumber);
      return {
        ...play,
        avgDistance: pm ? pm.AvgDistance : 0,
        numSprint: pm ? pm.NumSprint : 0,
      };
    });

    //
    // 2) FOR EACH PLAYER: overall + per-play + per-split
    //
    session.sessionPlayerData = playerDocs.map((doc) => {
      const speeds = doc.speeds || [];

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

      // Per-play metrics
      const playPlayerMetrics = calculatePlayPlayerMetrics(speeds, session.plays || []);

      // Per-split metrics
      const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits || []);

      return {
        csvId: doc._id,
        playerName: doc.playerId,
        sessionPlayerMetrics,
        playPlayerMetrics,
        splitPlayerMetrics,
      };
    });

    // Save the session again with updated plays & sessionPlayerData
    await session.save();
  }

  // Finally, recalc average distance for the entire session
  await calculateAverageDistance(sessionId);

  // Return the updated session (with sessionPlayerData populated)
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
    // Process the CSV: parse, create players, compute metrics
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
  // If you have a separate "PlayByPlayAnalysisPlayerData" model, remove those too
  // e.g. await PlayByPlayAnalysisPlayerData.deleteMany({ playByPlayAnalysisId: playByPlayAnalysis._id });

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

  // Update fields if provided
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

  // Handle splits if provided
  if (splits && Array.isArray(splits)) {
    // e.g. convert HH:mm:ss to numeric seconds
    playByPlayAnalysis.splits = splits.map((split, i) => {
      if (!split.title) {
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
        splitNumber: i + 1,
        start: startSec,
        end: endSec,
      };
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
  // e.g. if there's a "PlayByPlayAnalysisPlayerData" model, remove them:
  // await PlayByPlayAnalysisPlayerData.deleteMany({ playByPlayAnalysisId });
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
export { parsePlayByPlayCSV };