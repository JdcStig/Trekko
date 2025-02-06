import { response } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import Team from '../models/teamModel.js';
import generateToken from '../utils/generateToken.js';



// @desc   Register team
// @route  POST /api/teams
// @access Public
const registerTeam = asyncHandler(async (req, res) => {
    const { name, sport } = req.body;
    const userId = req.user._id; // Gets the logged-in user's ID

    const teamExists = await Team.findOne({ name, userId });

    if (teamExists) {
      res.status(400);
      throw new Error('team already exists');
    }


    const team = await Team.create({
        name,
        sport,
        userId,
    });

    if (team) {
        res.status(200).json({
            _id: team._id,
            name: team.name,
            sport: team.sport,
            userId: team.userId,
           });
    } else {
        res.status(400);
        throw new Error('Invalid team data');
    }
});

// @desc   Get team profile
// @route  GET /api/teams/profile
// @access Private
const getTeamProfile = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.team._id);

    if (team) {
       res.status(200).json({
        _id: team._id,
        name: team.name,
        sport: team.sport,
       }); 
    } else {
      res.status(404);
      throw new Error('Team not found');
    }
});

// @desc   Update team profile
// @route  PUT /api/teams/profile
// @access Private
const updateTeamProfile = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.team._id);

    if (team) {
        team.name = req.body.name || team.name; 
        team.sport = req.body.sport || team.sport; 


       const updatedTeam = await team.save();

       res.status(200).json({
        _id: updatedTeam._id,
        name: updateTeam.name,
        sport: updateTeam.sport,
       });
    } else {
      res.status(404);
      throw new Error('Team not found');  
    }
});

// @desc   Get teams
// @route  GET /api/teams
// @access Private/Admin
const getTeams = asyncHandler(async (req, res) => {
    const teams = await Team.find({ userId: req.user._id }); // Only returns user's teams
    res.status(200).json(teams);
});

// @desc   Get team by ID
// @route  GET /api/teams/:id
// @access Private/Admin
const getTeamByID = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);

    if (team) {
        res.status(200).json(team);
    } else {
        res.status(404);
        throw new Error('Team not found');
    }
});

// @desc   Delete teams
// @route  DELETE /api/teams/:id
// @access Private/Admin
const deleteTeam = asyncHandler(async (req, res) => {
   const team = await Team.findById(req.params.id);

   if (team) {
    await Team.deleteOne({_id: team._id})
    res.status(200).json({ message: 'Team deleted successfully'})
   } else {
    res.status(404);
    throw new Error('Team not found');
   }
});

// @desc   Update teams
// @route  PUT /api/teams/:id
// @access Private/Admin
const updateTeam = asyncHandler(async (req, res) => {
    const team = await Team.findById(req.params.id);

    if (team) {
        team.name = req.body.name || team.name;
        team.sport = req.body.sport || team.sport; 

        const updatedTeam = await team.save();

        res.status(200).json({
            _id: updatedTeam._id,
            name: updatedTeam.name,
            sport: updatedTeam.sport,
        });
    } else {
        res.status(404);
        throw new Error('Team not found');
    }
});

export{
    registerTeam,
    getTeamProfile,
    updateTeamProfile,
    getTeams,
    getTeamByID,
    deleteTeam,
    updateTeam,
}