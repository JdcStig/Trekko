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
  const { startDate, endDate, playerIds, grouping } = req.query;
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error('Invalid or missing startDate/endDate');
  }

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

  // Find all sessions in the date range for this user
  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs },
  });
  if (!sessionsInRange.length) {
    // No sessions found => return 0 for each player
    const zeroResults = await Player.find({ _id: { $in: playerIdArray } });
    const response = zeroResults.map((p) => ({
      playerName: p.name,
      numberSessions: 0,
    }));
    return res.status(200).json(response);
  }

  const sessionIds = sessionsInRange.map((s) => s._id);

  // Find SessionPlayerData docs matching these sessions + players
  const spdDocs = await SessionPlayerData.find({
    sessionId: { $in: sessionIds },
    playerId: {
      $in: playerIdArray.map((id) => new mongoose.Types.ObjectId(id)),
    },
  });

  // Build a map: playerId -> Set of sessionIds
  const playerSessionMap = {};
  spdDocs.forEach((doc) => {
    const pId = doc.playerId.toString();
    if (!playerSessionMap[pId]) {
      playerSessionMap[pId] = new Set();
    }
    playerSessionMap[pId].add(doc.sessionId.toString());
  });

  // Build response for each requested player
  const results = [];
  for (const pId of playerIdArray) {
    const pDoc = await Player.findById(pId);
    if (!pDoc) continue;
    const setOfSessions = playerSessionMap[pId] || new Set();
    results.push({
      playerName: pDoc.name,
      numberSessions: setOfSessions.size,
    });
  }

  // (Optional) handle grouping if grouping !== 'none'
  // For now, no grouping logic implemented
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
 *   startDate: string,
 *   endDate: string,
 *   grouping: string ('none','day','week','month'),
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

  // Construct an absolute path to your Python script
  const scriptPath = path.join(__dirname, '..', 'python', 'TestPython.py');
  console.log('Running Python script at:', scriptPath);

  // Utility to spawn the script and return stdout as a string
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

  // Convert date to numeric timestamps
  const startMs = new Date(startDate).getTime();
  const endMs = new Date(endDate).getTime();

  // Build a list of players to store
  const playerArray = await Promise.all(
    (playerIds || []).map(async (id) => {
      const p = await Player.findById(id);
      return p ? { playerId: p._id, name: p.name } : null;
    })
  );
  const filteredPlayers = playerArray.filter(Boolean);

  // Save analysis result to the DB
  // Note we store `grouped: grouping` to avoid "grouped is not defined"
  const analysisDoc = await ForceVelocityAnalysis.create({
    userId: req.user._id,
    sessions: [], // Optionally fill session details if desired
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
