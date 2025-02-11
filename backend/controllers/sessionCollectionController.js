import asyncHandler from '../middleware/asyncHandler.js';
import SessionCollection from '../models/sessionCollectionModel.js';
import SessionData from '../models/sessionDataModel.js';
import parseCSV from '../calculation/parseCSV.js';
import updateSessionCount from '../calculation/updateSessionCount.js';
import Team from '../models/teamModel.js';

// @desc   Register sessionCollection
// @route  POST /api/sessionCollections
// @access Protected
const registerSessionCollection = asyncHandler(async (req, res) => {
    const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
    const userId = req.user._id; // Gets the logged-in user's ID

    // Validate and parse the date
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
        number: 1, // Default to 1 on creation
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
// @access Private
const uploadSessionCSV = asyncHandler(async (req, res) => {
    const { sessionId } = req.body;
    const userId = req.user._id;

    if (!req.file) {
        res.status(400);
        throw new Error("No file uploaded.");
    }

    const filePath = req.file.path;

    try {
        // Parses the CSV file
        const { startTime, endTime, lats, lons, speeds } = await parseCSV(filePath);

        // Create a new sessionData entry
        const sessionDataEntry = await SessionData.create({
            userId,
            startTime,
            endTime,
            lats,
            lons,
            speeds
        });

        // Adds sessionData ID to the sessionCollection
        const sessionCollection = await SessionCollection.findById(sessionId);
        if (!sessionCollection) {
            res.status(404);
            throw new Error("Session Collection not found.");
        }

        sessionCollection.sessionData.push(sessionDataEntry._id);
        await sessionCollection.save();

        // Updates session count for this user
        await updateSessionCount(userId);

        res.status(201).json({ message: "CSV processed successfully", sessionDataEntry });
    } catch (error) {
        res.status(500);
        throw new Error(`Error processing CSV: ${error.message}`);
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
    const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
    const sessionCollection = await SessionCollection.findById(req.params.id);

    if (!sessionCollection) {
        res.status(404);
        throw new Error("Session Collection not found");
    }

    // Ensure only provided fields are updated
    if (teamName) sessionCollection.teamName = teamName;
    if (sessionName) sessionCollection.sessionName = sessionName;
    if (date) sessionCollection.date = date;
    if (type) sessionCollection.type = type;
    if (duration) sessionCollection.duration = duration;
    if (splits) sessionCollection.splits = splits;
    if (notes) sessionCollection.notes = notes;

    const updatedSessionCollection = await sessionCollection.save();

    res.status(200).json(updatedSessionCollection);
});

// Export controllers
export {
    registerSessionCollection,
    uploadSessionCSV,
    getSessionCollectionProfile,
    updateSessionCollectionProfile,
    getSessionCollections,
    getSessionCollectionByID,
    deleteSessionCollection,
    updateSessionCollection
};
