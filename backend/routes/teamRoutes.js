import express from "express";
import Team from "../models/teamModel.js";
import asyncHandler from 'express-async-handler';
const router = express.Router();
import {
    registerTeam,
    getTeamProfile,
    updateTeamProfile,
    getTeams,
    getTeamByID,
    deleteTeam,
    updateTeam,
} from '../controllers/teamController.js';
import { protect } from '../middleware/authMiddleware.js';



// @desc   Fetch all teams from MongoDB
// @route  GET /api/teams
// @access Public
router.route('/').post(protect, registerTeam).get(protect, getTeams); 
router.route('/profile').get(protect, getTeamProfile).put(protect, updateTeamProfile);
router.route('/:id').delete(protect, deleteTeam).put(protect, updateTeam);

export default router;
