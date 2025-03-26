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
 * For week grouping, adjust overall start to the previous Sunday at 00:00:00
 * and overall end to the following Saturday at 23:59:59.
 */
function adjustDatesForWeek(startMs, endMs) {
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);

  // Adjust startDate to previous Sunday at 00:00:00
  const startDay = startDate.getDay();
  if (startDay !== 0) {
    startDate.setDate(startDate.getDate() - startDay);
  }
  startDate.setHours(0, 0, 0, 0);

  // Adjust endDate to next Saturday at 23:59:59
  const endDay = endDate.getDay();
  if (endDay !== 6) {
    endDate.setDate(endDate.getDate() + (6 - endDay));
  }
  endDate.setHours(23, 59, 59, 0);

  return {
    adjustedStart: startDate.getTime(),
    adjustedEnd: endDate.getTime(),
  };
}

export const getForceVelocityData = asyncHandler(async (req, res) => {
  const { startDate, endDate, playerIds, grouping } = req.query;

  let startMs = new Date(startDate).getTime(); //Converts the dates to numeric timestamps
  let endMs = new Date(endDate).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error('Invalid or missing startDate/endDate');
  }

  if (grouping === 'week') {
    const { adjustedStart, adjustedEnd } = adjustDatesForWeek(startMs, endMs);
    startMs = adjustedStart;
    endMs = adjustedEnd;
  }

  //gets all the player ids in an array else returns nothing
  let playerIdArray = [];
  if (playerIds) {
    playerIdArray = Array.isArray(playerIds) ? playerIds : playerIds.split(',');
  }
  if (!playerIdArray.length) {
    return res.status(200).json([]);
  }

  //returns all the sessions in the range of the start and end date
  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs },
  });

  //If no sessions are found in the date range, the code fetches each player’s info and returns a count of zero sessions for each
  if (!sessionsInRange.length) {
    const zeroPlayers = await Player.find({ _id: { $in: playerIdArray } });
    const zeroResults = zeroPlayers.map((p) => ({
      playerName: p.name,
      numberSessions: 0,
    }));
    return res.status(200).json(zeroResults);
  }

  //Retrieves all documents from the SessionPlayerData collection that match these session IDs and the selected players
  const sessionIds = sessionsInRange.map((s) => s._id);
  const spdDocs = await SessionPlayerData.find({
    sessionId: { $in: sessionIds },
    playerId: { $in: playerIdArray.map((id) => new mongoose.Types.ObjectId(id)) },
  });

  //Constructs a map where each key is a player ID and the value is a set of session IDs in which that player appears , helps find number of sessions per player
  const playerSessionMap = {};
  spdDocs.forEach((doc) => {
    const pId = doc.playerId.toString();
    if (!playerSessionMap[pId]) {
      playerSessionMap[pId] = new Set();
    }
    playerSessionMap[pId].add(doc.sessionId.toString());
  });

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
  //For each player ID, fetch the player document and count how many sessions they participated in using the map. Then, add that info to the results array.

  res.status(200).json(results);
});

