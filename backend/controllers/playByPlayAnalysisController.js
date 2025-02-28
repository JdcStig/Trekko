import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import PlayByPlayAnalysis from '../models/playByPlayAnalysisModel.js';
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
const parseCSV = async (fileBuffer, playByPlayAnalysisId, userId) => {
  console.log(`📌 [parseCSV] Start for playByPlayAnalysis=${playByPlayAnalysisId} | user=${userId}`);

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(playByPlayAnalysisId)) {
    throw new Error("Invalid playByPlayAnalysis ID.");
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

  // 3) Fetch the playByPlayAnalysis from DB
  const playByPlayAnalysis = await PlayByPlayAnalysis.findById(playByPlayAnalysisId);
  if (!playByPlayAnalysis) {
    throw new Error(`PlayByPlayAnalysis not found: ${playByPlayAnalysisId}`);
  }

  // 4) Build in-memory data for each playByPlayAnalysis.
  // We use "Player Display Name" and "Speed (m/s)" (and optionally Latitude, Longitude, Heart Rate, Acceleration)
  console.log("🔄 [parseCSV] Building in-memory data for each playByPlayAnalysis...");
  const playByPlayAnalysissData = {}; // key: playByPlayAnalysisId
  rows.forEach((row) => {
    const timeStart = row['TimeStart'] || 'Unknown Time';
    const timeEnd = parseFloat(row['TimeEnd']) || 0;
    const duration = parseFloat(row['Duration']) || 0;
    const teamStartPosession = parseFloat(row['TeamStartPosession']) || 0;
    const teamEndPosession = parseFloat(row['TeamEndPosession']) || 0;
    const turnovers = parseFloat(row['Turnovers']) || 0;
    const startAction = parseFloat(row['StartAction']) || 0;
    const endAction = row['EndAction'];
    let combinedDateTime = (dateStr && timeStr)
      ? new Date(`${dateStr}T${timeStr}Z`)
      : new Date();

    if (!playByPlayAnalysissData[playByPlayAnalysisId]) {
      playByPlayAnalysissData[playByPlayAnalysisId] = {
        userId,
        timeStart,
        timeEnd,
        duration,
        teamStartPosession,
        teamEndPosession,
        turnovers,
        startAction,
        endAction,
      };
    }
    // playByPlayAnalysissData[playByPlayAnalysisId].times.push(combinedDateTime);
    // playByPlayAnalysissData[playByPlayAnalysisId].lats.push(lat);
    // playByPlayAnalysissData[playByPlayAnalysisId].lons.push(lon);
    // playByPlayAnalysissData[playByPlayAnalysisId].speeds.push(speed);
    // playByPlayAnalysissData[playByPlayAnalysisId].heartRates.push(hr);
    // playByPlayAnalysissData[playByPlayAnalysisId].accelerations.push(accel);
  });

  // 5) Prepare documents for insertion (one per unique playByPlayAnalysis)
  console.log("💾 [parseCSV] Preparing PlayByPlayAnalysisPlayerData documents for insertion...");
  const insertArray = [];
  for (const [playByPlayAnalysisId, pdata] of Object.entries(playByPlayAnalysissData)) {
    const sortedTimes = pdata.times.sort((a, b) => a - b);
    const timeStart = sortedTimes[0] || new Date();
    const timeEnd = sortedTimes[sortedTimes.length - 1] || new Date();
    insertArray.push({
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
  }
  if (!insertArray.length) {
    console.log("✅ [parseCSV] Inserted 0 PlayByPlayAnalysisPlayerData documents. (No data?)");
  }
  const insertedDocs = await PlayByPlayAnalysisPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`✅ [parseCSV] Inserted ${insertedDocs.length} PlayByPlayAnalysisPlayerData documents.`);

  // 6) Calculate metrics for each inserted document and update playByPlayAnalysis.playByPlayAnalysisPlayerData.
  console.log("📊 [parseCSV] Generating metrics and updating playByPlayAnalysis...");
  playByPlayAnalysis.playByPlayAnalysisPlayerData = []; // Clear existing array.
  const allPlayerDocs = await PlayByPlayAnalysisPlayerData.find({ playByPlayAnalysisId });
  for (const doc of allPlayerDocs) {
    const speeds = doc.speeds.length ? doc.speeds : [0];
    const playByPlayAnalysisPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];

    // --- NEW: per-split metrics using the helper (with console logs) ---
    console.log(
      `\n[parseCSV] Calculating split metrics for playByPlayAnalysisId="${doc.playByPlayAnalysisId}"`
    );
    const splitPlayerMetrics = calculateSplitPlayerMetrics(
      speeds,
      playByPlayAnalysis.splits || []
    );

    playByPlayAnalysis.playByPlayAnalysisPlayerData.push({
      csvId: doc._id,
      playByPlayAnalysisName: doc.playByPlayAnalysisId,
      playByPlayAnalysisPlayerMetrics,
      splitPlayerMetrics,
    });
  }
  await playByPlayAnalysis.save();
  console.log("✅ [parseCSV] PlayByPlayAnalysis updated with CSV metrics.");

  // 7) Create any missing playByPlayAnalysiss (once)
  console.log("🛠️ [parseCSV] Creating any missing playByPlayAnalysiss...");
  await createPlayersFromCSV(playByPlayAnalysisId, userId);
  console.log("✅ [parseCSV] createPlayersFromCSV done.");

  // 8) Recalculate average distance for the playByPlayAnalysis
  console.log("🔄 [parseCSV] Recalculating average distance...");
  await calculateAverageDistance(playByPlayAnalysisId);
  console.log("✅ [parseCSV] Average distance updated.");

  // 9) Fetch and return the updated playByPlayAnalysis (populated with playByPlayAnalysisPlayerData)
  const updatedPlayByPlayAnalysis = await PlayByPlayAnalysis.findById(playByPlayAnalysisId).populate('playByPlayAnalysisPlayerData');
  console.log("🚀 [parseCSV] Done. Returning updated playByPlayAnalysis.");
  return updatedPlayByPlayAnalysis;
};

export default parseCSV;

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

