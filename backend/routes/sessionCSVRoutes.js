import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSessionCSV } from '../controllers/sessionCollectionController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', protect, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.body.sessionId) {
            return res.status(400).json({ message: "Session ID is required." });
        }
        next();
    } catch (error) {
        //console.error("Error in CSV upload route:", error);
        res.status(500).json({ message: "An error occurred while processing your request." });
    }
}, uploadSessionCSV);

export default router;
