// file: controllers/sessionController.js

import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Team from '../models/teamModel.js';

import parseCSV from '../calculation/parseCSV.js'; 
// ^ Adjust the import path if parseCSV.js is located elsewhere

import { parsePlayByPlayCSV } from '../controllers/playByPlayAnalysisController.js'; 
// ^ Adjust the import path if parsePlayByPlayCSV is located elsewhere

import calculateAverageDistance from '../calculation/calculateAverageDistance.js';
import calculatePlayPlayerMetrics from '../calculation/calculatePlayPlayerMetrics.js';
import calculateSplitPlayerMetrics from '../calculation/calculateSplitPlayerMetrics.js';

/**
 * ===========================
 * Metric Calculation Helpers
 * ===========================
 */

// Basic distance-based metrics
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000,
  TopSpeed: (values) => Math.max(...values),
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000,
  Sprinting: (values) =>
    (values.filter((v) => v >= 7).reduce((acc, val) => acc + val, 0) / 10) / 1000,
};

/**
 * aggregateSprintMetrics
 * For each play in session.plays, calculates:
 *   - play.numSprint: number of players with snippet top speed >= 7 m/s
 *   - play.avgDistance: average snippet distance across all players
 */
function aggregateSprintMetrics(session) {
  console.log('[aggregateSprintMetrics] START');
  if (!session || !session.plays || !session.sessionPlayerData) {
    console.log('[aggregateSprintMetrics] Missing session data');
    return;
  }

  session.plays.forEach((play) => {
    let sprintCount = 0;
    let totalDistance = 0;
    let distanceCount = 0;

    session.sessionPlayerData.forEach((playerData) => {
      if (!playerData.playPlayerMetrics) return;
      // Find the snippet for this particular playNumber
      const pm = playerData.playPlayerMetrics.find(
        (p) => p.PlayNumber === play.playNumber
      );
      if (!pm) return;

      // Count sprints if snippet TopSpeed >= 7 m/s
      const topSpeedMetric = pm.PlayMetrics.find(
        (m) => m.MetricName === 'TopSpeed'
      );
      if (topSpeedMetric && topSpeedMetric.Value >= 7) {
        sprintCount++;
      }

      // Accumulate distance
      const distanceMetric = pm.PlayMetrics.find(
        (m) => m.MetricName === 'Distance'
      );
      if (distanceMetric && typeof distanceMetric.Value === 'number') {
        totalDistance += distanceMetric.Value;
        distanceCount++;
      }
    });

    play.numSprint = sprintCount;
    play.avgDistance = distanceCount > 0 ? totalDistance / distanceCount : 0;
  });

  console.log('[aggregateSprintMetrics] DONE');
}

/**
 * recalcSessionMetrics
 * Recomputes all metrics for a session by reading from SessionPlayerData docs.
 * - Overwrites session.sessionPlayerData with newly computed metrics
 * - Aggregates sprint/distance per play
 * - Recomputes session.avgDistance
 */
export const recalcSessionMetrics = async (sessionId) => {
  const session = await Session.findById(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  // Rebuild session.sessionPlayerData from the actual DB docs
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  session.sessionPlayerData = []; // Clear existing data

  for (const doc of allPlayerDocs) {
    const times = doc.times || [];
    const speeds = doc.speeds || [];

    // Overall player metrics
    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];

    // Snippet-based metrics per play & per split
    const playPlayerMetrics = calculatePlayPlayerMetrics(times, speeds, session.plays || []);
    const splitPlayerMetrics = calculateSplitPlayerMetrics(speeds, session.splits || []);

    session.sessionPlayerData.push({
      csvId: doc._id,
      playerId: doc.playerId,
      playerName: doc.playerName,
      sessionPlayerMetrics,
      playPlayerMetrics,
      splitPlayerMetrics,
    });
  }

  // Recompute sprint metrics for each play
  aggregateSprintMetrics(session);

  // Save session, recalc avgDistance
  await session.save();
  await calculateAverageDistance(sessionId);

  // Return updated session (with sessionPlayerData populated if desired)
  return Session.findById(sessionId).populate('sessionPlayerData');
};

/**
 * ===========================
 * Controller Endpoints
 * ===========================
 */

