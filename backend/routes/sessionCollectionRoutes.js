import express from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware.js";
import {
  registerSessionCollection,
  getSessionCollectionProfile,
  updateSessionCollectionProfile,
  uploadSessionCSV,
  getSessionCollections,
  getSessionCollectionByID,
  deleteSessionCollection,
  updateSessionCollection
} from "../controllers/sessionCollectionController.js";

const router = express.Router();
// Use memory storage for file uploads so we can access the file buffer
const upload = multer({ storage: multer.memoryStorage() });

// @desc    Register a new session collection / Fetch all session collections
// @route   POST /api/sessionCollections
//          GET /api/sessionCollections
// @access  Protected
router
  .route("/")
  .post(protect, registerSessionCollection)
  .get(protect, getSessionCollections);

// @desc    Get or update session collection profile
// @route   GET /api/sessionCollections/profile
//          PUT /api/sessionCollections/profile
// @access  Protected
router
  .route("/profile")
  .get(protect, getSessionCollectionProfile)
  .put(protect, updateSessionCollectionProfile);

// @desc    Upload session CSV file
// @route   POST /api/sessionCollections/upload
// @access  Protected
// router.post("/upload", protect, upload.single("file"), uploadSessionCSV);

// router.post('/upload', protect, upload.single('file'), async (req, res, next) => {
//   console.log("📌 Received request at /api/sessionCollections/upload"); // ✅ This should appear first
//   try {
//       if (!req.body.sessionId) {
//           console.error("🚨 No sessionId provided.");
//           return res.status(400).json({ message: "Session ID is required." });
//       }
//       console.log(`✅ Received Session ID: ${req.body.sessionId}`);
//       next();
//   } catch (error) {
//       console.error("🚨 Error in CSV upload route:", error);
//       res.status(500).json({ message: "Error processing your request." });
//   }
// }, uploadSessionCSV);

router.post('/upload', protect, upload.single('file'), uploadSessionCSV);


// @desc    Get a session collection by ID
// @route   GET /api/sessionCollections/:id
// @access  Protected/Admin
router.route("/:id").get(protect, getSessionCollectionByID);

// @desc    Delete or update a session collection by its ID
// @route   DELETE /api/sessionCollections/:id
//          PUT /api/sessionCollections/:id
// @access  Protected/Admin
router
  .route("/:id")
  .delete(protect, deleteSessionCollection)
  .put(protect, updateSessionCollection);

export default router;