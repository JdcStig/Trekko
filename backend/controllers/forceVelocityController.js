import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Player from '../models/playerModel.js';

/**
 * GET /api/forcevelocity
 * Query Params:
 *   startDate (string or number)
 *   endDate   (string or number)
 *   playerIds (array of IDs or single CSV string)
 *   grouped   (boolean, optional)
 */
export const getForceVelocityData = asyncHandler(async (req, res) => {
  const { startDate, endDate, playerIds, grouped } = req.query;

  // 1) Parse the date range
  const startMs = new Date(startDate).getTime();
  const endMs   = new Date(endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs)) {
    res.status(400);
    throw new Error("Invalid or missing startDate/endDate");
  }

  // 2) Convert playerIds query param into array of ObjectIds
  //    e.g. if playerIds="abc,def", split it
  //    or if the frontend sends ?playerIds[]=xxx&playerIds[]=yyy, it's already an array
  let playerIdArray = [];
  if (playerIds) {
    if (Array.isArray(playerIds)) {
      playerIdArray = playerIds;
    } else {
      playerIdArray = playerIds.split(',');
    }
  }
  // If no players are requested, you might choose to fetch them all, or return empty.
  // For this example, we’ll assume you only want specific players:
  if (!playerIdArray.length) {
    res.status(200).json([]);
    return;
  }

  // 3) Find all sessions in date range for this user
  //    (assuming you're using req.user._id to scope by user)
  const sessionsInRange = await Session.find({
    userId: req.user._id,
    date: { $gte: startMs, $lte: endMs }
  });
  if (!sessionsInRange.length) {
    // No sessions in this range => return 0 for each player
    const zeroResults = await Player.find({ _id: { $in: playerIdArray } });
    const response = zeroResults.map(p => ({
      playerName: p.name,
      numberSessions: 0
    }));
    return res.status(200).json(response);
  }

  // 4) Extract the sessionIds
  const sessionIds = sessionsInRange.map(s => s._id);

  // 5) Look up SessionPlayerData docs that match these sessionIds AND these players
  //    playerId in your SessionPlayerData is an ObjectId referencing the Player
  //    If your code uses playerName matching, adapt accordingly.
  const spdDocs = await SessionPlayerData.find({
    sessionId: { $in: sessionIds },
    playerId: { $in: playerIdArray.map(id => new mongoose.Types.ObjectId(id)) },
  });

  // 6) Group by playerId => set of sessionIds => count
  //    We'll build a map: { playerId: SetOfSessionIds }
  const playerSessionMap = {};
  spdDocs.forEach(doc => {
    const pId = doc.playerId.toString();
    if (!playerSessionMap[pId]) {
      playerSessionMap[pId] = new Set();
    }
    playerSessionMap[pId].add(doc.sessionId.toString());
  });

  // 7) For each requested player, get the # of sessions from the set
  //    Then return { playerName, numberSessions }
  //    We also fetch the real Player doc for the name
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

  // 8) If "grouped" is true, you might do additional grouping logic, etc.
  //    For now, we ignore it.

  res.status(200).json(results);
});
