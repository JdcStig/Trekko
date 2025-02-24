import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { uploadSessionCSV } from '../controllers/sessionController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });


router.post('/upload', protect, upload.array('files', 10), async (req, res, next) => {  // Limit 10 files
  try {
    console.log("📂 Multiple file upload initiated.");
    console.log("Files details:", req.files); // Log file details

    // Process the uploaded CSV files
    await uploadSessionCSV(req, res, next);

    // After processing, ensure no file data is retained in memory
    req.files.forEach(file => file.buffer = null);

    console.log("✅ CSV file processing completed.");
    res.status(200).json({ message: "CSV files uploaded successfully." });
  } catch (error) {
    console.error("🚨 Error during file upload:", error);
    req.files.forEach(file => file.buffer = null);  // Clean up
    res.status(500).json({ message: "An error occurred while processing your request." });
  }
});


export default router;
