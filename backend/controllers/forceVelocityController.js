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

/**
 * Helper function:
 * For month grouping, adjust overall start to the first of the start month
 * and overall end to the last day of the end month (23:59:59).
 */
function adjustDatesForMonth(startMs, endMs) {
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);

  // Adjust start to first of that month at 00:00:00
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  // Move endDate to last day of that month at 23:59:59
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(0); // 0 gives last day of previous month
  endDate.setHours(23, 59, 59, 0);

  return {
    adjustedStart: startDate.getTime(),
    adjustedEnd: endDate.getTime(),
  };
}

/**
 * Helper function:
 * Compare cached session IDs with current session IDs.
 * cachedSessions is an array of objects { sessionId, sessionName }
 * currentSessionIds is an array of sessionId strings.
 */
function areSessionIdsEqual(cachedSessions, currentSessionIds) {
  const cachedIds = cachedSessions.map(s => s.sessionId.toString()).sort();
  const newIds = currentSessionIds.slice().sort();
  return cachedIds.join(',') === newIds.join(',');
}

export const getForceVelocityData = asyncHandler(async (req, res) => {
  const { startDate, endDate, playerIds, grouping } = req.query;

  let startMs = new Date(startDate).getTime();
  let endMs = new Date(endDate).getTime();

  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error('Invalid or missing startDate/endDate');
  }

  if (grouping === 'week') {
    const { adjustedStart, adjustedEnd } = adjustDatesForWeek(startMs, endMs);
    startMs = adjustedStart;
    endMs = adjustedEnd;
  } else if (grouping === 'month') {
    const { adjustedStart, adjustedEnd } = adjustDatesForMonth(startMs, endMs);
    startMs = adjustedStart;
    endMs = adjustedEnd;
  }

  // Get player IDs
  let playerIdArray = [];
  if (playerIds) {
    playerIdArray = Array.isArray(playerIds) ? playerIds : playerIds.split(',');
  }
  if (!playerIdArray.length) {
    return res.status(200).json([]);
  }

  // Find sessions in range for the current user
  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs },
  });

  if (!sessionsInRange.length) {
    const zeroPlayers = await Player.find({ _id: { $in: playerIdArray } });
    const zeroResults = zeroPlayers.map((p) => ({
      playerName: p.name,
      numberSessions: 0,
    }));
    return res.status(200).json(zeroResults);
  }

  const sessionIds = sessionsInRange.map((s) => s._id);
  const spdDocs = await SessionPlayerData.find({
    sessionId: { $in: sessionIds },
    playerId: { $in: playerIdArray.map((id) => new mongoose.Types.ObjectId(id)) },
  });

  // Build a map: key = player, value = set of sessionIDs
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
  res.status(200).json(results);
});

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

  if (grouping === 'week') {
    const { adjustedStart, adjustedEnd } = adjustDatesForWeek(startMs, endMs);
    startMs = adjustedStart;
    endMs = adjustedEnd;
  } else if (grouping === 'month') {
    const { adjustedStart, adjustedEnd } = adjustDatesForMonth(startMs, endMs);
    startMs = adjustedStart;
    endMs = adjustedEnd;
  }

  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs },
  });
  if (!sessionsInRange.length) {
    return res.status(200).json({ message: 'No sessions in range', docs: [] });
  }

  let playerIdArray = [];
  if (playerIds) {
    playerIdArray = Array.isArray(playerIds) ? playerIds : playerIds.split(',');
  }

  // Helper to run the Python script
  const fileURL = fileURLToPath(import.meta.url);
  const dirName = path.dirname(fileURL);
  const scriptPath = path.join(dirName, '..', 'python', 'TestPython.py');

  // Updated to spawn 'python3' and improved logging
  const runPythonScript = (dataObj) =>
    new Promise((resolve, reject) => {
      const jsonPayload = JSON.stringify({ data: dataObj });
      const sizeMB = Buffer.byteLength(jsonPayload, 'utf8') / (1024 * 1024);
      console.log('Payload size: ' + sizeMB.toFixed(2) + ' MB');

      // Use python3; change this if your environment uses a different command
      const pythonProcess = spawn('python3', [scriptPath]);

      let scriptOutput = '';
      let scriptError = '';

      pythonProcess.stdout.on('data', (data) => {
        scriptOutput += data.toString();
      });
      pythonProcess.stderr.on('data', (data) => {
        scriptError += data.toString();
        console.error('Python stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python process exited with code ${code}`);
          return reject(new Error(scriptError || `Python exited with code ${code}`));
        }
        console.log('Raw Python output:', scriptOutput);
        try {
          const parsedOutput = JSON.parse(scriptOutput.trim());
          console.log('Parsed Python output:', parsedOutput);
          resolve(scriptOutput);
        } catch (e) {
          console.error('Error parsing Python output:', scriptOutput);
          reject(new Error('Failed to parse Python output: ' + scriptOutput));
        }
      });

      const payloadObj = {
        Sessions: dataObj.map((session, index) => ({ ...session, idx: index })),
      };
      pythonProcess.stdin.write(JSON.stringify(payloadObj));
      pythonProcess.stdin.end();
    });

  const analysisDocs = [];

  // -----------------------------------
  // 1) Day grouping
  // -----------------------------------
  if (grouping === 'day') {
    // Build dayMap
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

    // Build dayBuckets
    const dayBuckets = [];
    let currentDay = new Date(startMs);
    currentDay.setHours(0, 0, 0, 0);
    const endDay = new Date(endMs);
    endDay.setHours(0, 0, 0, 0);
    while (currentDay.getTime() <= endDay.getTime()) {
      dayBuckets.push(currentDay.getTime());
      currentDay.setDate(currentDay.getDate() + 1);
    }

    for (const dayTs of dayBuckets) {
      const daySessions = dayMap[dayTs] || [];
      const daySessionIds = daySessions.map((s) => s._id);

      for (const playerId of playerIdArray) {
        // Get current session IDs for this player (sessions with associated SessionPlayerData)
        const spdDocs = await SessionPlayerData.find({
          sessionId: { $in: daySessionIds },
          playerId: new mongoose.Types.ObjectId(playerId),
        });
        const currentSessionIds = daySessions
          .filter((s) =>
            spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
          )
          .map((s) => s._id.toString());

        // Check caching including userId verification
        const existingDoc = await ForceVelocityAnalysis.findOne({
          userId: req.user._id,
          grouped: 'day',
          startDate: dayTs,
          endDate: dayTs,
          'player.playerId': playerId,
        });
        if (
          existingDoc &&
          existingDoc.userId.toString() === req.user._id.toString() &&
          areSessionIdsEqual(existingDoc.sessions, currentSessionIds)
        ) {
          console.log(`Cached calculation is up-to-date for player ${playerId} on day ${dayTs}`);
          analysisDocs.push(existingDoc);
          continue;
        } else if (existingDoc) {
          console.log(`User mismatch or session list changed for player ${playerId} on day ${dayTs}, recalculating...`);
        }

        // Build python payload
        const pythonPayloadData = spdDocs.map((doc) => ({
          playerId: doc.playerId.toString(),
          playerName: doc.playerName,
          SpeedData: doc.speeds || [],
        }));

        let parsed;
        if (pythonPayloadData.length === 0) {
          parsed = { MaxAccel: 0, MaxSpeed: 0 };
        } else {
          try {
            const output = await runPythonScript(pythonPayloadData);
            parsed = JSON.parse(output.trim());
          } catch (err) {
            console.error('Python error day grouping:', err);
            parsed = { MaxAccel: 0, MaxSpeed: 0 };
          }
        }

        const sessionsArray = daySessions
          .filter((s) =>
            spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
          )
          .map((s) => ({
            sessionId: s._id,
            sessionName: s.sessionName || 'Unknown Session',
          }));
        const pDoc = await Player.findById(playerId);
        const playerObj = pDoc
          ? { playerId: pDoc._id, name: pDoc.name }
          : { playerId, name: 'Unknown Player' };

        if (existingDoc) {
          existingDoc.sessions = sessionsArray;
          existingDoc.number = sessionsArray.length;
          existingDoc.maxAccel = parsed.MaxAccel;
          existingDoc.maxSpeed = parsed.MaxSpeed;
          await existingDoc.save();
          analysisDocs.push(existingDoc);
        } else {
          const newDoc = await ForceVelocityAnalysis.create({
            userId: req.user._id,
            sessions: sessionsArray,
            player: [playerObj],
            grouped: 'day',
            number: sessionsArray.length,
            startDate: dayTs,
            endDate: dayTs,
            maxAccel: parsed.MaxAccel,
            maxSpeed: parsed.MaxSpeed,
          });
          analysisDocs.push(newDoc);
        }
      }
    }
    return res.status(200).json({ message: 'Success - daily grouping', docs: analysisDocs });
  }

  // -----------------------------------
  // 2) Week grouping
  // -----------------------------------
  else if (grouping === 'week') {
    // Build week buckets
    const weekBuckets = [];
    for (let t = startMs; t <= endMs; t += 7 * 24 * 60 * 60 * 1000) {
      weekBuckets.push(t);
    }
    // Build weekMap
    const weekMap = {};
    sessionsInRange.forEach((session) => {
      const d = new Date(session.date);
      d.setHours(0, 0, 0, 0);
      const dayIndex = d.getDay();
      d.setDate(d.getDate() - dayIndex);
      const weekStart = d.getTime();
      if (!weekMap[weekStart]) {
        weekMap[weekStart] = [];
      }
      weekMap[weekStart].push(session);
    });
    weekBuckets.forEach((bucket) => {
      if (!weekMap[bucket]) {
        weekMap[bucket] = [];
      }
    });

    for (const [weekStartStr, weekSessions] of Object.entries(weekMap)) {
      const weekStart = parseInt(weekStartStr, 10);
      const weekEndDate = new Date(weekStart);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      weekEndDate.setHours(23, 59, 59, 0);
      const weekEnd = weekEndDate.getTime();

      const weekSessionIds = weekSessions.map((s) => s._id);

      for (const playerId of playerIdArray) {
        // Get current session IDs for this player
        const spdDocs = await SessionPlayerData.find({
          sessionId: { $in: weekSessionIds },
          playerId: new mongoose.Types.ObjectId(playerId),
        });
        const currentSessionIds = weekSessions
          .filter((s) =>
            spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
          )
          .map((s) => s._id.toString());

        const existingDoc = await ForceVelocityAnalysis.findOne({
          userId: req.user._id,
          grouped: 'week',
          startDate: weekStart,
          endDate: weekEnd,
          'player.playerId': playerId,
        });
        if (
          existingDoc &&
          existingDoc.userId.toString() === req.user._id.toString() &&
          areSessionIdsEqual(existingDoc.sessions, currentSessionIds)
        ) {
          console.log(`Cached week analysis is up-to-date for player ${playerId} => weekStart=${weekStart}`);
          analysisDocs.push(existingDoc);
          continue;
        } else if (existingDoc) {
          console.log(`User mismatch or session list changed for player ${playerId} => weekStart=${weekStart}, recalculating...`);
        }

        const pythonPayloadData = spdDocs.map((doc) => ({
          playerId: doc.playerId.toString(),
          playerName: doc.playerName,
          SpeedData: doc.speeds || [],
        }));

        let parsed;
        if (pythonPayloadData.length === 0) {
          parsed = { MaxAccel: 0, MaxSpeed: 0 };
        } else {
          try {
            const output = await runPythonScript(pythonPayloadData);
            parsed = JSON.parse(output.trim());
          } catch (err) {
            console.error('Python error week grouping:', err);
            parsed = { MaxAccel: 0, MaxSpeed: 0 };
          }
        }

        const sessionsArray = weekSessions
          .filter((s) =>
            spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
          )
          .map((s) => ({
            sessionId: s._id,
            sessionName: s.sessionName || 'Unknown Session',
          }));

        const pDoc = await Player.findById(playerId);
        const playerObj = pDoc
          ? { playerId: pDoc._id, name: pDoc.name }
          : { playerId, name: 'Unknown Player' };

        if (existingDoc) {
          existingDoc.sessions = sessionsArray;
          existingDoc.number = sessionsArray.length;
          existingDoc.maxAccel = parsed.MaxAccel;
          existingDoc.maxSpeed = parsed.MaxSpeed;
          await existingDoc.save();
          analysisDocs.push(existingDoc);
        } else {
          const newDoc = await ForceVelocityAnalysis.create({
            userId: req.user._id,
            sessions: sessionsArray,
            player: [playerObj],
            grouped: 'week',
            number: sessionsArray.length,
            startDate: weekStart,
            endDate: weekEnd,
            maxAccel: parsed.MaxAccel,
            maxSpeed: parsed.MaxSpeed,
          });
          analysisDocs.push(newDoc);
        }
      }
    }
    return res.status(200).json({ message: 'Success - weekly grouping', docs: analysisDocs });
  }

  // -----------------------------------
  // 3) Month grouping
  // -----------------------------------
  else if (grouping === 'month') {
    // Build month buckets from startMs to endMs in 1-month increments
    const monthBuckets = [];
    let current = new Date(startMs);
    current.setHours(0, 0, 0, 0);
    current.setDate(1);
    while (current.getTime() <= endMs) {
      monthBuckets.push(current.getTime());
      current.setMonth(current.getMonth() + 1);
      current.setDate(1);
      current.setHours(0, 0, 0, 0);
    }

    // Build monthMap: for each monthStart, the sessions that fall in that month
    const monthMap = {};
    for (let i = 0; i < monthBuckets.length; i++) {
      const monthStart = monthBuckets[i];
      const nextIndex = i + 1 < monthBuckets.length ? i + 1 : null;
      let monthEnd;
      if (nextIndex) {
        monthEnd = monthBuckets[nextIndex] - 1;
      } else {
        monthEnd = endMs;
      }
      const subSessions = sessionsInRange.filter(
        (s) => s.date >= monthStart && s.date <= monthEnd
      );
      monthMap[monthStart] = {
        start: monthStart,
        end: monthEnd,
        sessions: subSessions,
      };
    }

    for (const monthStart of Object.keys(monthMap)) {
      const { start, end, sessions } = monthMap[monthStart];
      const monthSessionIds = sessions.map((s) => s._id);

      for (const playerId of playerIdArray) {
        const spdDocs = await SessionPlayerData.find({
          sessionId: { $in: monthSessionIds },
          playerId: new mongoose.Types.ObjectId(playerId),
        });
        const currentSessionIds = sessions
          .filter((s) =>
            spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
          )
          .map((s) => s._id.toString());

        const existingDoc = await ForceVelocityAnalysis.findOne({
          userId: req.user._id,
          grouped: 'month',
          startDate: start,
          endDate: end,
          'player.playerId': playerId,
        });
        if (
          existingDoc &&
          existingDoc.userId.toString() === req.user._id.toString() &&
          areSessionIdsEqual(existingDoc.sessions, currentSessionIds)
        ) {
          console.log(`Cached month analysis is up-to-date for player ${playerId} => monthStart=${start}`);
          analysisDocs.push(existingDoc);
          continue;
        } else if (existingDoc) {
          console.log(`User mismatch or session list changed for player ${playerId} => monthStart=${start}, recalculating...`);
        }

        const pythonPayloadData = spdDocs.map((doc) => ({
          playerId: doc.playerId.toString(),
          playerName: doc.playerName,
          SpeedData: doc.speeds || [],
        }));

        let parsed;
        if (pythonPayloadData.length === 0) {
          parsed = { MaxAccel: 0, MaxSpeed: 0 };
        } else {
          try {
            const output = await runPythonScript(pythonPayloadData);
            parsed = JSON.parse(output.trim());
          } catch (err) {
            console.error('Python error month grouping:', err);
            parsed = { MaxAccel: 0, MaxSpeed: 0 };
          }
        }

        const sessionsArray = sessions
          .filter((s) =>
            spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
          )
          .map((s) => ({
            sessionId: s._id,
            sessionName: s.sessionName || 'Unknown Session',
          }));

        const pDoc = await Player.findById(playerId);
        const playerObj = pDoc
          ? { playerId: pDoc._id, name: pDoc.name }
          : { playerId, name: 'Unknown Player' };

        if (existingDoc) {
          existingDoc.sessions = sessionsArray;
          existingDoc.number = sessionsArray.length;
          existingDoc.maxAccel = parsed.MaxAccel;
          existingDoc.maxSpeed = parsed.MaxSpeed;
          await existingDoc.save();
          analysisDocs.push(existingDoc);
        } else {
          const newDoc = await ForceVelocityAnalysis.create({
            userId: req.user._id,
            sessions: sessionsArray,
            player: [playerObj],
            grouped: 'month',
            number: sessionsArray.length,
            startDate: start,
            endDate: end,
            maxAccel: parsed.MaxAccel,
            maxSpeed: parsed.MaxSpeed,
          });
          analysisDocs.push(newDoc);
        }
      }
    }

    return res.status(200).json({ message: 'Success - monthly grouping', docs: analysisDocs });
  }

  // -----------------------------------
  // 4) Fallback grouping
  // -----------------------------------
  else {
    const allSessionIds = sessionsInRange.map((s) => s._id);
    for (const playerId of playerIdArray) {
      const spdDocs = await SessionPlayerData.find({
        sessionId: { $in: allSessionIds },
        playerId: new mongoose.Types.ObjectId(playerId),
      });
      const currentSessionIds = sessionsInRange
        .filter((s) =>
          spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
        )
        .map((s) => s._id.toString());

      const existingDoc = await ForceVelocityAnalysis.findOne({
        userId: req.user._id,
        grouped: grouping || 'none',
        startDate: startMs,
        endDate: endMs,
        'player.playerId': playerId,
      });
      if (
        existingDoc &&
        existingDoc.userId.toString() === req.user._id.toString() &&
        areSessionIdsEqual(existingDoc.sessions, currentSessionIds)
      ) {
        console.log(`Cached fallback analysis is up-to-date for player ${playerId}`);
        analysisDocs.push(existingDoc);
        continue;
      } else if (existingDoc) {
        console.log(`User mismatch or session list changed for player ${playerId}, recalculating...`);
      }

      const pythonPayloadData = spdDocs.map((doc) => ({
        playerId: doc.playerId.toString(),
        playerName: doc.playerName,
        SpeedData: doc.speeds || [],
      }));

      let parsed;
      if (pythonPayloadData.length === 0) {
        parsed = { MaxAccel: 0, MaxSpeed: 0 };
      } else {
        try {
          const output = await runPythonScript(pythonPayloadData);
          parsed = JSON.parse(output.trim());
        } catch (err) {
          console.error('Python script error (fallback):', err);
          parsed = { MaxAccel: 0, MaxSpeed: 0 };
        }
      }

      const sessionsArray = sessionsInRange
        .filter((s) =>
          spdDocs.some((spd) => spd.sessionId.toString() === s._id.toString())
        )
        .map((s) => ({
          sessionId: s._id,
          sessionName: s.sessionName || 'Unknown Session',
        }));

      const pDoc = await Player.findById(playerId);
      const playerObj = pDoc
        ? { playerId: pDoc._id, name: pDoc.name }
        : { playerId, name: 'Unknown Player' };

      if (existingDoc) {
        existingDoc.sessions = sessionsArray;
        existingDoc.number = sessionsArray.length;
        existingDoc.maxAccel = parsed.MaxAccel;
        existingDoc.maxSpeed = parsed.MaxSpeed;
        await existingDoc.save();
        analysisDocs.push(existingDoc);
      } else {
        const newDoc = await ForceVelocityAnalysis.create({
          userId: req.user._id,
          sessions: sessionsArray,
          player: [playerObj],
          grouped: grouping || 'none',
          number: sessionsArray.length,
          startDate: startMs,
          endDate: endMs,
          maxAccel: parsed.MaxAccel,
          maxSpeed: parsed.MaxSpeed,
        });
        analysisDocs.push(newDoc);
      }
    }
    return res.status(200).json({ message: `Success - grouping=${grouping}`, docs: analysisDocs });
  }
});
