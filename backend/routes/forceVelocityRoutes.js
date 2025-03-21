import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getForceVelocityData } from '../controllers/forceVelocityController.js';

const router = express.Router();


router.get('/', protect, getForceVelocityData);

export default router;
