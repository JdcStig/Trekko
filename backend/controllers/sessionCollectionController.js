
// import asyncHandler from '../middleware/asyncHandler.js';
// import SessionCollection from '../models/sessionCollectionModel.js';
// import SessionData from '../models/sessionDataModel.js';
// import parseCSV from '../calculation/parseCSV.js';
// import Team from '../models/teamModel.js';
// import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';

// // @desc   Register sessionCollection
// // @route  POST /api/sessionCollections
// // @access Protected
// const registerSessionCollection = asyncHandler(async (req, res) => {
//   const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
//   const userId = req.user._id;

//   let parsedDate;
//   if (typeof date === 'string') {
//     parsedDate = new Date(date).getTime();
//   } else if (typeof date === 'number') {
//     parsedDate = date;
//   } else {
//     res.status(400);
//     throw new Error("Invalid date format. Please send a valid date.");
//   }

//   if (isNaN(parsedDate)) {
//     res.status(400);
//     throw new Error("Invalid date format. Could not parse date.");
//   }

//   const team = await Team.findOne({ name: teamName, userId });
//   if (!team) {
//     res.status(400);
//     throw new Error("Team does not exist. Please create a team first.");
//   }

//   const sessionCollection = await SessionCollection.create({
//     teamName,
//     sessionName,
//     date: parsedDate,
//     type,
//     duration,
//     splits: Array.isArray(splits) ? splits : [],
//     notes,
//     userId,
//     number: 0, // This field may be used to reflect CSV count
//   });

//   if (sessionCollection) {
//     res.status(200).json(sessionCollection);
//   } else {
//     res.status(400);
//     throw new Error("Invalid session collection data");
//   }
// });

// // @desc   Upload and process session CSV
// // @route  POST /api/sessionCollections/upload
// // @access Protected
// const uploadSessionCSV = asyncHandler(async (req, res) => {
//   console.log("📌 Received file upload request");

//   const { sessionId } = req.body;
//   console.log(`📦 Received body:`, req.body);
//   console.log(`📄 Received file:`, req.file);

//   if (!sessionId) {
//     console.error("🚨 No session ID provided!");
//     return res.status(400).json({ message: "Session ID is required." });
//   }

//   if (!req.file) {
//     console.error("🚨 No file uploaded!");
//     return res.status(400).json({ message: "No file uploaded." });
//   }

//   console.log(`✅ File received: ${req.file.originalname}`);

//   try {
//     await parseCSV(req.file.buffer, sessionId, req.user._id);
//     // const createdPlayers = await createPlayersFromCSV(sessionId, req.user._id);
//     const updatedSession = await SessionCollection.findById(sessionId).populate('sessionData');
//     res.status(201).json(updatedSession);
//   } catch (error) {
//     console.error("🚨 Error processing CSV:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// });

// // @desc   Get sessionCollection profile
// // @route  GET /api/sessionCollections/profile
// // @access Protected
// const getSessionCollectionProfile = asyncHandler(async (req, res) => {
//   const sessionCollection = await SessionCollection.findOne({ userId: req.user._id });
//   if (sessionCollection) {
//     res.status(200).json(sessionCollection);
//   } else {
//     res.status(404);
//     throw new Error('Session Collection not found');
//   }
// });

// // @desc   Update sessionCollection profile
// // @route  PUT /api/sessionCollections/profile
// // @access Protected
// const updateSessionCollectionProfile = asyncHandler(async (req, res) => {
//   const sessionCollection = await SessionCollection.findOne({ userId: req.user._id });
//   if (sessionCollection) {
//     sessionCollection.teamName = req.body.teamName || sessionCollection.teamName;
//     sessionCollection.sessionName = req.body.sessionName || sessionCollection.sessionName;
//     sessionCollection.date = req.body.date || sessionCollection.date;
//     sessionCollection.type = req.body.type || sessionCollection.type;
//     sessionCollection.duration = req.body.duration || sessionCollection.duration;
//     sessionCollection.splits = req.body.splits || sessionCollection.splits;
//     sessionCollection.notes = req.body.notes || sessionCollection.notes;

