import { response } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import Player from '../models/playerModel.js';
import Team from '../models/teamModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Session from '../models/sessionModel.js';
import generateToken from '../utils/generateToken.js';


// @desc   Register player
// @route  POST /api/players
// @access Public
const registerPlayer = asyncHandler(async (req, res) => {
    const { name, position, teamName } = req.body;
    const userId = req.user._id; // Gets the logged-in user's ID

    const team = await Team.findOne({ name: teamName, userId });

    if (!team) {
        res.status(400);
        throw new Error("Team does not exist");
    }

    const player = await Player.create({
        name,
        position,
        teamName,
        userId,
    });

    if (player) {
        res.status(200).json({
            _id: player._id,
            name: player.name,
            position: player.position,
            userId: player.userId,
        });
    } else {
        res.status(400);
        throw new Error('Invalid player data');
    }
});

// @desc   Get player profile
// @route  GET /api/players/profile
// @access Private
const getPlayerProfile = asyncHandler(async (req, res) => {
    const player = await Player.findById(req.player._id);

    if (player) {
       res.status(200).json({
        _id: player._id,
        name: player.name,
        position: player.position,
       }); 
    } else {
      res.status(404);
      throw new Error('Player not found');
    }
});

// @desc   Update player profile
// @route  PUT /api/players/profile
// @access Private
const updatePlayerProfile = asyncHandler(async (req, res) => {
    const player = await Player.findById(req.player._id);

    if (player) {
        player.name = req.body.name || player.name; 
        player.position = req.body.position || player.position; 

       const updatedPlayer = await player.save();

       res.status(200).json({
        _id: updatedPlayer._id,
        name: updatedPlayer.name,
        position: updatedPlayer.position,
       });
    } else {
      res.status(404);
      throw new Error('Player not found');  
    }
});

// @desc   Get players
// @route  GET /api/players
// @access Private/Admin
const getPlayers = asyncHandler(async (req, res) => {
    const players = await Player.find({ userId: req.user._id }); // Only returns user's players
    res.status(200).json(players);
});

// @desc   Get player by ID
// @route  GET /api/players/:id
// @access Private/Admin
const getPlayerByID = asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);

    if (player) {
        res.status(200).json(player);
    } else {
        res.status(404);
        throw new Error('Player not found');
    }
});

// @desc   Delete player and related session data
// @route  DELETE /api/players/:id
// @access Private/Admin
const deletePlayer = asyncHandler(async (req, res) => {
    const player = await Player.findById(req.params.id);
  
    if (!player) {
      res.status(404);
      throw new Error('Player not found');
    }
  
    try {
      // 1. Deletes the player document from players collection
      await Player.deleteOne({ _id: player._id });
  
      // 2. Deletes all related SessionPlayerData documents with matching playerId
      await SessionPlayerData.deleteMany({ playerId: player.playerId });
  
      // 3. Removes references from Session's sessionPlayerData array
      await Session.updateMany(
        {},
        { $pull: { sessionPlayerData: { playerName: player.name } } }
      );

      // 4. Updates player count in related sessions
      await Session.updateMany(
        { "sessionPlayerData.playerName": player.name },
        {
          $pull: { sessionPlayerData: { playerName: player.name } },
          $inc: { number: -1 }
        }
      );
  
      res.status(200).json({ message: 'Player and related session data deleted successfully' });
    } catch (error) {
      console.error("Error deleting player and related data:", error);
      res.status(500).json({ message: "Failed to delete player and related data" });
    }
  });

// @desc   Update player
// @route  PUT /api/players/:id
// @access Private/Admin
const updatePlayer = asyncHandler(async (req, res) => {
    const { name, position, teamName } = req.body;
    const player = await Player.findById(req.params.id);

    if (!player) {
        res.status(404);
        throw new Error("Player not found");
    }

    // Ensure only provided fields are updated
    if (name) player.name = name;
    if (position) player.position = position;
    if (teamName) player.teamName = teamName;

    const updatedPlayer = await player.save();

    res.status(200).json({
        _id: updatedPlayer._id,
        name: updatedPlayer.name,
        position: updatedPlayer.position,
        teamName: updatedPlayer.teamName,
    });
});

export {
    registerPlayer,
    getPlayerProfile,
    updatePlayerProfile,
    getPlayers,
    getPlayerByID,
    deletePlayer,
    updatePlayer,
};
