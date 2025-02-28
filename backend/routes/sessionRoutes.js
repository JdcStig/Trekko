import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import Session from '../models/sessionModel.js';
import {
  registerSession,
  getSessions,
  getSessionByID,
  deleteSession,
  updateSession,
  deleteAllSessionCSVs,
  uploadSessionCSV,
} from '../controllers/sessionController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Register & get all sessions
router.route('/')
  .post(protect, registerSession)
  .get(protect, getSessions);

// Get/Update/Delete session by ID
router.route('/:id')
  .get(protect, getSessionByID)
  .delete(protect, deleteSession)
  .put(protect, updateSession);

// Upload CSV
router.post('/upload', protect, upload.single('file'), uploadSessionCSV);

// GET CSV data for a session – SINGLE DEFINITION!
router.get('/:id/csvs', protect, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await Session.findById(sessionId).populate('sessionPlayerData');
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }
    res.status(200).json({
      sessionPlayerDataArray: session.sessionPlayerData,
      splits: session.splits || []  // default to empty array if no splits
    });
  } catch (error) {
    console.error("Error fetching session CSV data:", error);
    res.status(500).json({ message: "Error fetching CSVs" });
  }
});

// Delete all CSV data for a session
router.delete('/:id/csvs/all', protect, deleteAllSessionCSVs);

export default router;
