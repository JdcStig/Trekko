import { response } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import Player from '../models/playerModel.js';
import generateToken from '../utils/generateToken.js';

// @desc   Auth player & get token
// @route  POST /api/players/login
// @access Public
const authPlayer = asyncHandler(async (req, res) => {
    // Takes out the name and position
    const { name, position } = req.body;

    const player = await Player.findOne({ position });

    if (player && (await player.findOne({ name }))) {
        generateToken(res, player._id);

        res.status(200).json({
         _id: player._id,
         id: player.id,
         name: player.name,
         position: player.position,
        });
    } else {
      res.status(401);
      throw new Error('Invalid name or position');
    }
});

// @desc   Register player
// @route  POST /api/players
// @access Public
const registerPlayer = asyncHandler(async (req, res) => {
    const { name, position, teamId  } = req.body;

    const playerExists = await Player.findOne({ name });

    if (playerExists) {
      res.status(400);
      throw new Error('player already exists');
    }

    // Finds the highest `id` in the database and increment it
    const lastPlayer = await Player.findOne().sort({ id: -1 });
    const newId = lastPlayer ? lastPlayer.id + 1 : 1;

    const player = await Player.create({
        id: newId,
        name,
        position,
        teamId,
    });

    if (player) {
       {/*generateToken(res, player._id);*/}

       res.status(201).json({
        _id: player._id,
        id: player.id,
        name: player.name,
        position: player.position,
        teamId: player.teamId,
       }); 
    } else {
        res.status(400);
        throw new Error('Invalid player data');
    }
});

// @desc   Logout player / clear cookie
// @route  POST /api/players/logout
// @access Private
const logoutPlayer = asyncHandler(async (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({ message: 'Logged out successfully' });
});

// @desc   Get player profile
// @route  GET /api/players/profile
// @access Private
const getPlayerProfile = asyncHandler(async (req, res) => {
    const player = await Player.findById(req.player._id);

    if (player) {
       res.status(200).json({
        _id: player._id,
        id: player.id,
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

    //    if (req.body.password) {
    //     player.password = req.body.password;
    //    }

       const updatedPlayer = await player.save();

       res.status(200).json({
        _id: updatedPlayer._id,
        id: player.id,
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
    // if (player.isAdmin) {
    //    res.status(400);
    //    throw new Error('Cannot delete admin player')
    // }
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
        player.teamId = req.body.teamId || player.teamId;

        const updatedPlayer = await player.save();

        res.status(200).json({
            _id: updatedPlayer._id,
            id: updatedPlayer.id,
            name: updatedPlayer.name,
            position: updatedPlayer.position,
            teamId: updatedPlayer.teamId,
        });
    } else {
        res.status(404);
        throw new Error('Player not found');
    }
});


export{
    authPlayer,
    registerPlayer,
    logoutPlayer,
    getPlayerProfile,
    updatePlayerProfile,
    getPlayers,
    getPlayerByID,
    deletePlayer,
    updatePlayer,
}