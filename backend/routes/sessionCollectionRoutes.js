// import express from "express";
// import multer from "multer";
// import { protect } from "../middleware/authMiddleware.js";
// import {
//   registerSessionCollection,
//   getSessionCollectionProfile,
//   updateSessionCollectionProfile,
//   uploadSessionCSV,
//   getSessionCollections,
//   getSessionCollectionByID,
//   deleteSessionCollection,
//   updateSessionCollection
// } from "../controllers/sessionCollectionController.js";
// import SessionCollection from '../models/sessionCollectionModel.js';


// const router = express.Router();
// // Use memory storage for file uploads so we can access the file buffer
// const upload = multer({ storage: multer.memoryStorage() });

// // @desc    Register a new session collection / Fetch all session collections
// // @route   POST /api/sessionCollections
// //          GET /api/sessionCollections
// // @access  Protected
// router
//   .route("/")
//   .post(protect, registerSessionCollection)
//   .get(protect, getSessionCollections);

// // @desc    Get or update session collection profile
// // @route   GET /api/sessionCollections/profile
// //          PUT /api/sessionCollections/profile
// // @access  Protected
// router
//   .route("/profile")
//   .get(protect, getSessionCollectionProfile)
//   .put(protect, updateSessionCollectionProfile);

// // @desc    Upload session CSV file
// // @route   POST /api/sessionCollections/upload
// // @access  Protected
// // router.post("/upload", protect, upload.single("file"), uploadSessionCSV);

// // router.post('/upload', protect, upload.single('file'), async (req, res, next) => {
// //   console.log("📌 Received request at /api/sessionCollections/upload"); // ✅ This should appear first
// //   try {
// //       if (!req.body.sessionId) {
// //           console.error("🚨 No sessionId provided.");
// //           return res.status(400).json({ message: "Session ID is required." });
// //       }
// //       console.log(`✅ Received Session ID: ${req.body.sessionId}`);
// //       next();
// //   } catch (error) {
// //       console.error("🚨 Error in CSV upload route:", error);
// //       res.status(500).json({ message: "Error processing your request." });
// //   }
// // }, uploadSessionCSV);

// router.post('/upload', protect, upload.single('file'), uploadSessionCSV);


// // @desc    Get a session collection by ID
// // @route   GET /api/sessionCollections/:id
// // @access  Protected/Admin
// router.route("/:id").get(protect, getSessionCollectionByID);

// // @desc    Delete or update a session collection by its ID
// // @route   DELETE /api/sessionCollections/:id
// //          PUT /api/sessionCollections/:id
// // @access  Protected/Admin
// router
//   .route("/:id")
//   .delete(protect, deleteSessionCollection)
//   .put(protect, updateSessionCollection);



// // Add this route to fetch CSVs for a session
// router.get('/:id/csvs', protect, async (req, res) => {
//   try {
//     const sessionId = req.params.id;
//     console.log(`🔎 Fetching CSVs for session: ${sessionId}`);

//     // Find the session collection and populate sessionData with selected fields
//     const sessionCollection = await SessionCollection.findById(sessionId).populate({
//       path: 'sessionData',
//       select: 'playerId startTime endTime', // Adjust the fields as needed
//     });

//     if (!sessionCollection) {
//       console.error("🚨 Session not found!");
//       return res.status(404).json({ message: "Session not found" });
//     }

//     // Return the populated sessionData in an object (so your client can use data.sessionDataArray)
//     res.status(200).json({ sessionDataArray: sessionCollection.sessionData });
//   } catch (error) {
//     console.error("🚨 Error fetching CSVs:", error);
//     res.status(500).json({ message: "Error fetching CSVs" });
//   }
// });


// router.delete('/:id/csvs/all', protect, deleteAllSessionCSVs);


// export default router;


// src/routes/sessionCollectionsRoutes.js
import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import {
  registerSessionCollection,
  getSessionCollectionProfile,
  updateSessionCollectionProfile,
  uploadSessionCSV,
  getSessionCollections,
  getSessionCollectionByID,
  deleteSessionCollection,
  updateSessionCollection,
  deleteAllSessionCSVs, // Import the new controller
} from '../controllers/sessionCollectionController.js';
import SessionCollection from '../models/sessionCollectionModel.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router
  .route("/")
  .post(protect, registerSessionCollection)
  .get(protect, getSessionCollections);

router
  .route("/profile")
  .get(protect, getSessionCollectionProfile)
  .put(protect, updateSessionCollectionProfile);

router.post('/upload', protect, upload.single('file'), uploadSessionCSV);

router
  .route("/:id")
  .get(protect, getSessionCollectionByID)
  .delete(protect, deleteSessionCollection)
  .put(protect, updateSessionCollection);

// CSV fetching endpoint
router.get('/:id/csvs', protect, async (req, res) => {
  try {
    const sessionId = req.params.id;
    console.log(`🔎 Fetching CSVs for session: ${sessionId}`);

    const sessionCollection = await SessionCollection.findById(sessionId).populate({
      path: 'sessionData',
      select: 'playerId startTime endTime',
    });

    if (!sessionCollection) {
      console.error("🚨 Session not found!");
      return res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json({ sessionDataArray: sessionCollection.sessionData });
  } catch (error) {
    console.error("🚨 Error fetching CSVs:", error);
    res.status(500).json({ message: "Error fetching CSVs" });
  }
});

// UPDATED: Route for deleting all CSVs
router.delete('/:id/csvs/all', protect, deleteAllSessionCSVs);

export default router;
