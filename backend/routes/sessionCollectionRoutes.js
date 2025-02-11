import express from "express";
import SessionCollection from '../models/sessionCollectionModel.js';
import asyncHandler from 'express-async-handler';
const router = express.Router();
import {
    registerSessionCollection,
    getSessionCollectionProfile,
    updateSessionCollectionProfile,
    uploadSessionCSV,
    getSessionCollections,
    deleteSessionCollection,
    updateSessionCollection,
} from '../controllers/sessionCollectionController.js';
import { protect } from '../middleware/authMiddleware.js';
const upload = multer({ dest: 'uploads/' }); // Saves files in 'uploads/' directory


// @desc   Fetch all sessionCollections from MongoDB
// @route  GET /api/sessionCollections
// @access Public
router.route('/').post(protect, registerSessionCollection).get(protect, getSessionCollections); 
router.route('/profile').get(protect, getSessionCollectionProfile).put(protect, updateSessionCollectionProfile);
router.post("/upload", protect, upload.single("file"), uploadSessionCSV);
router.route('/:id').delete(protect, deleteSessionCollection).put(protect, updateSessionCollection);

export default router;
