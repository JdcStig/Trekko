import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import PlayByPlayAnalysis from '../models/playByPlayAnalysisModel.js';
import Session from '../models/sessionModel.js';
import Team from '../models/teamModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js'; // Import the new helper

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
//  1) Groups rows by playByPlayAnalysis (using the column "Player Display Name").
//  2) Uses the "Speed (m/s)" column (and optionally others if available)
//     to build an object per playByPlayAnalysis.
//  3) Inserts one PlayByPlayAnalysisPlayerData document per unique playByPlayAnalysis,
//     calculates per‑playByPlayAnalysis metrics, attaches them to the PlayByPlayAnalysis document,
//     creates any missing playByPlayAnalysiss, and recalculates average distance.
const parsePlayByPlayCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`📌 [parsePlayByPlayCSV] Start for session=${sessionId} | user=${userId}`);

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // Convert buffer to string & detect delimiter
  const fileString = fileBuffer.toString("utf-8");
  let delimiter = ",";
  if (fileString.includes("\t")) delimiter = "\t";
  else if (fileString.includes(";")) delimiter = ";";
  else if (fileString.includes("  ")) delimiter = " ";
  console.log(`🔍 [parsePlayByPlayCSV] Detected delimiter: "${delimiter}"`);

  // Parse CSV rows
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on("data", (row) => rows.push(row))
      .on("end", resolve)
      .on("error", reject);
  });
  console.log(`✅ [parsePlayByPlayCSV] CSV parsed. Total rows: ${rows.length}`);

  if (!rows.length) {
    throw new Error("CSV is empty or could not be parsed.");
  }

  // Fetch session
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // Process and insert PlayByPlayAnalysis data
  const playData = rows.map((row, index) => ({
    userId,
    sessionId,
    timeStart: parseFloat(row["TimeStart"]) || 0,
    timeEnd: parseFloat(row["TimeEnd"]) || 0,
    duration: parseFloat(row["Duration"]) || 0,
    half: parseInt(row["Half"]) || 1,
    teamStartPossession: row["TeamStartPossession"] || "Unknown",
    teamEndPossession: row["TeamEndPossession"] || "Unknown",
    turnovers: parseInt(row["Turnovers"]) || 0,
    startAction: row["StartAction"] || "Unknown",
    endAction: row["EndAction"] || "Unknown",
  }));

  // Insert into PlayByPlayAnalysis collection
  const insertedDocs = await PlayByPlayAnalysis.insertMany(playData, { ordered: false });
  console.log(`✅ Inserted ${insertedDocs.length} PlayByPlayAnalysis records.`);

  // Update session plays
  session.plays = playData.map((play, index) => ({
    title: `Play ${index + 1}`,
    playNumber: index + 1,
    ...play,
  }));
  await session.save();
  console.log(`✅ Updated session with ${session.plays.length} plays.`);

  return insertedDocs;
};

export default parsePlayByPlayCSV;

