// file: controllers/forceVelocityController.js

import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js';
import ForceVelocityAnalysis from '../models/forceVelocityAnalysisModel.js';

// For ES Modules: get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * GET /api/forcevelocity
 * Returns force-velocity analysis data for the given date range and players.
 * Query Params:
 *   startDate - (required) ISO date string or timestamp
 *   endDate   - (required) ISO date string or timestamp
 *   playerIds - (required) comma separated string or array of player IDs
 *   grouping  - (optional) 'none'|'day'|'week'|'month'
 */
export const getForceVelocityData = asyncHandler(async (req, res) => {
  const { startDate, endDate, playerIds, grouping } = req.query; // grouping: 'none'|'day'|'week'|'month'
  
  // 1) Validate and parse dates
  let startMs = new Date(startDate).getTime();
  let endMs   = new Date(endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error("Invalid or missing startDate/endDate");
  }

  // If grouping is 'week', adjust start and end dates to cover full week (Sunday to Saturday)
  if (grouping === 'week') {
    // Adjust start date to the previous Sunday (or same if already Sunday)
    const startDateObj = new Date(startMs);
    const startDay = startDateObj.getDay(); // Sunday=0, Saturday=6
    if (startDay !== 0) {
      startDateObj.setDate(startDateObj.getDate() - startDay);
      startMs = startDateObj.getTime();
    }
    // Adjust end date to the following Saturday (or same if already Saturday)
    const endDateObj = new Date(endMs);
    const endDay = endDateObj.getDay();
    if (endDay !== 6) {
      endDateObj.setDate(endDateObj.getDate() + (6 - endDay));
      endMs = endDateObj.getTime();
    }
  }

  // 2) Convert playerIds query param into an array of IDs
  let playerIdArray = [];
  if (playerIds) {
    if (Array.isArray(playerIds)) {
      playerIdArray = playerIds;
    } else {
      // If it's a comma-separated string
      playerIdArray = playerIds.split(',');
    }
  }
  if (!playerIdArray.length) {
    return res.status(200).json([]);
  }

  // 3) Find all sessions in the date range for this user
  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs }
  });
  if (!sessionsInRange.length) {
    // No sessions found => return 0 for each player
    const zeroResults = await Player.find({ _id: { $in: playerIdArray } });
    const response = zeroResults.map(p => ({
      playerName: p.name,
      numberSessions: 0
    }));
    return res.status(200).json(response);
  }

  // 4) Extract session IDs
  const sessionIds = sessionsInRange.map(s => s._id);

  // 5) Look up SessionPlayerData docs that match these sessionIds AND these players
  const spdDocs = await SessionPlayerData.find({
    sessionId: { $in: sessionIds },
    playerId: { $in: playerIdArray.map(id => new mongoose.Types.ObjectId(id)) },
  });

  // 6) Group by playerId => set of sessionIds => count
  const playerSessionMap = {};
  spdDocs.forEach(doc => {
    const pId = doc.playerId.toString();
    if (!playerSessionMap[pId]) {
      playerSessionMap[pId] = new Set();
    }
    playerSessionMap[pId].add(doc.sessionId.toString());
  });

  // 7) For each requested player, get the # of sessions from the set
  const results = [];
  for (const pId of playerIdArray) {
    const pDoc = await Player.findById(pId);
    if (!pDoc) continue; // skip if not found
    const setOfSessions = playerSessionMap[pId] || new Set();
    results.push({
      playerName: pDoc.name,
      numberSessions: setOfSessions.size,
    });
  }

  // 8) (Optional) Additional grouping logic can be implemented if grouping !== 'none'

  res.status(200).json(results);
});

/**
 * POST /api/forcevelocity/runAnalysis
 * Invokes a local Python script with an input value provided by the client,
 * then saves the analysis result to the database.
 *
 * Expects JSON body:
 * {
 *   analysisValue: string|number,
 *   startDate: string (e.g. '2025-03-17'),
 *   endDate: string   (e.g. '2025-03-21'),
 *   grouping: string  ('none','day','week','month'),
 *   playerIds: array of IDs
 * }
 * Returns: the created ForceVelocityAnalysis document.
 */
export const runForceVelocityAnalysis = asyncHandler(async (req, res) => {
  const { analysisValue, startDate, endDate, grouping, playerIds } = req.body;

  if (!analysisValue) {
    res.status(400);
    throw new Error('analysisValue is required');
  }
  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('startDate and endDate are required');
  }

  // Convert the dates to numeric timestamps
  let startMs = new Date(startDate).getTime();
  let endMs   = new Date(endDate).getTime();

  // ==========================
  // 1) SHIFT DATES IF grouping='week'
  // ==========================
  if (grouping === 'week') {
    // Convert timestamps to Date objects
    const startDateObj = new Date(startMs);
    const endDateObj   = new Date(endMs);

    // a) SHIFT START TO PREVIOUS SUNDAY
    // Sunday has getDay() = 0
    const startDay = startDateObj.getDay(); 
    if (startDay !== 0) {
      // If startDay is 1 (Monday), this subtracts 1 day => Sunday
      // If startDay is 2 (Tuesday), subtract 2 days => Sunday, etc.
      startDateObj.setDate(startDateObj.getDate() - startDay);
    }

    // b) SHIFT END TO FOLLOWING SATURDAY
    // Saturday has getDay() = 6
    const endDay = endDateObj.getDay();
    if (endDay !== 6) {
      // If endDay is 5 (Friday), we add 1 => Saturday
      // If endDay is 4 (Thursday), we add 2 => Saturday, etc.
      endDateObj.setDate(endDateObj.getDate() + (6 - endDay));
    }

    // Convert back to timestamps
    startMs = startDateObj.getTime();
    endMs   = endDateObj.getTime();
  }

  // ==========================
  // 2) RUN PYTHON SCRIPT
  // ==========================
  const scriptPath = path.join(__dirname, '..', 'python', 'TestPython.py');
  console.log('Running Python script at:', scriptPath);

  const runPythonScript = () =>
    new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [scriptPath, analysisValue]);

      let scriptOutput = '';
      let scriptError = '';

      pythonProcess.stdout.on('data', (data) => {
        scriptOutput += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        scriptError += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(scriptError));
        }
        resolve(scriptOutput);
      });
    });

  let output;
  try {
    output = await runPythonScript();
  } catch (err) {
    console.error('Python script error:', err.message);
    return res
      .status(500)
      .json({ message: 'Python script failed', scriptError: err.message });
  }

  let parsed;
  try {
    parsed = JSON.parse(output.trim());
  } catch (err) {
    console.error('Failed to parse Python output:', output);
    return res
      .status(500)
      .json({ message: 'Invalid JSON from Python', scriptOutput: output });
  }

  // ==========================
  // 3) BUILD & SAVE ANALYSIS DOC
  // ==========================
  // Convert the playerIds to a doc array
  const playerArray = await Promise.all(
    (playerIds || []).map(async (id) => {
      const p = await Player.findById(id);
      return p ? { playerId: p._id, name: p.name } : null;
    })
  );
  const filteredPlayers = playerArray.filter(Boolean);

  // Create & save the analysis doc
  const analysisDoc = await ForceVelocityAnalysis.create({
    userId: req.user._id,
    sessions: [], // Optionally add session details if needed
    player: filteredPlayers,
    grouped: grouping,
    number: 0,
    startDate: startMs,
    endDate: endMs,
    maxAccel: parsed.MaxAccel,
    maxSpeed: parsed.MaxSpeed,
  });

  return res.status(200).json(analysisDoc);
});
