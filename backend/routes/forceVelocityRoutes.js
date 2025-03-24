// file: routes/forceVelocityRoutes.js
import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getForceVelocityData,
  runForceVelocityAnalysis,
} from '../controllers/forceVelocityController.js';

const router = express.Router();

router.get('/', protect, getForceVelocityData);
router.post('/runAnalysis', protect, runForceVelocityAnalysis);

export default router;