//Reads startDate, endDate, grouping, and playerIds from the request body. Converts dates to timestamps
export const runForceVelocityAnalysis = asyncHandler(async (req, res) => {
  const { startDate, endDate, grouping, playerIds } = req.body;

  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('startDate and endDate are required');
  }

  let startMs = new Date(startDate).getTime();
  let endMs = new Date(endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error('Invalid startDate/endDate format');
  }

  // For week grouping, adjust overall range to Sunday-Saturday.
  if (grouping === 'week') {
    const { adjustedStart, adjustedEnd } = adjustDatesForWeek(startMs, endMs);
    startMs = adjustedStart;
    endMs = adjustedEnd;
  }

  //Retrieves sessions in the overall range for the user. If none exist, returns early.
  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs },
  });
  if (!sessionsInRange.length) {
    return res.status(200).json({ message: 'No sessions in range', docs: [] });
  }

  //Ensures that playerIds is an array and separates it using commas
  let playerIdArray = [];
  if (playerIds) {
    playerIdArray = Array.isArray(playerIds) ? playerIds : playerIds.split(',');
  }

  //Defines a function runPythonScript that spawns a child process to run the Python script.
  const scriptPath = path.join(__dirname, '..', 'python', 'TestPython.py'); //constructs the path to the Python file
  const runPythonScript = (dataObj) =>
    new Promise((resolve, reject) => {
     
    const jsonPayload = JSON.stringify({ data: dataObj });
    const sizeMB = Buffer.byteLength(jsonPayload, 'utf8') / (1024 * 1024);
    console.log("Payload size: " + sizeMB.toFixed(2) + " MB");
      
      const pythonProcess = spawn('python', [scriptPath]); //It spawns a process running the Python interpreter
      let scriptOutput = '';
      let scriptError = '';

      //listens to stdout and stderr to capture the output.
      pythonProcess.stdout.on('data', (data) => {
        scriptOutput += data.toString();
      });
      pythonProcess.stderr.on('data', (data) => {
        scriptError += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(scriptError || `Python exited with code ${code}`));
        }
        resolve(scriptOutput);
      });

      // creates a JSON string from the data object and writes it to the stdin of the Python process.
      pythonProcess.stdin.write(JSON.stringify({ data: dataObj }));
      pythonProcess.stdin.end();
    });

  const analysisDocs = [];

  if (grouping === 'day') {
    // Group sessions by day (bucket key is midnight timestamp).
    const dayMap = {};
    sessionsInRange.forEach((session) => {
      const d = new Date(session.date);
      d.setHours(0, 0, 0, 0);
      const dayKey = d.getTime();
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = [];
      }
      dayMap[dayKey].push(session);
    });

    // Generate all day buckets between startMs and endMs (inclusive)
    const dayBuckets = [];
    let currentDay = new Date(startMs);
    currentDay.setHours(0, 0, 0, 0);
    const endDay = new Date(endMs);
    endDay.setHours(0, 0, 0, 0);
    while (currentDay.getTime() <= endDay.getTime()) {
      dayBuckets.push(currentDay.getTime());
      currentDay.setDate(currentDay.getDate() + 1);
    }

    // For each day bucket, process each player.
    for (const dayTs of dayBuckets) {
      // Get sessions for this day bucket; if none exist, use empty array.
      const daySessions = dayMap[dayTs] || [];
      const daySessionIds = daySessions.map((s) => s._id);

      // Process each player separately.
      for (const playerId of playerIdArray) {
        // Get the SPD docs for this player in this day bucket.
        const spdDocs = await SessionPlayerData.find({
          sessionId: { $in: daySessionIds },
          playerId: new mongoose.Types.ObjectId(playerId),
        });

        // Creates an array of objects containing the player's speeds. If the player did not appear, returns an empty array.
        const pythonPayloadData = spdDocs.map((doc) => ({
          playerId: doc.playerId.toString(),
          playerName: doc.playerName,
          speeds: doc.speeds || [],
        }));

        // Calculate total number of speed values across all objects in the payload.
        const totalSpeedValues = pythonPayloadData.reduce(
          (acc, item) => acc + (Array.isArray(item.speeds) ? item.speeds.length : 0),
          0
        );
        // Log the size of the payload being sent into Python.
        console.log("Day grouping: sending " + totalSpeedValues + " speed values from " + pythonPayloadData.length + " objects to Python.");

        let parsed;
        if (pythonPayloadData.length === 0) {
          parsed = { maxAccel: 0, globalMaxSpeed: 0 };
        } else {
          let output;
          try {
            output = await runPythonScript(pythonPayloadData);
          } catch (err) {
            console.error('Python script error (day grouping):', err);
            parsed = { maxAccel: 0, globalMaxSpeed: 0 };
          }
          try {
            parsed = JSON.parse(output.trim());
          } catch (err) {
            console.error('Failed to parse Python output (day grouping):', output);
            parsed = { maxAccel: 0, globalMaxSpeed: 0 };
          }
        }
        // Only include sessions where the player was present.
        const sessionsArray = daySessions.filter((s) =>
          spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
        ).map((s) => ({
          sessionId: s._id,
          sessionName: s.sessionName || 'Unknown Session',
        }));
        const pDoc = await Player.findById(playerId);
        const playerObj = pDoc ? { playerId: pDoc._id, name: pDoc.name } : { playerId, name: 'Unknown Player' };

        // A new ForceVelocityAnalysis document is created for that player on that day,
        // The document is added to the analysisDocs array.
        const dayAnalysisDoc = await ForceVelocityAnalysis.create({
          userId: req.user._id,
          sessions: sessionsArray,
          player: [playerObj],
          grouped: 'day',
          number: sessionsArray.length,
          startDate: dayTs,
          endDate: dayTs, // You may add 86400000 if you want an end timestamp for the day.
          maxAccel: parsed.maxAccel || 0,
          maxSpeed: parsed.globalMaxSpeed || 0,
        });
        analysisDocs.push(dayAnalysisDoc);
      }
    }
    return res.status(200).json({ message: 'Success - daily grouping', docs: analysisDocs });
  } else if (grouping === 'week') {
    // Group sessions by week.
    // Compute week buckets (each bucket starts on Sunday at 00:00:00).
    const weekBuckets = [];
    for (let t = startMs; t <= endMs; t += 7 * 24 * 60 * 60 * 1000) {
      weekBuckets.push(t);
    }
    // Group sessions by their week start.
    const weekMap = {};
    sessionsInRange.forEach((session) => {
      const d = new Date(session.date);
      d.setHours(0, 0, 0, 0);
      const dayIndex = d.getDay(); // Sunday = 0
      d.setDate(d.getDate() - dayIndex);
      const weekStart = d.getTime();
      if (!weekMap[weekStart]) {
        weekMap[weekStart] = [];
      }
      weekMap[weekStart].push(session);
    });
    // Ensure each week bucket is present.
    weekBuckets.forEach((bucket) => {
      if (!weekMap[bucket]) {
        weekMap[bucket] = [];
      }
    });

    for (const [weekStartStr, weekSessions] of Object.entries(weekMap)) {
      const weekStart = parseInt(weekStartStr, 10);
      // Compute weekEnd as Saturday 23:59:59.
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      weekEndDate.setHours(23, 59, 59, 0);
      const weekEnd = weekEndDate.getTime();

      const weekSessionIds = weekSessions.map((s) => s._id);
      // Process each player separately.
      for (const playerId of playerIdArray) {
        const spdDocs = await SessionPlayerData.find({
          sessionId: { $in: weekSessionIds },
          playerId: new mongoose.Types.ObjectId(playerId),
        });
        const pythonPayloadData = spdDocs.map((doc) => ({
          playerId: doc.playerId.toString(),
          playerName: doc.playerName,
          speeds: doc.speeds || [],
        }));

        // Calculate total number of speed values across all objects in the payload.
        const totalSpeedValues = pythonPayloadData.reduce(
          (acc, item) => acc + (Array.isArray(item.speeds) ? item.speeds.length : 0),
          0
        );
        // Log the size of the array being sent into Python
        console.log("Week grouping: sending " + totalSpeedValues + " speed values from " + pythonPayloadData.length + " objects to Python.");

        let parsed;
        if (pythonPayloadData.length === 0) {
          parsed = { maxAccel: 0, globalMaxSpeed: 0 };
        } else {
          let output;
          try {
            output = await runPythonScript(pythonPayloadData);
          } catch (err) {
            console.error('Python script error (week grouping):', err);
            parsed = { maxAccel: 0, globalMaxSpeed: 0 };
          }
          try {
            parsed = JSON.parse(output.trim());
          } catch (err) {
            console.error('Failed to parse Python output (week grouping):', output);
            parsed = { maxAccel: 0, globalMaxSpeed: 0 };
          }
        }
        const sessionsArray = weekSessions.filter((s) =>
          spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
        ).map((s) => ({
          sessionId: s._id,
          sessionName: s.sessionName || 'Unknown Session',
        }));
        const pDoc = await Player.findById(playerId);
        const playerObj = pDoc ? { playerId: pDoc._id, name: pDoc.name } : { playerId, name: 'Unknown Player' };

        const weekAnalysisDoc = await ForceVelocityAnalysis.create({
          userId: req.user._id,
          sessions: sessionsArray,
          player: [playerObj],
          grouped: 'week',
          number: sessionsArray.length,
          startDate: weekStart,
          endDate: weekEnd,
          maxAccel: parsed.maxAccel || 0,
          maxSpeed: parsed.globalMaxSpeed || 0,
        });
        analysisDocs.push(weekAnalysisDoc);
      }
    }
    return res.status(200).json({ message: 'Success - weekly grouping', docs: analysisDocs });
  } else {
    // Fallback: process the entire range as one bucket per player.
    const allSessionIds = sessionsInRange.map((s) => s._id);
    for (const playerId of playerIdArray) {
      const spdDocs = await SessionPlayerData.find({
        sessionId: { $in: allSessionIds },
        playerId: new mongoose.Types.ObjectId(playerId),
      });
      const pythonPayloadData = spdDocs.map((doc) => ({
        playerId: doc.playerId.toString(),
        playerName: doc.playerName,
        speeds: doc.speeds || [],
      }));

      // Calculate total number of speed values across the payload.
      const totalSpeedValues = pythonPayloadData.reduce(
        (acc, item) => acc + (Array.isArray(item.speeds) ? item.speeds.length : 0),
        0
      );
      console.log("Fallback grouping: sending " + totalSpeedValues + " speed values from " + pythonPayloadData.length + " objects to Python.");

      let parsed;
      if (pythonPayloadData.length === 0) {
        parsed = { maxAccel: 0, globalMaxSpeed: 0 };
      } else {
        let output;
        try {
          output = await runPythonScript(pythonPayloadData);
        } catch (err) {
          console.error('Python script error (fallback):', err);
          parsed = { maxAccel: 0, globalMaxSpeed: 0 };
        }
        try {
          parsed = JSON.parse(output.trim());
        } catch (err) {
          console.error('Failed to parse Python output (fallback):', output);
          parsed = { maxAccel: 0, globalMaxSpeed: 0 };
        }
      }
      const sessionsArray = sessionsInRange.filter((s) =>
        spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
      ).map((s) => ({
        sessionId: s._id,
        sessionName: s.sessionName || 'Unknown Session',
      }));
      const pDoc = await Player.findById(playerId);
      const playerObj = pDoc ? { playerId: pDoc._id, name: pDoc.name } : { playerId, name: 'Unknown Player' };

      const analysisDoc = await ForceVelocityAnalysis.create({
        userId: req.user._id,
        sessions: sessionsArray,
        player: [playerObj],
        grouped: grouping || 'none',
        number: sessionsArray.length,
        startDate: startMs,
        endDate: endMs,
        maxAccel: parsed.maxAccel || 0,
        maxSpeed: parsed.globalMaxSpeed || 0,
      });
      analysisDocs.push(analysisDoc);
    }
    return res.status(200).json({ message: `Success - grouping=${grouping}`, docs: analysisDocs });
  }
});
