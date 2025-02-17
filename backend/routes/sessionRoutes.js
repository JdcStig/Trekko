import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import Session from '../models/sessionModel.js';
import {
  registerSession,
  getSessionProfile,
  updateSessionProfile,
  uploadSessionCSV,
  getSessions,
  getSessionByID,
  deleteSession,
  updateSession,
  deleteAllSessionCSVs,
} from '../controllers/sessionController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Routes for registering a new session collection and fetching all collections
router
  .route("/")
  .post(protect, registerSession)
  .get(protect, getSessions);

// Routes for getting or updating the session collection profile
router
  .route("/profile")
  .get(protect, getSessionProfile)
  .put(protect, updateSessionProfile);

// Route for uploading CSV files for a session
router.post('/upload', protect, upload.single('file'), uploadSessionCSV);

// Routes for getting, deleting, or updating a session collection by ID
router
  .route("/:id")
  .get(protect, getSessionByID)
  .delete(protect, deleteSession)
  .put(protect, updateSession);

// Route for fetching CSV data for a session
router.get('/:id/csvs', protect, async (req, res) => {
  try {
    const sessionId = req.params.id;
    //console.log(`🔎 Fetching CSVs for session: ${sessionId}`);
    const session = await Session.findById(sessionId).populate({
      path: 'sessionPlayerData',
      select: 'playerId startTime endTime',
    });
    if (!session) {
      //console.error("🚨 Session not found!");
      return res.status(404).json({ message: "Session not found" });
    }
    res.status(200).json({ sessionPlayerDataArray: session.sessionPlayerData });
  } catch (error) {
    //console.error("🚨 Error fetching CSVs:", error);
    res.status(500).json({ message: "Error fetching CSVs" });
  }
});

// Route for deleting all CSV data for a session
router.delete('/:id/csvs/all', protect, deleteAllSessionCSVs);

export default router;
