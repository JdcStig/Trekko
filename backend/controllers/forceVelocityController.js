// file: controllers/forceVelocityController.js

import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url'; // for ESM if needed
import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js';

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
  const startMs = new Date(startDate).getTime();
  const endMs   = new Date(endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error("Invalid or missing startDate/endDate");
  }

  // 2) Convert playerIds to an array of IDs
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
    date: { $gte: startMs, $lte: endMs },
  });
  if (!sessionsInRange.length) {
    // No sessions found: return 0 for each player
    const zeroResults = await Player.find({ _id: { $in: playerIdArray } });
    const response = zeroResults.map((p) => ({
      playerName: p.name,
      numberSessions: 0,
    }));
    return res.status(200).json(response);
  }

  // 4) Extract session IDs
  const sessionIds = sessionsInRange.map((s) => s._id);

  // 5) Find SessionPlayerData docs matching these sessions and players
  const spdDocs = await SessionPlayerData.find({
    sessionId: { $in: sessionIds },
    playerId: { $in: playerIdArray.map((id) => new mongoose.Types.ObjectId(id)) },
  });

  // 6) Build a map: playerId -> Set of sessionIds
  const playerSessionMap = {};
  spdDocs.forEach((doc) => {
    const pId = doc.playerId.toString();
    if (!playerSessionMap[pId]) {
      playerSessionMap[pId] = new Set();
    }
    playerSessionMap[pId].add(doc.sessionId.toString());
  });

  // 7) Build response for each requested player
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

  // 8) (Optional) Additional grouping logic if grouping !== 'none'
  // For now, we ignore it.

  res.status(200).json(results);
});

/**
 * POST /api/forcevelocity/runAnalysis
 * Invokes a local Python script with an input value provided by the client.
 * Expects JSON body: { analysisValue: string|number }
 * Returns the Python script's output as JSON, e.g. { "MaxSpeed": X, "MaxAccel": Y }
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runForceVelocityAnalysis = asyncHandler(async (req, res) => {
  const { analysisValue } = req.body;
  if (!analysisValue) {
    res.status(400);
    throw new Error('analysisValue is required');
  }

  // Construct an absolute path to your Python script
  // Adjust if your script is in a different folder, e.g. "backend/python/TestPython.py"
  const scriptPath = path.join(__dirname, '..', 'python', 'TestPython.py');
  console.log('Running Python script at:', scriptPath);

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
      console.error('Python script error:', scriptError);
      return res.status(500).json({ message: 'Python script failed', scriptError });
    }

    try {
      const parsed = JSON.parse(scriptOutput.trim());
      return res.status(200).json(parsed);
    } catch (err) {
      console.error('Failed to parse Python output:', scriptOutput);
      return res.status(500).json({ message: 'Invalid JSON from Python', scriptOutput });
    }
  });
});