//     const updatedSessionCollection = await sessionCollection.save();
//     res.status(200).json(updatedSessionCollection);
//   } else {
//     res.status(404);
//     throw new Error('Session Collection not found');
//   }
// });

// // @desc   Get all sessionCollections for a user
// // @route  GET /api/sessionCollections
// // @access Protected/Admin
// const getSessionCollections = asyncHandler(async (req, res) => {
//   const sessionCollections = await SessionCollection.find({ userId: req.user._id });

//   if (!sessionCollections || sessionCollections.length === 0) {
//     res.status(404);
//     throw new Error("No sessions found.");
//   }

//   res.status(200).json(sessionCollections);
// });

// // @desc   Get sessionCollection by ID
// // @route  GET /api/sessionCollections/:id
// // @access Protected/Admin
// const getSessionCollectionByID = asyncHandler(async (req, res) => {
//   const sessionCollection = await SessionCollection.findById(req.params.id);
//   if (sessionCollection) {
//     res.status(200).json(sessionCollection);
//   } else {
//     res.status(404);
//     throw new Error('Session Collection not found');
//   }
// });

// // @desc   Delete sessionCollection
// // @route  DELETE /api/sessionCollections/:id
// // @access Protected/Admin
// const deleteSessionCollection = asyncHandler(async (req, res) => {
//   const sessionCollection = await SessionCollection.findById(req.params.id);
//   if (sessionCollection) {
//     await SessionCollection.deleteOne({ _id: sessionCollection._id });
//     res.status(200).json({ message: 'Session Collection deleted successfully' });
//   } else {
//     res.status(404);
//     throw new Error('Session Collection not found');
//   }
// });

// // @desc   Update sessionCollection by ID
// // @route  PUT /api/sessionCollections/:id
// // @access Protected/Admin
// const updateSessionCollection = asyncHandler(async (req, res) => {
//   const { teamName, sessionName, date, type, duration, splits, notes, csvData, ...others } = req.body;
//   // We remove csvData (or any unknown extra fields) since it isn’t part of our schema.

//   const sessionCollection = await SessionCollection.findById(req.params.id);

//   if (!sessionCollection) {
//     res.status(404);
//     throw new Error("Session Collection not found");
//   }

//   if (teamName) sessionCollection.teamName = teamName;
//   if (sessionName) sessionCollection.sessionName = sessionName;
//   if (date) {
//     // Convert date string (e.g., "2025-02-14") to a Unix timestamp
//     const parsedDate = new Date(date).getTime();
//     if (!isNaN(parsedDate)) {
//       sessionCollection.date = parsedDate;
//     }
//   }
//   if (type) sessionCollection.type = type;
//   if (duration) sessionCollection.duration = duration;
//   if (splits) sessionCollection.splits = splits;
//   if (notes) sessionCollection.notes = notes;

//   const updatedSessionCollection = await sessionCollection.save();

//   res.status(200).json(updatedSessionCollection);
// });

// // =============================
// // NEW: Delete all CSVs for a session
// // This function not only deletes the CSV files but also updates the 
// // session's "number" field to 0 so that the UI reflects that no CSVs remain.
// // =============================
// const deleteAllSessionCSVs = asyncHandler(async (req, res) => {
//   const sessionId = req.params.id;
//   if (!sessionId) {
//     res.status(400);
//     throw new Error("Session ID is required.");
//   }
  
//   // Delete all SessionData documents associated with this session
//   await SessionData.deleteMany({ sessionId });
  
//   // Clear the sessionData array and update the "number" field in the SessionCollection document
//   const session = await SessionCollection.findByIdAndUpdate(
//     sessionId,
//     { sessionData: [], number: 0 }, // set number to 0 to reflect deletion
//     { new: true }
//   );
  
