// file: routes/forceVelocityRoutes.js

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getForceVelocityData, runForceVelocityAnalysis } from '../controllers/forceVelocityController.js';

const router = express.Router();

// GET /api/forcevelocity -> returns force-velocity data
router.get('/', protect, getForceVelocityData);

// POST /api/forcevelocity/runAnalysis -> invokes the Python script with analysisValue
router.post('/runAnalysis', protect, runForceVelocityAnalysis);

export default router;
