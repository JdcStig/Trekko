import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';
import moment from 'moment';

import PlayByPlayAnalysis from '../models/playByPlayAnalysisModel.js';
import Session from '../models/sessionModel.js';
import Team from '../models/teamModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js'; // Used to fetch player data

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';

// ====================== Optional Metrics Calculations Helper ======================
// (This helper is used to calculate overall session metrics if needed)
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000, // km
  TopSpeed: (values) => Math.max(...values),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

// ====================== parsePlayByPlayCSV ======================
// This function performs the following steps:
// 1) Parses CSV rows to build an array of play data.
// 2) Inserts the parsed data into the PlayByPlayAnalysis collection.
// 3) Appends the new play data to the session.plays array.
// 4) Immediately recalculates per-play metrics for each player by always
//    fetching the latest SessionPlayerData from the database and mapping each
//    document to a new object with updated metrics using calculatePlayPlayerMetrics.
// 5) Recalculates average distance and creates any missing players.
const parsePlayByPlayCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`📌 [parsePlayByPlayCSV] Start for session=${sessionId} | user=${userId}`);

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('Uploaded file is empty.');
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error('Invalid session ID.');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid user ID.');
  }

  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';

  console.log(`🔍 [parsePlayByPlayCSV] Detected delimiter: "${delimiter}"`);

  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`✅ [parsePlayByPlayCSV] CSV parsed. Total rows: ${rows.length}`);

  if (!rows.length) {
    throw new Error('CSV is empty or could not be parsed.');
  }

  // Find the session to update
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  const sessionStartDate = moment.unix(session.date).utc();

  // Build playData array from CSV rows.
  // Adjust the multiplication factor if your CSV times are in a different unit.
  const playData = rows.map((row, index) => {
    const startTime = parseFloat(row['StartTime']) * 24 || 0;
    const endTime = parseFloat(row['EndTime']) * 24 || 0;
    return {
      userId,
      sessionId,
      timeStart: moment().startOf('day').add(startTime, 'hours').unix(),
      timeEnd: moment().startOf('day').add(endTime, 'hours').unix(),
      duration: parseFloat(row['Duration']) || 0,
      half: parseInt(row['Half']) || 1,
      teamStartPossession: row['StartPossession'] || 'Unknown',
      teamEndPossession: row['EndPossession'] || 'Unknown',
      turnovers: parseInt(row['Turnovers']) || 0,
      startAction: row['StartAction'] || 'Unknown',
      endAction: row['EndAction'] || 'Unknown',
    };
  });

  // Insert the playData into the PlayByPlayAnalysis collection.
  const insertedDocs = await PlayByPlayAnalysis.insertMany(playData, { ordered: false });
  console.log(`✅ Inserted ${insertedDocs.length} PlayByPlayAnalysis records.`);

  // Append new plays to the session's existing plays.
  const existingPlays = session.plays || [];
  const newPlays = playData.map((play, index) => ({
    title: `Play ${existingPlays.length + index + 1}`,
    playNumber: existingPlays.length + index + 1,
    ...play,
  }));
  session.plays = existingPlays.concat(newPlays);

  await session.save();
  console.log(`✅ Updated session with ${session.plays.length} plays.`);

  // ------------------------------
  // Recalculate per-play metrics for each player.
  console.log('🔄 Recalculating play metrics for each player...');
  // Always re-fetch the SessionPlayerData documents to update the metrics.
  const playerDocs = await SessionPlayerData.find({ sessionId: session._id });
  session.sessionPlayerData = playerDocs.map((doc) => {
    const speeds = doc.speeds && doc.speeds.length ? doc.speeds : [0];
    return {
      csvId: doc._id,
      playerName: doc.playerId,
      sessionPlayerMetrics: [
        {
          MetricName: 'Distance',
          Value: metricsCalculations.Distance(speeds),
          Unit: 'km',
        },
        {
          MetricName: 'TopSpeed',
          Value: speeds.length ? Math.max(...speeds) : 0,
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
      ],
      splitPlayerMetrics: calculateSplitPlayerMetrics(speeds, session.splits || []),
      playPlayerMetrics: calculatePlayPlayerMetrics(speeds, session.plays || []),
    };
  });
  await session.save();
  console.log('✅ Session saved with recalculated playPlayerMetrics for each player.');
  // ------------------------------

  // Recalculate average distance for the session.
  await calculateAverageDistance(sessionId);
  console.log('✅ Average distance recalculated.');

  // Create any missing players from the CSV.
  await createPlayersFromCSV(sessionId, userId);
  console.log('✅ createPlayersFromCSV executed.');

  // Return the updated session with populated sessionPlayerData.
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  console.log('🚀 [parsePlayByPlayCSV] Done. Returning updated session.');
  return updatedSession;
};

// Export the function once.
export { parsePlayByPlayCSV };


// ====================== Endpoint Handlers ======================