//   if (!session) {
//     res.status(404);
//     throw new Error("Session not found.");
//   }
  
//   res.status(200).json({ message: 'All CSV data deleted', session });
// });

// export {
//   registerSessionCollection,
//   uploadSessionCSV,
//   getSessionCollectionProfile,
//   updateSessionCollectionProfile,
//   getSessionCollections,
//   getSessionCollectionByID,
//   deleteSessionCollection,
//   updateSessionCollection,
//   deleteAllSessionCSVs,
// };










import asyncHandler from '../middleware/asyncHandler.js';
import SessionCollection from '../models/sessionCollectionModel.js';
import SessionData from '../models/sessionDataModel.js';
import parseCSV from '../calculation/parseCSV.js';
import Team from '../models/teamModel.js';
import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';

// @desc   Register sessionCollection
// @route  POST /api/sessionCollections
// @access Protected
const registerSessionCollection = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
  const userId = req.user._id;

  let parsedDate;
  if (typeof date === 'string') {
    parsedDate = new Date(date).getTime();
  } else if (typeof date === 'number') {
    parsedDate = date;
  } else {
    res.status(400);
    throw new Error("Invalid date format. Please send a valid date.");
  }

  if (isNaN(parsedDate)) {
    res.status(400);
    throw new Error("Invalid date format. Could not parse date.");
  }

  const team = await Team.findOne({ name: teamName, userId });
  if (!team) {
    res.status(400);
    throw new Error("Team does not exist. Please create a team first.");
  }

  const sessionCollection = await SessionCollection.create({
    teamName,
    sessionName,
    date: parsedDate,
    type,
    duration,
    splits: Array.isArray(splits) ? splits : [],
    notes,
    userId,
    number: 0, // This field may be used to reflect CSV count
  });

  if (sessionCollection) {
    res.status(200).json(sessionCollection);
  } else {
    res.status(400);
    throw new Error("Invalid session collection data");
  }
});