// 1) Register a new session
export const registerSession = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
  const userId = req.user._id;

  // Parse the date
  let parsedDate;
  if (typeof date === 'string') {
    parsedDate = new Date(date).getTime();
  } else if (typeof date === 'number') {
    parsedDate = date;
  } else {
    res.status(400);
    throw new Error('Invalid date format.');
  }
  if (isNaN(parsedDate)) {
    res.status(400);
    throw new Error('Invalid date format. Could not parse date.');
  }

  // Ensure the team exists
  const team = await Team.findOne({ name: teamName, userId });
  if (!team) {
    res.status(400);
    throw new Error('Team does not exist. Please create a team first.');
  }

  // Process splits if provided
  let processedSplits = [];
  if (splits && Array.isArray(splits)) {
    const parseTimeString = (timeStr) => {
      const parts = timeStr.split(':').map(Number);
      const hours = parts[0] || 0;
      const minutes = parts[1] || 0;
      const seconds = parts[2] || 0;
      return ((hours * 3600) + (minutes * 60) + seconds) * 1000;
    };

    processedSplits = splits.map((split, i) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const startOffset = typeof split.start === 'number'
        ? split.start
        : parseTimeString(split.start);
      const endOffset = typeof split.end === 'number'
        ? split.end
        : parseTimeString(split.end);

      return {
        title: split.title,
        splitNumber: i + 1,
        start: parsedDate + startOffset,
        end: parsedDate + endOffset,
      };
    });
  }

  // Create the session
  const session = await Session.create({
    userId,
    teamName,
    sessionName,
    date: parsedDate,
    type,
    duration,
    splits: processedSplits,
    notes,
    number: 0,
  });

  res.status(200).json(session);
});

// 2) Get all sessions for the current user
export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id });
  res.status(200).json(sessions);
});

// 3) Get session by ID
export const getSessionByID = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  res.status(200).json(session);
});

// 4) Delete a session (and all associated SessionPlayerData)
export const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  await SessionPlayerData.deleteMany({ sessionId: session._id });
  await Session.deleteOne({ _id: session._id });
  res.status(200).json({ message: 'Session deleted successfully' });
});

// 5) Update session details and recalc metrics
export const updateSession = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }

  if (teamName) session.teamName = teamName;
  if (sessionName) session.sessionName = sessionName;
  if (date) {
    const parsedDate = new Date(date).getTime();
    if (!isNaN(parsedDate)) {
      session.date = parsedDate;
    }
  }
  if (type) session.type = type;
  if (duration) session.duration = Number(duration);
  if (notes) session.notes = notes;

  if (splits && Array.isArray(splits)) {
    session.splits = splits.map((split, index) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const newStart = Number(split.start) || 0;
      const newEnd = Number(split.end) || 0;
      return {
        title: split.title,
        splitNumber: index + 1,
        start: newStart,
        end: newEnd,
      };
    });
  }

  // Save basic changes
  await session.save();

  // Recalculate all metrics after the update
  const updatedSession = await recalcSessionMetrics(session._id);
  res.status(200).json(updatedSession);
});

// 6) Delete all CSV data (i.e. all SessionPlayerData) from a session
export const deleteAllSessionCSVs = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  if (!sessionId) {
    res.status(400);
    throw new Error('Session ID is required.');
  }
  await SessionPlayerData.deleteMany({ sessionId });

  // Clear session fields
  const session = await Session.findByIdAndUpdate(
    sessionId,
    { sessionPlayerData: [], number: 0, avgDistance: 0 },
    { new: true }
  );
  if (!session) {
    res.status(404);
    throw new Error('Session not found.');
  }

  res.status(200).json({ message: 'All CSV data deleted', session });
});

// 7) Delete all play CSV data (clear plays array + snippet metrics)
export const deleteAllPlayCSVs = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  if (!sessionId) {
    res.status(400);
    throw new Error('Session ID is required.');
  }
  const session = await Session.findById(sessionId);
  if (!session) {
    res.status(404);
    throw new Error('Session not found.');
  }

  // Clear out all plays
  session.plays = [];

  // Remove each player's snippet data for plays
  if (session.sessionPlayerData && session.sessionPlayerData.length > 0) {
    session.sessionPlayerData.forEach((playerData) => {
      playerData.playPlayerMetrics = [];
    });
    session.markModified('sessionPlayerData');
  }

  // Reset average distance
  session.avgDistance = 0;
  await session.save();

  res.status(200).json({ message: 'All play CSV data deleted', session });
});

// 8) Upload Session CSV (calls parseCSV)
export const uploadSessionCSV = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required.' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const updatedSession = await parseCSV(req.file.buffer, sessionId, req.user._id);
    res.status(201).json(updatedSession);
  } catch (error) {
    console.error('[uploadSessionCSV] ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

// 9) Upload Play CSV (calls parsePlayByPlayCSV)
export const uploadPlayCSV = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required.' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    const updatedSession = await parsePlayByPlayCSV(req.file.buffer, sessionId, req.user._id);
    res.status(201).json(updatedSession);
  } catch (error) {
    console.error('[uploadPlayCSV] ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});
