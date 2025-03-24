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
 * Helper function:
 * If grouping = 'week', adjust the start date to the PREVIOUS Sunday
 * and the end date to the FOLLOWING Saturday.
 */
function adjustDatesForWeek(startMs, endMs) {
  const startDate = new Date(startMs); // user-chosen start
  const endDate = new Date(endMs);     // user-chosen end

  // Sunday => getDay() === 0
  // If start is not Sunday, subtract the day index to go back to Sunday
  const startDay = startDate.getDay(); // 0=Sunday,1=Mon,...6=Sat
  if (startDay !== 0) {
    startDate.setDate(startDate.getDate() - startDay);
  }

  // Saturday => getDay() === 6
  // If end is not Saturday, add (6 - endDay) days to get to Saturday
  const endDay = endDate.getDay();
  if (endDay !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDay));
  }

  return {
    adjustedStart: startDate.getTime(),
    adjustedEnd: endDate.getTime(),
  };
}

/**
 * GET /api/forcevelocity
 * Returns force-velocity data for the given date range and players.
 * Query params:
 *   startDate, endDate, playerIds, grouping
 */
export const getForceVelocityData = asyncHandler(async (req, res) => {
  const { startDate, endDate, playerIds, grouping } = req.query;

  // Convert to numeric timestamps
  let startMs = new Date(startDate).getTime();
  let endMs = new Date(endDate).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error('Invalid or missing startDate/endDate');
  }

  // If grouping = week, adjust
  if (grouping === 'week') {
    const { adjustedStart, adjustedEnd } = adjustDatesForWeek(startMs, endMs);
    startMs = adjustedStart;
    endMs = adjustedEnd;
  }

  // Convert playerIds to array
  let playerIdArray = [];
  if (playerIds) {
    if (Array.isArray(playerIds)) {
      playerIdArray = playerIds;
    } else {
      playerIdArray = playerIds.split(',');
    }
  }
  if (!playerIdArray.length) {
    // No players => return empty array
    return res.status(200).json([]);
  }

  // Find sessions in the adjusted date range
  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs },
  });
  if (!sessionsInRange.length) {
    // No sessions => return 0 for each player
    const zeroPlayers = await Player.find({ _id: { $in: playerIdArray } });
    const zeroResults = zeroPlayers.map((p) => ({
      playerName: p.name,
      numberSessions: 0,
    }));
    return res.status(200).json(zeroResults);
  }

  // Build a list of those session IDs
  const sessionIds = sessionsInRange.map((s) => s._id);

  // Find SessionPlayerData that matches these sessionIds and these players
  const spdDocs = await SessionPlayerData.find({
    sessionId: { $in: sessionIds },
    playerId: {
      $in: playerIdArray.map((id) => new mongoose.Types.ObjectId(id)),
    },
  });

  // Build a map: playerId => set of sessionIds
  const playerSessionMap = {};
  spdDocs.forEach((doc) => {
    const pId = doc.playerId.toString();
    if (!playerSessionMap[pId]) {
      playerSessionMap[pId] = new Set();
    }
    playerSessionMap[pId].add(doc.sessionId.toString());
  });

  // Build final array
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

  res.status(200).json(results);
});

/**
 * POST /api/forcevelocity/runAnalysis
 * Expects JSON body:
 *   {
 *     analysisValue: string|number,
 *     startDate: string (ISO or 'YYYY-MM-DD'),
 *     endDate: string,
 *     grouping: 'none'|'day'|'week'|'month',
 *     playerIds: array of player IDs
 *   }
 * Steps:
 *   1) Adjust start/end if grouping=week
 *   2) Spawn local Python script with analysisValue
 *   3) Parse result => {MaxSpeed, MaxAccel}
 *   4) Find sessions in that range => build sessions array
 *   5) Build player array
 *   6) Save ForceVelocityAnalysis doc => store maxSpeed, maxAccel, # sessions, etc.
 *   7) Return doc
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

  // Convert to ms
  let startMs = new Date(startDate).getTime();
  let endMs = new Date(endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error('Invalid startDate/endDate format');
  }

  // If grouping=week => adjust
  if (grouping === 'week') {
    const { adjustedStart, adjustedEnd } = adjustDatesForWeek(startMs, endMs);
    startMs = adjustedStart;
    endMs = adjustedEnd;
  }

  // Build path to Python script
  const scriptPath = path.join(__dirname, '..', 'python', 'TestPython.py');
  console.log('Running Python script at:', scriptPath);

  // Helper to run python
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
    parsed = JSON.parse(output.trim()); // e.g. { MaxSpeed: 10, MaxAccel: 40 }
  } catch (err) {
    console.error('Failed to parse Python output:', output);
    return res
      .status(500)
      .json({ message: 'Invalid JSON from Python', scriptOutput: output });
  }

  // Find sessions in the final adjusted date range
  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs },
  });
  const sessionsArray = sessionsInRange.map((s) => ({
    sessionId: s._id,
    sessionName: s.sessionName || 'Unknown Session',
  }));
  const sessionCount = sessionsArray.length;

  // Build array of players
  const playerArray = await Promise.all(
    (playerIds || []).map(async (id) => {
      const p = await Player.findById(id);
      return p ? { playerId: p._id, name: p.name } : null;
    })
  );
  const filteredPlayers = playerArray.filter(Boolean);

  // Save ForceVelocityAnalysis doc
  const analysisDoc = await ForceVelocityAnalysis.create({
    userId: req.user._id,
    sessions: sessionsArray,
    player: filteredPlayers,
    grouped: grouping,
    number: sessionCount,
    startDate: startMs,
    endDate: endMs,
    maxAccel: parsed.MaxAccel,
    maxSpeed: parsed.MaxSpeed,
  });

  res.status(200).json(analysisDoc);
});