// @desc   Upload and process session CSV
// @route  POST /api/sessionCollections/upload
// @access Protected
const uploadSessionCSV = asyncHandler(async (req, res) => {
  console.log("📌 Received file upload request");

  const { sessionId } = req.body;
  console.log(`📦 Received body:`, req.body);
  console.log(`📄 Received file:`, req.file);

  if (!sessionId) {
    console.error("🚨 No session ID provided!");
    return res.status(400).json({ message: "Session ID is required." });
  }

  if (!req.file) {
    console.error("🚨 No file uploaded!");
    return res.status(400).json({ message: "No file uploaded." });
  }

  console.log(`✅ File received: ${req.file.originalname}`);

  try {
    // First, parse the CSV file
    await parseCSV(req.file.buffer, sessionId, req.user._id);
    
    // Then, create players from the CSV data
    const createdPlayers = await createPlayersFromCSV(sessionId, req.user._id);
    console.log("Created players:", createdPlayers);

    // Finally, get the updated session with its sessionData
    const updatedSession = await SessionCollection.findById(sessionId).populate('sessionData');
    res.status(201).json(updatedSession);
  } catch (error) {
    console.error("🚨 Error processing CSV:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// @desc   Get sessionCollection profile
// @route  GET /api/sessionCollections/profile
// @access Protected
const getSessionCollectionProfile = asyncHandler(async (req, res) => {
  const sessionCollection = await SessionCollection.findOne({ userId: req.user._id });
  if (sessionCollection) {
    res.status(200).json(sessionCollection);
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Update sessionCollection profile
// @route  PUT /api/sessionCollections/profile
// @access Protected
const updateSessionCollectionProfile = asyncHandler(async (req, res) => {
  const sessionCollection = await SessionCollection.findOne({ userId: req.user._id });
  if (sessionCollection) {
    sessionCollection.teamName = req.body.teamName || sessionCollection.teamName;
    sessionCollection.sessionName = req.body.sessionName || sessionCollection.sessionName;
    sessionCollection.date = req.body.date || sessionCollection.date;
    sessionCollection.type = req.body.type || sessionCollection.type;
    sessionCollection.duration = req.body.duration || sessionCollection.duration;
    sessionCollection.splits = req.body.splits || sessionCollection.splits;
    sessionCollection.notes = req.body.notes || sessionCollection.notes;

    const updatedSessionCollection = await sessionCollection.save();
    res.status(200).json(updatedSessionCollection);
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Get all sessionCollections for a user
// @route  GET /api/sessionCollections
// @access Protected/Admin
const getSessionCollections = asyncHandler(async (req, res) => {
  const sessionCollections = await SessionCollection.find({ userId: req.user._id });

  if (!sessionCollections || sessionCollections.length === 0) {
    res.status(404);
    throw new Error("No sessions found.");
  }

  res.status(200).json(sessionCollections);
});

// @desc   Get sessionCollection by ID
// @route  GET /api/sessionCollections/:id
// @access Protected/Admin
const getSessionCollectionByID = asyncHandler(async (req, res) => {
  const sessionCollection = await SessionCollection.findById(req.params.id);
  if (sessionCollection) {
    res.status(200).json(sessionCollection);
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Delete sessionCollection
// @route  DELETE /api/sessionCollections/:id
// @access Protected/Admin
const deleteSessionCollection = asyncHandler(async (req, res) => {
  const sessionCollection = await SessionCollection.findById(req.params.id);
  if (sessionCollection) {
    await SessionCollection.deleteOne({ _id: sessionCollection._id });
    res.status(200).json({ message: 'Session Collection deleted successfully' });
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Update sessionCollection by ID
// @route  PUT /api/sessionCollections/:id
// @access Protected/Admin
const updateSessionCollection = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes, csvData, ...others } = req.body;
  // Remove csvData or any extra fields not part of our schema.

  const sessionCollection = await SessionCollection.findById(req.params.id);

  if (!sessionCollection) {
    res.status(404);
    throw new Error("Session Collection not found");
  }

  if (teamName) sessionCollection.teamName = teamName;
  if (sessionName) sessionCollection.sessionName = sessionName;
  if (date) {
    // Convert date string (e.g., "2025-02-14") to a Unix timestamp
    const parsedDate = new Date(date).getTime();
    if (!isNaN(parsedDate)) {
      sessionCollection.date = parsedDate;
    }
  }
  if (type) sessionCollection.type = type;
  if (duration) sessionCollection.duration = duration;
  if (splits) sessionCollection.splits = splits;
  if (notes) sessionCollection.notes = notes;

  const updatedSessionCollection = await sessionCollection.save();

  res.status(200).json(updatedSessionCollection);
});

// =============================
// NEW: Delete all CSVs for a session
// This function deletes the CSV data and updates the session's "number" field to 0.
// =============================
const deleteAllSessionCSVs = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  if (!sessionId) {
    res.status(400);
    throw new Error("Session ID is required.");
  }
  
  // Delete all SessionData documents associated with this session
  await SessionData.deleteMany({ sessionId });
  
  // Clear the sessionData array and update the "number" field in the SessionCollection document
  const session = await SessionCollection.findByIdAndUpdate(
    sessionId,
    { sessionData: [], number: 0 }, // Set number to 0 to reflect deletion
    { new: true }
  );
  
  if (!session) {
    res.status(404);
    throw new Error("Session not found.");
  }
  
  res.status(200).json({ message: 'All CSV data deleted', session });
});

export {
  registerSessionCollection,
  uploadSessionCSV,
  getSessionCollectionProfile,
  updateSessionCollectionProfile,
  getSessionCollections,
  getSessionCollectionByID,
  deleteSessionCollection,
  updateSessionCollection,
  deleteAllSessionCSVs,
};
