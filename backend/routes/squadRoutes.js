import express from "express";
import Squad from "../models/squadModel.js";
import asyncHandler from 'express-async-handler';
const router = express.Router();
import {
    registerSquad,
    getSquadProfile,
    updateSquadProfile,
    getSquads,
    getSquadByID,
    deleteSquad,
    updateSquad,
} from '../controllers/squadController.js';
import { protect } from '../middleware/authMiddleware.js';



// @desc   Fetch all squads from MongoDB
// @route  GET /api/squads
// @access Public
router.route('/').post(registerSquad).get(getSquads); 


router.route('/profile').get(protect, getSquadProfile).put(protect, updateSquadProfile);
router.route('/:id').delete(protect, deleteSquad).get(protect, getSquadByID).put(protect, updateSquad);

export default router;
