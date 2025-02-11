import express from "express";
import multer from "multer"; // Added multer for file upload handling
import { protect } from "../middleware/authMiddleware.js";
import {
  registerSessionCollection,
  getSessionCollectionProfile,
  updateSessionCollectionProfile,
  uploadSessionCSV,
  getSessionCollections,
  getSessionCollectionByID,
  deleteSessionCollection,
  updateSessionCollection,
} from "../controllers/sessionCollectionController.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Saves uploaded files in 'uploads/' directory

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
router.post("/upload", protect, upload.single("file"), uploadSessionCSV);

// @desc    Get a session collection by ID
// @route   GET /api/sessionCollections/:id
// @access  Protected/Admin
router.route("/:id").get(protect, getSessionCollectionByID);

// @desc    Delete or update a session collection by its ID
// @route   DELETE /api/sessionCollections/:id
//          PUT /api/sessionCollections/:id
// @access  Protected
router
  .route("/:id")
  .delete(protect, deleteSessionCollection)
  .put(protect, updateSessionCollection);

export default router;
