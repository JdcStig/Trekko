import asyncHandler from '../middleware/asyncHandler.js';
import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import parseCSV from '../calculation/parseCSV.js';
import Team from '../models/teamModel.js';
import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';

// @desc   Register session
// @route  POST /api/sessions
// @access Protected
const registerSession = asyncHandler(async (req, res) => {
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

  // Forces splits to unix format if provided (hours, minutes and seconds)
  if (splits && Array.isArray(splits)) {
    splits.forEach(split => {
      if (!split.title) {
        res.status(400);
        throw new Error(`Split title is required.`);
      }
      if (typeof split.start !== 'number') {
        split.start = Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      }
      if (typeof split.end !== 'number') {
        split.end = Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
      }
    });
  }

  const session = await Session.create({
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

  if (session) {
    res.status(200).json(session);
  } else {
    res.status(400);
    throw new Error("Invalid session collection data");
  }
});

// Metrics Calculation Object
const metricsCalculations = {
  Distance: (values) => values.reduce((acc, val) => acc + val, 0) / 1000, // Sum in km
  TopSpeed: (values) => Math.max(...values), // Max speed
  HighSpeedRunning: (values) => values.filter(v => v > 5.5).reduce((acc, val) => acc + val, 0) / 1000, // Sum >5.5 m/s
  Sprinting: (values) => values.filter(v => v > 7).reduce((acc, val) => acc + val, 0) / 1000 // Sum >7 m/s
};

// @desc   Upload and process session CSV
// @route  POST /api/sessions/upload
// @access Protected
const uploadSessionCSV = asyncHandler(async (req, res) => {
  //.log("📌 Received file upload request");

  const { sessionId } = req.body;


  if (!sessionId) {
    //console.error("🚨 No session ID provided!");
    return res.status(400).json({ message: "Session ID is required." });
  }

  if (!req.file) {
    //console.error("🚨 No file uploaded!");
    return res.status(400).json({ message: "No file uploaded." });
  }

  //console.log(`✅ File received: ${req.file.originalname}`);

  try {
    // Parse the CSV file and store session data
    await parseCSV(req.file.buffer, sessionId, req.user._id);

    const session = await Session.findById(sessionId);
    if (session) {
      for (let data of session.sessionPlayerData) {
        const playerData = await SessionPlayerData.findById(data._id);
        const speeds = playerData.speeds;

    // Creates sessionPlayerMetrics and splitPlayerMetrics
    const sessionPlayerMetrics = Object.keys(metricsCalculations).map(metric => ({
      MetricName: metric,
      Value: metricsCalculations[metric](speeds),
      Unit: metric === 'TopSpeed' ? 'm/s' : 'km'
    }));

    const splitPlayerMetrics = session.splits.map((split, index) => {
      const splitSpeeds = speeds.slice(split.start, split.end);
      const splitMetrics = Object.keys(metricsCalculations).map(metric => ({
        MetricName: metric,
        Value: metricsCalculations[metric](splitSpeeds),
        Unit: metric === 'TopSpeed' ? 'm/s' : 'km'
      }));
      return { SplitNumber: index + 1, SplitMetrics: splitMetrics };
    });

    // Updates sessionPlayerData array
    data.sessionPlayerMetrics = sessionPlayerMetrics; // 🆕 Added sessionPlayerMetrics
    data.splitPlayerMetrics = splitPlayerMetrics;     // 🆕 Added splitPlayerMetrics
  }
  await session.save();
}
    
    // Recalculate the average distance immediately after parsing CSV data
    await calculateAverageDistance(sessionId);

    // Optionally, create players from the CSV data if required
    const createdPlayers = await createPlayersFromCSV(sessionId, req.user._id);
    //console.log("Created players:", createdPlayers);

    // Get the updated session with its sessionPlayerData populated
    const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
    res.status(201).json(updatedSession);
  } catch (error) {
    //console.error("🚨 Error processing CSV:", error.message);
    res.status(500).json({ message: error.message });
  }
});

// @desc   Get session profile
// @route  GET /api/sessions/profile
// @access Protected
const getSessionProfile = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ userId: req.user._id });
  if (session) {
    res.status(200).json(session);
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Update session profile
// @route  PUT /api/sessions/profile
// @access Protected
const updateSessionProfile = asyncHandler(async (req, res) => {
  const session = await Session.findOne({ userId: req.user._id });
  if (session) {
    session.teamName = req.body.teamName || session.teamName;
    session.sessionName = req.body.sessionName || session.sessionName;
    session.date = req.body.date || session.date;
    session.type = req.body.type || session.type;
    session.duration = req.body.duration || session.duration;
    session.splits = req.body.splits || session.splits;
    session.notes = req.body.notes || session.notes;

    const updatedSession = await session.save();
    res.status(200).json(updatedSession);
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Get all sessions for a user
// @route  GET /api/sessions
// @access Protected/Admin
const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id });

  if (!sessions || sessions.length === 0) {
    res.status(404);
    throw new Error("No sessions found.");
  }

  res.status(200).json(sessions);
});

// @desc   Get session by ID
// @route  GET /api/sessions/:id
// @access Protected/Admin
const getSessionByID = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (session) {
    res.status(200).json(session);
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Delete session
// @route  DELETE /api/sessions/:id
// @access Protected/Admin
const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (session) {
    await Session.deleteOne({ _id: session._id });
    res.status(200).json({ message: 'Session Collection deleted successfully' });
  } else {
    res.status(404);
    throw new Error('Session Collection not found');
  }
});

// @desc   Update session by ID
// @route  PUT /api/sessions/:id
// @access Protected/Admin
const updateSession = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes, csvData, ...others } = req.body;
  // Remove csvData or any extra fields not part of our schema.

  const session = await Session.findById(req.params.id);

  if (!session) {
    res.status(404);
    throw new Error("Session not found");
  }

  session.splits = splits.map((split, index) => ({
    ...split,
    splitNumber: index + 1
  }));

  // Forces splits to unix format if provided (hours, minutes and seconds)
  if (splits && Array.isArray(splits)) {
    splits.forEach(split => {
      if (!split.title) {
        res.status(400);
        throw new Error(`Split title is required.`);
      }
      if (typeof split.start !== 'number') {
        split.start = Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      }
      if (typeof split.end !== 'number') {
        split.end = Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
      }
    });
  }

  if (teamName) session.teamName = teamName;
  if (sessionName) session.sessionName = sessionName;
  if (date) {
    const parsedDate = new Date(date).getTime();
    if (!isNaN(parsedDate)) {
      session.date = parsedDate;
    }
  }
  if (type) session.type = type;
  if (duration) session.duration = duration;
  if (splits) session.splits = splits;
  if (notes) session.notes = notes;

  const updatedSession = await session.save();

  res.status(200).json(updatedSession);
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
  
  // Delete all SessionPlayerData documents associated with this session
  await SessionPlayerData.deleteMany({ sessionId });
  
  // Clear the sessionPlayerData array, update the "number" field to 0, 
  // and reset the avgDistance field to 0 in the Session document
  const session = await Session.findByIdAndUpdate(
    sessionId,
    { sessionPlayerData: [], number: 0, avgDistance: 0 },
    { new: true }
  );
  
  if (!session) {
    res.status(404);
    throw new Error("Session not found.");
  }
  
  res.status(200).json({ message: 'All CSV data deleted', session });
});

export {
  registerSession,
  uploadSessionCSV,
  getSessionProfile,
  updateSessionProfile,
  getSessions,
  getSessionByID,
  deleteSession,
  updateSession,
  deleteAllSessionCSVs,
};
