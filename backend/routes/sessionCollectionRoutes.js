// backend/routes/sessionCollectionRoutes.js
import express from "express";
import asyncHandler from 'express-async-handler';
const router = express.Router();

import {
  registerSessionCollection,
  getSessionCollectionProfile,
  updateSessionCollectionProfile,
  // getSessionCollectionByID,  // Not used currently
  getSessionCollections,
  deleteSessionCollection,
  updateSessionCollection,
} from '../controllers/sessionCollectionController.js';

import { protect } from '../middleware/authMiddleware.js';

// @desc    Register a new session collection / Fetch all session collections
// @route   POST /api/sessionCollections
//          GET /api/sessionCollections
// @access  Protected
router
  .route('/')
  .post(protect, registerSessionCollection)
  .get(protect, getSessionCollections);

// @desc    Get or update your session collection profile
// @route   GET /api/sessionCollections/profile
//          PUT /api/sessionCollections/profile
// @access  Protected
router
  .route('/profile')
  .get(protect, getSessionCollectionProfile)
  .put(protect, updateSessionCollectionProfile);

// @desc    Delete or update a session collection by its ID
// @route   DELETE /api/sessionCollections/:id
//          PUT /api/sessionCollections/:id
// @access  Protected
router
  .route('/:id')
  .delete(protect, deleteSessionCollection)
  .put(protect, updateSessionCollection);

export default router;