// ====================== POST /api/playByPlayAnalysiss/upload ======================
// Route handler to upload and process a CSV file for a playByPlayAnalysis.
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
    const updatedPlayByPlayAnalysis = await parseCSV(req.file.buffer, playByPlayAnalysisId, req.user._id);
    console.log('🚀 CSV processing complete! Returning updated playByPlayAnalysis.');
    return res.status(201).json(updatedPlayByPlayAnalysis);
  } catch (error) {
    console.error('🚨 Error processing CSV:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

// ====================== POST /api/playByPlayAnalysiss (Create PlayByPlayAnalysis) ======================
export const registerPlayByPlayAnalysis = asyncHandler(async (req, res) => {
  const { timeStart, timeEnd, duration, teamStartPosession, teamEndPosession, turnovers, startAction, endAction } = req.body;
  const userId = req.user._id;
  // let parsedDate;
  // if (isNaN(parsedDate)) {
  //   res.status(400);
  //   throw new Error('Invalid date format. Could not parse date.');
  // }
  // const team = await Team.findOne({ name: teamName, userId });
  // if (!team) {
  //   res.status(400);
  //   throw new Error('Team does not exist. Please create a team first.');
  // }
  // let processedSplits = [];
  // if (splits && Array.isArray(splits)) {
  //   processedSplits = splits.map((split, i) => {
  //     if (!split.title) {
  //       res.status(400);
  //       throw new Error('Split title is required.');
  //     }
  //     const startSec =
  //       typeof split.start === 'number'
  //         ? split.start
  //         : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
  //     const endSec =
  //       typeof split.end === 'number'
  //         ? split.end
  //         : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
  //     return {
  //       title: split.title,
  //       splitNumber: i + 1,
  //       start: startSec,
  //       end: endSec,
  //     };
  //   });
  // }
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

// ====================== GET /api/playByPlayAnalysiss (Get All PlayByPlayAnalysiss) ======================
export const getPlayByPlayAnalysiss = asyncHandler(async (req, res) => {
  const playByPlayAnalysiss = await PlayByPlayAnalysis.find({ userId: req.user._id });
  if (!playByPlayAnalysiss || playByPlayAnalysiss.length === 0) {
    res.status(404);
    throw new Error('No playByPlayAnalysiss found.');
  }
  res.status(200).json(playByPlayAnalysiss);
});

// ====================== GET /api/playByPlayAnalysiss/:id (Get PlayByPlayAnalysis by ID) ======================
export const getPlayByPlayAnalysisByID = asyncHandler(async (req, res) => {
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (playByPlayAnalysis) {
    res.status(200).json(playByPlayAnalysis);
  } else {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }
});

// ====================== DELETE /api/playByPlayAnalysiss/:id (Delete PlayByPlayAnalysis) ======================
export const deletePlayByPlayAnalysis = asyncHandler(async (req, res) => {
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (!playByPlayAnalysis) {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }
  await PlayByPlayAnalysisPlayerData.deleteMany({ playByPlayAnalysisId: playByPlayAnalysis._id });
  await PlayByPlayAnalysis.deleteOne({ _id: playByPlayAnalysis._id });
  res.status(200).json({ message: 'PlayByPlayAnalysis deleted successfully' });
});

// ====================== PUT /api/playByPlayAnalysiss/:id (Update PlayByPlayAnalysis) ======================
export const updatePlayByPlayAnalysis = asyncHandler(async (req, res) => {
  const { teamName, playByPlayAnalysisName, date, type, duration, splits, notes } = req.body;
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(req.params.id);
  if (!playByPlayAnalysis) {
    res.status(404);
    throw new Error('PlayByPlayAnalysis not found');
  }

  // Handle splits: If provided, process them
  let convertedSplits = playByPlayAnalysis.splits; // Default to existing splits
  if (splits && Array.isArray(splits)) {
    convertedSplits = splits.map((split, index) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const start = typeof split.start === "number"
        ? split.start
        : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      const end = typeof split.end === "number"
        ? split.end
        : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
      return {
        title: split.title,
        splitNumber: index + 1,
        start: start,
        end: end,
      };
    });
    // Update playByPlayAnalysis splits
    playByPlayAnalysis.splits = convertedSplits;
    // Update splitPlayerMetrics in each playByPlayAnalysisPlayerData entry
    const updatedSplitNumbers = convertedSplits.map(split => split.splitNumber);
    playByPlayAnalysis.playByPlayAnalysisPlayerData.forEach(playByPlayAnalysisData => {
      // Remove metrics for splits that no longer exist
      playByPlayAnalysisData.splitPlayerMetrics = playByPlayAnalysisData.splitPlayerMetrics.filter(
        metric => updatedSplitNumbers.includes(metric.SplitNumber)
      );
      // Add new split metrics for any new splits
      updatedSplitNumbers.forEach(splitNumber => {
        const exists = playByPlayAnalysisData.splitPlayerMetrics.some(
          metric => metric.SplitNumber === splitNumber
        );
        if (!exists) {
          playByPlayAnalysisData.splitPlayerMetrics.push({
            SplitNumber: splitNumber,
            SplitMetrics: [] // Initialize empty metrics
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
  // If splits were provided, playByPlayAnalysis.splits has already been updated.
  const updatedPlayByPlayAnalysis = await playByPlayAnalysis.save();
  res.status(200).json(updatedPlayByPlayAnalysis);
});

// ====================== DELETE /api/playByPlayAnalysiss/:id/csvs/all (Delete All CSV Data) ======================
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

export { parsePlayByPlayCSV };