// POST /api/playByPlayAnalysiss/upload
export const uploadPlayByPlayAnalysisCSV = asyncHandler(async (req, res) => {
  console.log('📌 Received CSV upload request for playByPlayAnalysis:', req.body.playByPlayAnalysisId);
  const { playByPlayAnalysisId } = req.body;
  if (!playByPlayAnalysisId) {
    console.error('🚨 No playByPlayAnalysis ID provided!');
    return res.status(400).json({ message: 'PlayByPlayAnalysis ID is required.' });
  }
  if (!req.file) {
    console.error('🚨 No file uploaded!');
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  console.log(`✅ File received: ${req.file.originalname} | Size: ${req.file.size} bytes`);

  if (!mongoose.Types.ObjectId.isValid(playByPlayAnalysisId)) {
    console.error('🚨 Invalid playByPlayAnalysisId:', playByPlayAnalysisId);
    return res.status(400).json({ message: 'Invalid playByPlayAnalysis ID.' });
  }

  try {
    // Call the updated parsePlayByPlayCSV function.
    const updatedSession = await parsePlayByPlayCSV(req.file.buffer, playByPlayAnalysisId, req.user._id);
    console.log('🚀 CSV processing complete! Returning updated session.');
    return res.status(201).json(updatedSession);
  } catch (error) {
    console.error('🚨 Error processing CSV:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

// POST /api/playByPlayAnalysiss (Create PlayByPlayAnalysis)
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

// GET /api/playByPlayAnalysiss (Get All PlayByPlayAnalysiss)
export const getPlayByPlayAnalysiss = asyncHandler(async (req, res) => {
  const playByPlayAnalysiss = await PlayByPlayAnalysis.find({ userId: req.user._id });
  if (!playByPlayAnalysiss || playByPlayAnalysiss.length === 0) {
    res.status(404);
    throw new Error('No playByPlayAnalysiss found.');
  }
  res.status(200).json(playByPlayAnalysiss);
});

// GET /api/playByPlayAnalysiss/:id (Get PlayByPlayAnalysis by ID)
export const getPlayByPlayAnalysisByID = asyncHandler(async (req, res) => {
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (playByPlayAnalysis) {
    res.status(200).json(playByPlayAnalysis);
  } else {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }
});

// DELETE /api/playByPlayAnalysiss/:id (Delete PlayByPlayAnalysis)
export const deletePlayByPlayAnalysis = asyncHandler(async (req, res) => {
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (!playByPlayAnalysis) {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }
  // Note: Make sure to import and reference the related player data model if needed.
  await PlayByPlayAnalysisPlayerData.deleteMany({ playByPlayAnalysisId: playByPlayAnalysis._id });
  await PlayByPlayAnalysis.deleteOne({ _id: playByPlayAnalysis._id });
  res.status(200).json({ message: 'PlayByPlayAnalysis deleted successfully' });
});

// PUT /api/playByPlayAnalysiss/:id (Update PlayByPlayAnalysis)
export const updatePlayByPlayAnalysis = asyncHandler(async (req, res) => {
  const { teamName, playByPlayAnalysisName, date, type, duration, splits, notes } = req.body;
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (!playByPlayAnalysis) {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }

  // Handle splits if provided
  let convertedSplits = playByPlayAnalysis.splits; // Default to existing splits
  if (splits && Array.isArray(splits)) {
    convertedSplits = splits.map((split, index) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const start = typeof split.start === 'number'
        ? split.start
        : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      const end = typeof split.end === 'number'
        ? split.end
        : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
      return {
        title: split.title,
        splitNumber: index + 1,
        start: start,
        end: end,
      };
    });
    playByPlayAnalysis.splits = convertedSplits;
    const updatedSplitNumbers = convertedSplits.map(split => split.splitNumber);
    playByPlayAnalysis.playByPlayAnalysisPlayerData.forEach(playByPlayAnalysisData => {
      playByPlayAnalysisData.splitPlayerMetrics = playByPlayAnalysisData.splitPlayerMetrics.filter(
        metric => updatedSplitNumbers.includes(metric.SplitNumber)
      );
      updatedSplitNumbers.forEach(splitNumber => {
        const exists = playByPlayAnalysisData.splitPlayerMetrics.some(
          metric => metric.SplitNumber === splitNumber
        );
        if (!exists) {
          playByPlayAnalysisData.splitPlayerMetrics.push({
            SplitNumber: splitNumber,
            SplitMetrics: []
          });
        }
      });
    });
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

  const updatedPlayByPlayAnalysis = await playByPlayAnalysis.save();
  res.status(200).json(updatedPlayByPlayAnalysis);
});

// DELETE /api/playByPlayAnalysiss/:id/csvs/all (Delete All CSV Data)
export const deleteAllPlayByPlayAnalysisCSVs = asyncHandler(async (req, res) => {
  const playByPlayAnalysisId = req.params.id;
  if (!playByPlayAnalysisId) {
    res.status(400);
    throw new Error('PlayByPlayAnalysis ID is required.');
  }
  await PlayByPlayAnalysisPlayerData.deleteMany({ playByPlayAnalysisId });
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
