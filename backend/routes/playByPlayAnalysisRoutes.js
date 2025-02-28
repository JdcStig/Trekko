import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
  registerPlayByPlayAnalysis,
  getPlayByPlayAnalysiss,
  getPlayByPlayAnalysisByID,
  deletePlayByPlayAnalysis,
  updatePlayByPlayAnalysis,
  deleteAllPlayByPlayAnalysisCSVs,
  uploadPlayByPlayAnalysisCSV,
} from '../controllers/playByPlayAnalysisController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Register & get all play-by-play analyses
router.route('/')
  .post(protect, registerPlayByPlayAnalysis)
  .get(protect, getPlayByPlayAnalysiss);

// Get/Update/Delete play-by-play analysis by ID
router.route('/:id')
  .get(protect, getPlayByPlayAnalysisByID)
  .put(protect, updatePlayByPlayAnalysis)
  .delete(protect, deletePlayByPlayAnalysis);

// Upload CSV data for a specific analysis
router.post('/upload', protect, upload.single('file'), uploadPlayByPlayAnalysisCSV);

// GET CSV data for a play-by-play analysis
router.get('/:id/csvs', protect, async (req, res) => {
  try {
    const playByPlayAnalysisId = req.params.id;
    const playByPlayAnalysis = await require('../models/playByPlayAnalysisModel.js').findById(playByPlayAnalysisId)
      .populate('playByPlayAnalysisPlayerData');
    if (!playByPlayAnalysis) {
      return res.status(404).json({ message: "PlayByPlay Analysis not found" });
    }
    res.status(200).json({
      playByPlayAnalysisPlayerDataArray: playByPlayAnalysis.playByPlayAnalysisPlayerData,
      splits: playByPlayAnalysis.splits || []  // default to empty array if no splits
    });
  } catch (error) {
    console.error("Error fetching play-by-play analysis CSV data:", error);
    res.status(500).json({ message: "Error fetching CSVs" });
  }
});

// Delete all CSV data for a play-by-play analysis
router.delete('/:id/csvs/all', protect, deleteAllPlayByPlayAnalysisCSVs);

export default router;
