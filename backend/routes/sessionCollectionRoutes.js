import express from "express";
import SessionCollection from '../models/sessionCollectionModel.js';
import asyncHandler from 'express-async-handler';
const router = express.Router();
import {
    registerSessionCollection,
    getSessionCollectionProfile,
    updateSessionCollectionProfile,
    getSessionCollectionByID,
    getSessionCollections,
    deleteSessionCollection,
    updateSessionCollection,
} from '../controllers/sessionCollectionController.js';
import { protect } from '../middleware/authMiddleware.js';



// @desc   Fetch all sessionCollections from MongoDB
// @route  GET /api/sessionCollections
// @access Public
router.route('/').post(protect, registerSessionCollection).get(protect, getSessionCollections); 
router.route('/profile').get(protect, getSessionCollectionProfile).put(protect, updateSessionCollectionProfile);
router.route('/:id').delete(protect, deleteSessionCollection).put(protect, updateSessionCollection);

export default router;
