import express from "express";
import Player from "../models/playerModel.js";
import asyncHandler from 'express-async-handler';
const router = express.Router();
import {
    authPlayer,
    registerPlayer,
    logoutPlayer,
    getPlayerProfile,
    updatePlayerProfile,
    getPlayers,
    getPlayerByID,
    deletePlayer,
    updatePlayer,
} from '../controllers/playerController.js';
import { protect } from '../middleware/authMiddleware.js';



// @desc   Fetch all players from MongoDB
// @route  GET /api/players
// @access Public
router.route('/').post(registerPlayer).get(getPlayers); 


router.post('/logout', logoutPlayer);
router.post('/auth', authPlayer);
router.route('/profile').get(protect, getPlayerProfile).put(protect, updatePlayerProfile);
router.route('/:id').delete(protect, deletePlayer).get(protect, getPlayerByID).put(protect, updatePlayer);

export default router;
