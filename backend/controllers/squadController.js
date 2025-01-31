import { response } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import Squad from '../models/squadModel.js';
import generateToken from '../utils/generateToken.js';

// @desc   Auth squad & get token
// @route  POST /api/squads/login
// @access Public
const authSquad = asyncHandler(async (req, res) => {
    // Takes out the name and position
    const { name, teamId } = req.body;

    const squad = await Squad.findOne({ name });

    if (squad && (await squad.findOne({ name }))) {
        generateToken(res, squad._id);

        res.status(200).json({
         _id: squad._id,
         id: squad.id,
         name: squad.name,
        });
    } else {
      res.status(401);
      throw new Error('Invalid name or position');
    }
});

// @desc   Register squad
// @route  POST /api/squads
// @access Public
const registerSquad = asyncHandler(async (req, res) => {
    const { name, teamId } = req.body;

    const squadExists = await Squad.findOne({ name });

    if (squadExists) {
      res.status(400);
      throw new Error('squad already exists');
    }

    // Finds the highest `id` in the database and increment it
    const lastSquad = await Squad.findOne().sort({ id: -1 });
    const newId = lastSquad ? lastSquad.id + 1 : 1;

    const squad = await Squad.create({
        id: newId,
        name,
        teamId,
    });

    if (squad) {
       {/*generateToken(res, squad._id);*/}

       res.status(201).json({
        _id: squad._id,
        id: squad.id,
        name: squad.name,
        teamId: squad.teamId,
       }); 
    } else {
        res.status(400);
        throw new Error('Invalid squad data');
    }
});

// @desc   Logout squad / clear cookie
// @route  POST /api/squads/logout
// @access Private
const logoutSquad = asyncHandler(async (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({ message: 'Logged out successfully' });
});

// @desc   Get squad profile
// @route  GET /api/squads/profile
// @access Private
const getSquadProfile = asyncHandler(async (req, res) => {
    const squad = await Squad.findById(req.squad._id);

    if (squad) {
       res.status(200).json({
        _id: squad._id,
        id: squad.id,
        name: squad.name,
       }); 
    } else {
      res.status(404);
      throw new Error('Squad not found');
    }
});

// @desc   Update squad profile
// @route  PUT /api/squads/profile
// @access Private
const updateSquadProfile = asyncHandler(async (req, res) => {
    const squad = await Squad.findById(req.squad._id);

    if (squad) {
        squad.name = req.body.name || squad.name; 
        squad.teamId = req.body.teamId || squad.teamId; 


       const updatedSquad = await squad.save();

       res.status(200).json({
        _id: updatedSquad._id,
        id: squad.id,
        name: updateSquad.name,
       });
    } else {
      res.status(404);
      throw new Error('Squad not found');  
    }
});

// @desc   Get squads
// @route  GET /api/squads
// @access Private/Admin
const getSquads = asyncHandler(async (req, res) => {
    const squads = await Squad.find({});
    res.status(200).json(squads);
});

// @desc   Get squad by ID
// @route  GET /api/squads/:id
// @access Private/Admin
const getSquadByID = asyncHandler(async (req, res) => {
    const squad = await Squad.findById(req.params.id);

    if (squad) {
        res.status(200).json(squad);
    } else {
        res.status(404);
        throw new Error('Squad not found');
    }
});

// @desc   Delete squads
// @route  DELETE /api/squads/:id
// @access Private/Admin
const deleteSquad = asyncHandler(async (req, res) => {
   const squad = await Squad.findById(req.params.id);

   if (squad) {
    await Squad.deleteOne({_id: squad._id})
    res.status(200).json({ message: 'Squad deleted successfully'})
   } else {
    res.status(404);
    throw new Error('Squad not found');
   }
});

// @desc   Update squads
// @route  PUT /api/squads/:id
// @access Private/Admin
const updateSquad = asyncHandler(async (req, res) => {
    const squad = await Squad.findOne({ id: req.params.id });

    if (squad) {
        squad.name = req.body.name || squad.name;
        squad.teamId = req.body.teamId || squad.teamId;

        const updatedSquad = await squad.save();

        res.status(200).json({
            _id: updatedSquad._id,
            id: updatedSquad.id,
            name: updatedSquad.name,
            teamId: updatedSquad.teamId,
        })
    } else {
        res.status(404);
        throw new Error('Squad not found');
    }
});

export{
    authSquad,
    registerSquad,
    logoutSquad,
    getSquadProfile,
    updateSquadProfile,
    getSquads,
    getSquadByID,
    deleteSquad,
    updateSquad,
}