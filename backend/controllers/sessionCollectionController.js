// backend/controllers/sessionCollectionController.js
import asyncHandler from '../middleware/asyncHandler.js';
import SessionCollection from '../models/sessionCollectionModel.js';
import Team from '../models/teamModel.js';

// @desc   Register sessionCollection
// @route  POST /api/sessionCollections
// @access Protected
const registerSessionCollection = asyncHandler(async (req, res) => {
    let { teamName, sessionName, date, type, duration, splits, notes } = req.body;
  
    if (!req.user) {
      res.status(401);
      throw new Error("User not authenticated");
    }
  
    const userId = req.user._id;
  
    // Validate and parse the date
    let parsedDate;
    if (typeof date === 'string') {
      parsedDate = new Date(date).getTime(); // Convert from string to UNIX timestamp
    } else if (typeof date === 'number') {
      parsedDate = date; // Already a valid timestamp
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
      date: parsedDate, // Store as UNIX timestamp
      type,
      duration,
      splits: Array.isArray(splits) ? splits : [], // Ensure splits is an array
      notes,
      userId,
    });
  
    if (sessionCollection) {
      res.status(201).json(sessionCollection);
    } else {
      res.status(400);
      throw new Error("Invalid session collection data");
    }
  });

// @desc   Get sessionCollection profile
// @route  GET /api/sessionCollections/profile
// @access Protected
const getSessionCollectionProfile = asyncHandler(async (req, res) => {
  // Look up the session collection by the logged-in user's ID
  const sessionCollection = await SessionCollection.findOne({ userId: req.user._id });
  if (sessionCollection) {
    res.status(200).json({
      _id: sessionCollection._id,
      teamName: sessionCollection.teamName,
      sessionName: sessionCollection.sessionName,
      date: sessionCollection.date,
      type: sessionCollection.type,
      duration: sessionCollection.duration,
      splits: sessionCollection.splits,
      notes: sessionCollection.notes,
    });
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Update sessionCollection profile
// @route  PUT /api/sessionCollections/profile
// @access Protected
const updateSessionCollectionProfile = asyncHandler(async (req, res) => {
  // Look up the session collection by the logged-in user's ID
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
    res.status(200).json({
      _id: updatedSessionCollection._id,
      teamName: updatedSessionCollection.teamName,
      sessionName: updatedSessionCollection.sessionName,
      date: updatedSessionCollection.date,
      type: updatedSessionCollection.type,
      duration: updatedSessionCollection.duration,
      splits: updatedSessionCollection.splits,
      notes: updatedSessionCollection.notes,
    });
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Get sessionCollections
// @route  GET /api/sessionCollections
// @access Protected/Admin
const getSessionCollections = asyncHandler(async (req, res) => {
    const sessionCollections = await SessionCollection.find({ userId: req.user._id });
  
    if (!sessionCollections) {
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

// @desc   Delete sessionCollections
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

// @desc   Update sessionCollections
// @route  PUT /api/sessionCollections/:id
// @access Protected/Admin
const updateSessionCollection = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
  const sessionCollection = await SessionCollection.findById(req.params.id);
  if (!sessionCollection) {
    res.status(404);
    throw new Error("Session Collection not found");
  }
  if (teamName) sessionCollection.teamName = teamName;
  if (sessionName) sessionCollection.sessionName = sessionName;
  if (date) sessionCollection.date = date;
  if (type) sessionCollection.type = type;
  if (duration) sessionCollection.duration = duration;
  if (splits) sessionCollection.splits = splits;
  if (notes) sessionCollection.notes = notes;

  const updatedSessionCollection = await sessionCollection.save();
  res.status(200).json({
    _id: updatedSessionCollection._id,
    teamName: updatedSessionCollection.teamName,
    sessionName: updatedSessionCollection.sessionName,
    date: updatedSessionCollection.date,
    type: updatedSessionCollection.type,
    duration: updatedSessionCollection.duration,
    splits: updatedSessionCollection.splits,
    notes: updatedSessionCollection.notes,
  });
});

export {
  registerSessionCollection,
  getSessionCollectionProfile,
  updateSessionCollectionProfile,
  getSessionCollections,
  deleteSessionCollection,
  updateSessionCollection,
  getSessionCollectionByID, // Exported if needed
};
