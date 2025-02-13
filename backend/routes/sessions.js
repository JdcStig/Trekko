import express from 'express';
import SessionCollection from '../models/sessionCollectionModel.js';
import calculateAverageDistance from '../calculations/calculateAverageDistance.js';

const router = express.Router();

// POST /api/sessions - create a new session
router.post('/', async (req, res) => {
  try {
    // Create a new session in your SessionCollection
    const newSession = await SessionCollection.create(req.body);
    
    // Call the calculateAverageDistance function with the new session's ID.
    // This function will update the session record with the computed avgDistance.
    await calculateAverageDistance(newSession._id);

    // Optionally, fetch the updated session data to send in the response.
    const updatedSession = await SessionCollection.findById(newSession._id);
    
    res.status(201).json({ session: updatedSession });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
