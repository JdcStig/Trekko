import { response } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import Player from '../models/playerModel.js';
import generateToken from '../utils/generateToken.js';


// @desc   Register player
// @route  POST /api/players
// @access Public
const registerPlayer = asyncHandler(async (req, res) => {
    const { name, position, teamName } = req.body;

    const playerExists = await Player.findOne({ name });

    if (playerExists) {
      res.status(400);
      throw new Error('player already exists');
    }

    const player = await Player.create({
        name,
        position,
        teamName,
    });

    if (player) {
       {/*generateToken(res, player._id);*/}

       res.status(201).json({
        _id: player._id,
        name: player.name,
        position: player.position,
        teamName: player.teamName,
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
        name: updatePlayer.name,
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
    const players = await Player.find({});
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

// @desc   Delete players
// @route  DELETE /api/players/:id
// @access Private/Admin
const deletePlayer = asyncHandler(async (req, res) => {
   const player = await Player.findById(req.params.id);

   if (player) {
    await Player.deleteOne({_id: player._id})
    res.status(200).json({ message: 'Player deleted successfully'})
   } else {
    res.status(404);
    throw new Error('Player not found');
   }
});

// @desc   Update players
// @route  PUT /api/players/:id
// @access Private/Admin
const updatePlayer = asyncHandler(async (req, res) => {
    // Change this line to use findById instead of findOne({ id: req.params.id })
    const player = await Player.findById(req.params.id);

    if (player) {
        player.name = req.body.name || player.name;
        player.position = req.body.position || player.position;
        player.teamName = req.body.teamName || player.teamName;

        const updatedPlayer = await player.save();

        res.status(200).json({
            _id: updatedPlayer._id,
            name: updatedPlayer.name,
            position: updatedPlayer.position,
            teamName: updatedPlayer.teamName,
        });
    } else {
        res.status(404);
        throw new Error('Player not found');
    }
});


export{
    registerPlayer,
    getPlayerProfile,
    updatePlayerProfile,
    getPlayers,
    getPlayerByID,
    deletePlayer,
    updatePlayer,
}