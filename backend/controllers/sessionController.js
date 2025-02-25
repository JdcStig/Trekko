// import asyncHandler from '../middleware/asyncHandler.js';
// import Session from '../models/sessionModel.js';
// import SessionPlayerData from '../models/sessionPlayerDataModel.js';
// import parseCSV from '../calculation/parseCSV.js';
// import Team from '../models/teamModel.js';
// import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
// import calculateAverageDistance from '../calculation/calculateAverageDistance.js';

// // @desc   Register session
// // @route  POST /api/sessions
// // @access Protected
// const registerSession = asyncHandler(async (req, res) => {
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

//   // Forces splits to unix format if provided (hours, minutes and seconds)
//   if (splits && Array.isArray(splits)) {
//     splits.forEach(split => {
//       if (!split.title) {
//         res.status(400);
//         throw new Error(`Split title is required.`);
//       }
//       if (typeof split.start !== 'number') {
//         split.start = Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
//       }
//       if (typeof split.end !== 'number') {
//         split.end = Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
//       }
//     });
//   }

//   const session = await Session.create({
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

//   if (session) {
//     res.status(200).json(session);
//   } else {
//     res.status(400);
//     throw new Error("Invalid session collection data");
//   }
// });

// // Metrics Calculation Object
// const metricsCalculations = {
//   Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000, // Sum in km
//   TopSpeed: (values) => Math.max(...values), // Max speed
//   HighSpeedRunning: (values) => (values.filter(v => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000, // Sum >5.5 m/s
//   Sprinting: (values) => (values.filter(v => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000 // Sum >7 m/s
// };

// // @desc   Upload and process session CSV
// // @route  POST /api/sessions/upload
// // @access Protected
// const uploadSessionCSV = asyncHandler(async (req, res) => {
//   console.log("📌 Received CSV upload request for session:", req.body.sessionId);
//   const startTime = Date.now();

//   const { sessionId } = req.body;
//   if (!sessionId) {
//     console.error("🚨 No session ID provided!");
//     return res.status(400).json({ message: "Session ID is required." });
//   }

//   if (!req.file) {
//     console.error("🚨 No file uploaded!");
//     return res.status(400).json({ message: "No file uploaded." });
//   }

//   console.log(`✅ File received: ${req.file.originalname} | Size: ${req.file.size} bytes`);

//   try {
//     console.log("⏳ Parsing CSV...");
//     const parseStart = Date.now();
//     await parseCSV(req.file.buffer, sessionId, req.user._id);
//     console.log(`✅ CSV parsing completed in ${Date.now() - parseStart}ms`);

//     console.log("🔎 Fetching session from DB...");
//     const sessionFetchStart = Date.now();
//     const session = await Session.findById(sessionId);
//     console.log(`✅ Session fetched in ${Date.now() - sessionFetchStart}ms`);

//     if (session) {
//       console.log("🔄 Processing session player data...");
//       for (let data of session.sessionPlayerData) {
//         console.log(`🔹 Processing player data for ID: ${data._id}`);
//         console.log(`🔹 Processing player data for ID: ${data._id}`);
//         const playerData = await SessionPlayerData.findById(data._id);
        
//         if (!playerData || !Array.isArray(playerData.speeds)) {
//             console.error(`🚨 Missing speeds array for player: ${data._id}`);
//             continue; // Skip this entry
//         }
//         const speeds = playerData.speeds.length ? playerData.speeds : [0];
//         console.log("📊 Calculating player metrics...");
//         const metricsStart = Date.now();
//         const sessionPlayerMetrics = Object.keys(metricsCalculations).map(metric => ({
//           MetricName: metric,
//           Value: metricsCalculations[metric](speeds),
//           Unit: metric === 'TopSpeed' ? 'm/s' : 'km'
//         }));
//         console.log(`✅ Metrics calculated in ${Date.now() - metricsStart}ms`);

//         console.log("📊 Calculating split metrics...");
//         const splitMetricsStart = Date.now();
//         const splitPlayerMetrics = session.splits.map((split, index) => {
//           const splitSpeeds = speeds.slice(split.start, split.end);
//           const splitMetrics = Object.keys(metricsCalculations).map(metric => ({
//             MetricName: metric,
//             Value: metricsCalculations[metric](splitSpeeds),
//             Unit: metric === 'TopSpeed' ? 'm/s' : 'km'
//           }));
//           return { SplitNumber: index + 1, SplitMetrics: splitMetrics };
//         });
//         console.log(`✅ Split metrics calculated in ${Date.now() - splitMetricsStart}ms`);

//         data.sessionPlayerMetrics = sessionPlayerMetrics;
//         data.splitPlayerMetrics = splitPlayerMetrics;
//       }

//       console.log("💾 Saving session...");
//       const saveStart = Date.now();
//       await session.save();
//       console.log(`✅ Session saved in ${Date.now() - saveStart}ms`);
//     }

//     console.log("🔄 Recalculating average distance...");
//     const avgDistanceStart = Date.now();
//     await calculateAverageDistance(sessionId);
//     console.log(`✅ Average distance recalculated in ${Date.now() - avgDistanceStart}ms`);

//     console.log("🛠️ Creating players from CSV...");
//     const createPlayersStart = Date.now();
//     await createPlayersFromCSV(sessionId, req.user._id);
//     console.log(`✅ Players created in ${Date.now() - createPlayersStart}ms`);

//     console.log("📦 Fetching updated session...");
//     const updatedSessionStart = Date.now();
//     const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
//     console.log(`✅ Updated session fetched in ${Date.now() - updatedSessionStart}ms`);

//     console.log(`🚀 CSV processing completed in ${Date.now() - startTime}ms`);
//     res.status(201).json(updatedSession);
//   } catch (error) {
//     console.error("🚨 Error processing CSV:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// });


// // @desc   Get session profile
// // @route  GET /api/sessions/profile
// // @access Protected
// const getSessionProfile = asyncHandler(async (req, res) => {
//   const session = await Session.findOne({ userId: req.user._id });
//   if (session) {
//     res.status(200).json(session);
//   } else {
//     res.status(404);
//     throw new Error('Session Collection not found');
//   }
// });

// // @desc   Update session profile
// // @route  PUT /api/sessions/profile
// // @access Protected
// const updateSessionProfile = asyncHandler(async (req, res) => {
//   const session = await Session.findOne({ userId: req.user._id });
//   if (session) {
//     session.teamName = req.body.teamName || session.teamName;
//     session.sessionName = req.body.sessionName || session.sessionName;
//     session.date = req.body.date || session.date;
//     session.type = req.body.type || session.type;
//     session.duration = req.body.duration || session.duration;
//     session.splits = req.body.splits || session.splits;
//     session.notes = req.body.notes || session.notes;

//     const updatedSession = await session.save();
//     res.status(200).json(updatedSession);
//   } else {
//     res.status(404);
//     throw new Error('Session Collection not found');
//   }
// });

// // @desc   Get all sessions for a user
// // @route  GET /api/sessions
// // @access Protected/Admin
// const getSessions = asyncHandler(async (req, res) => {
//   const sessions = await Session.find({ userId: req.user._id });

//   if (!sessions || sessions.length === 0) {
//     res.status(404);
//     throw new Error("No sessions found.");
//   }

//   res.status(200).json(sessions);
// });

// // @desc   Get session by ID
// // @route  GET /api/sessions/:id
// // @access Protected/Admin
// const getSessionByID = asyncHandler(async (req, res) => {
//   const session = await Session.findById(req.params.id);
//   if (session) {
//     res.status(200).json(session);
//   } else {
//     res.status(404);
//     throw new Error('Session Collection not found');
//   }
// });

// // @desc   Delete session
// // @route  DELETE /api/sessions/:id
// // @access Protected/Admin
// const deleteSession = asyncHandler(async (req, res) => {
//   const session = await Session.findById(req.params.id);
//   if (session) {
//     await SessionPlayerData.deleteMany({ sessionId: session._id });
//     await Session.deleteOne({ _id: session._id });
//     res.status(200).json({ message: 'Session Collection deleted successfully' });
//   } else {
//     res.status(404);
//     throw new Error('Session Collection not found');
//   }
// });

// // @desc   Update session by ID
// // @route  PUT /api/sessions/:id
// // @access Protected/Admin
// const updateSession = asyncHandler(async (req, res) => {
//   const { teamName, sessionName, date, type, duration, splits, notes, csvData, ...others } = req.body;

//   const session = await Session.findById(req.params.id);
//   if (!session) {
//     res.status(404);
//     throw new Error("Session not found");
//   }

//   // If splits are provided and are an array, convert each split properly.
//   if (splits && Array.isArray(splits)) {
//     const convertedSplits = splits.map((split, index) => {
//       // Ensure the split has a title.
//       if (!split.title) {
//         res.status(400);
//         throw new Error("Split title is required.");
//       }
//       // Convert start and end to numbers (unix seconds) if they aren't already.
//       const start = typeof split.start === "number" 
//         ? split.start 
//         : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
//       const end = typeof split.end === "number" 
//         ? split.end 
//         : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);

//       return {
//         title: split.title,
//         splitNumber: index + 1,
//         start,
//         end,
//       };
//     });
//     session.splits = convertedSplits;
//   }

//   if (teamName) session.teamName = teamName;
//   if (sessionName) session.sessionName = sessionName;
//   if (date) {
//     const parsedDate = new Date(date).getTime();
//     if (!isNaN(parsedDate)) {
//       session.date = parsedDate;
//     }
//   }
//   if (type) session.type = type;
//   if (duration) session.duration = Number(duration);
//   if (notes) session.notes = notes;

//   const updatedSession = await session.save();
//   res.status(200).json(updatedSession);
// });

// // =============================
// // NEW: Delete all CSVs for a session
// // This function deletes the CSV data and updates the session's "number" field to 0.
// // =============================
// const deleteAllSessionCSVs = asyncHandler(async (req, res) => {
//   const sessionId = req.params.id;
//   if (!sessionId) {
//     res.status(400);
//     throw new Error("Session ID is required.");
//   }
  
//   // Delete all SessionPlayerData documents associated with this session
//   await SessionPlayerData.deleteMany({ sessionId });
  
//   // Clear the sessionPlayerData array, update the "number" field to 0, 
//   // and reset the avgDistance field to 0 in the Session document
//   const session = await Session.findByIdAndUpdate(
//     sessionId,
//     { sessionPlayerData: [], number: 0, avgDistance: 0 },
//     { new: true }
//   );
  
//   if (!session) {
//     res.status(404);
//     throw new Error("Session not found.");
//   }
  
//   res.status(200).json({ message: 'All CSV data deleted', session });
// });

// export {
//   registerSession,
//   uploadSessionCSV,
//   getSessionProfile,
//   updateSessionProfile,
//   getSessions,
//   getSessionByID,
//   deleteSession,
//   updateSession,
//   deleteAllSessionCSVs,
// };
// sessionController.js

import asyncHandler from '../middleware/asyncHandler.js';
import mongoose from 'mongoose';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

import Session from '../models/sessionModel.js';
import SessionPlayerData from '../models/sessionPlayerDataModel.js';
import Team from '../models/teamModel.js';

import createPlayersFromCSV from '../calculation/createPlayersFromCSV.js';
import calculateAverageDistance from '../calculation/calculateAverageDistance.js';

// ====================== Metrics Calculation Helpers ======================
const metricsCalculations = {
  Distance: (values) => (values.reduce((acc, val) => acc + val, 0) / 10) / 1000, // sum in km
  TopSpeed: (values) => Math.max(...values), // max speed
  HighSpeedRunning: (values) =>
    (values.filter((v) => v > 5.5).reduce((acc, val) => acc + val, 0) / 10) / 1000, // sum > 5.5 m/s
  Sprinting: (values) =>
    (values.filter((v) => v > 7).reduce((acc, val) => acc + val, 0) / 10) / 1000, // sum > 7 m/s
};

// ====================== parseCSV ======================
// This function does a single-pass parsing of the CSV file:
//   1. It groups rows by player (using the column "Player Display Name").
//   2. It uses the "Speed (m/s)" column (and optionally others if available)
//      to build an object per player.
//   3. It then inserts one SessionPlayerData document per player,
//      calculates per‑player metrics, attaches them to the Session document,
//      creates any missing players, and recalculates average distance.
const parseCSV = async (fileBuffer, sessionId, userId) => {
  console.log(`📌 [parseCSV] Start for session=${sessionId} | user=${userId}`);

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Uploaded file is empty.");
  }
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    throw new Error("Invalid session ID.");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID.");
  }

  // 1) Convert buffer to string & detect delimiter
  const fileString = fileBuffer.toString('utf-8');
  let delimiter = ',';
  if (fileString.includes('\t')) delimiter = '\t';
  else if (fileString.includes(';')) delimiter = ';';
  else if (fileString.includes('  ')) delimiter = ' ';
  console.log(`🔍 [parseCSV] Detected delimiter: "${delimiter}"`);

  // 2) Parse CSV rows into an array of objects
  const rows = [];
  await new Promise((resolve, reject) => {
    Readable.from(fileString)
      .pipe(csvParser({ separator: delimiter, trim: true }))
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });
  console.log(`✅ [parseCSV] CSV parsed. Total rows: ${rows.length}`);
  if (!rows.length) {
    throw new Error("CSV is empty or could not be parsed.");
  }

  // 3) Fetch the session from DB
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 4) Build in-memory data for each player.
  // Note: We use the header "Player Display Name" (as in your old code) and "Speed (m/s)".
  // If available, we also grab Latitude, Longitude, Heart Rate, and Acceleration.
  console.log("🔄 [parseCSV] Building in-memory data for each player...");
  const playersData = {}; // key: playerId

  rows.forEach((row) => {
    // Use the working header from your old code.
    const playerId = row['Player Display Name'] || 'Unknown Player';
    // Use "Speed (m/s)" from CSV.
    const speed = parseFloat(row['Speed (m/s)']) || 0;
    // Optionally capture additional columns if they exist.
    const lat = parseFloat(row['Latitude']) || 0;
    const lon = parseFloat(row['Longitude']) || 0;
    const hr = parseFloat(row['Heart Rate']) || 0;
    const accel = parseFloat(row['Acceleration (m/s^2)']) || 0;
    // For time, try "UTC Date" and "UTC Time"; if not present, use current date.
    const dateStr = row['UTC Date'];
    const timeStr = row['UTC Time'];
    let combinedDateTime = (dateStr && timeStr)
      ? new Date(`${dateStr}T${timeStr}Z`)
      : new Date();

    // Initialize object if needed.
    if (!playersData[playerId]) {
      playersData[playerId] = {
        userId,
        sessionId,
        playerId,
        times: [],
        lats: [],
        lons: [],
        speeds: [],
        heartRates: [],
        accelerations: [],
      };
    }
    playersData[playerId].times.push(combinedDateTime);
    playersData[playerId].lats.push(lat);
    playersData[playerId].lons.push(lon);
    playersData[playerId].speeds.push(speed);
    playersData[playerId].heartRates.push(hr);
    playersData[playerId].accelerations.push(accel);
  });

  // 5) Prepare documents for insertion (one per unique player)
  console.log("💾 [parseCSV] Preparing SessionPlayerData documents for insertion...");
  const insertArray = [];
  for (const [playerId, pdata] of Object.entries(playersData)) {
    // Determine startTime (earliest) and endTime (latest) from times array.
    const sortedTimes = pdata.times.sort((a, b) => a - b);
    const startTime = sortedTimes[0] || new Date();
    const endTime = sortedTimes[sortedTimes.length - 1] || new Date();
    insertArray.push({
      userId,
      sessionId,
      playerId,
      startTime,
      endTime,
      lats: pdata.lats,
      lons: pdata.lons,
      speeds: pdata.speeds,
      heartRates: pdata.heartRates,
      accelerationImpulses: pdata.accelerations,
    });
  }
  if (!insertArray.length) {
    console.log("✅ [parseCSV] Inserted 0 SessionPlayerData documents. (No data?)");
  }
  const insertedDocs = await SessionPlayerData.insertMany(insertArray, { ordered: false });
  console.log(`✅ [parseCSV] Inserted ${insertedDocs.length} SessionPlayerData documents.`);

  // 6) Calculate metrics for each inserted document and update session.sessionPlayerData.
  console.log("📊 [parseCSV] Generating metrics and updating session...");
  session.sessionPlayerData = []; // Clear existing array.
  const allPlayerDocs = await SessionPlayerData.find({ sessionId });
  for (const doc of allPlayerDocs) {
    // Calculate metrics using the speeds array.
    const speeds = doc.speeds.length ? doc.speeds : [0];
    const sessionPlayerMetrics = [
      { MetricName: 'Distance', Value: metricsCalculations.Distance(speeds), Unit: 'km' },
      { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(speeds), Unit: 'm/s' },
      { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(speeds), Unit: 'km' },
      { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(speeds), Unit: 'km' },
    ];

    // If session.splits exists, calculate split metrics (naively using slice indices).
    const splitPlayerMetrics = (session.splits || []).map((split, index) => {
      const splitSpeeds = speeds.slice(split.start, split.end);
      const splitMetrics = [
        { MetricName: 'Distance', Value: metricsCalculations.Distance(splitSpeeds), Unit: 'km' },
        { MetricName: 'TopSpeed', Value: metricsCalculations.TopSpeed(splitSpeeds), Unit: 'm/s' },
        { MetricName: 'HighSpeedRunning', Value: metricsCalculations.HighSpeedRunning(splitSpeeds), Unit: 'km' },
        { MetricName: 'Sprinting', Value: metricsCalculations.Sprinting(splitSpeeds), Unit: 'km' },
      ];
      return { SplitNumber: index + 1, SplitMetrics: splitMetrics };
    });

    session.sessionPlayerData.push({
      csvId: doc._id,
      playerName: doc.playerId,
      sessionPlayerMetrics,
      splitPlayerMetrics,
    });
  }
  await session.save();
  console.log("✅ [parseCSV] Session updated with CSV metrics.");

  // 7) Create any missing players (only once)
  console.log("🛠️ [parseCSV] Creating any missing players...");
  await createPlayersFromCSV(sessionId, userId);
  console.log("✅ [parseCSV] createPlayersFromCSV done.");

  // 8) Recalculate average distance for the session
  console.log("🔄 [parseCSV] Recalculating average distance...");
  await calculateAverageDistance(sessionId);
  console.log("✅ [parseCSV] Average distance updated.");

  // 9) Fetch and return the updated session (populated with sessionPlayerData)
  const updatedSession = await Session.findById(sessionId).populate('sessionPlayerData');
  console.log("🚀 [parseCSV] Done. Returning updated session.");
  return updatedSession;
};

// ====================== POST /api/sessions/upload ======================
// Route handler to upload and process a CSV file for a session.
export const uploadSessionCSV = asyncHandler(async (req, res) => {
  console.log('📌 Received CSV upload request for session:', req.body.sessionId);
  const { sessionId } = req.body;
  if (!sessionId) {
    console.error('🚨 No session ID provided!');
    return res.status(400).json({ message: 'Session ID is required.' });
  }
  if (!req.file) {
    console.error('🚨 No file uploaded!');
    return res.status(400).json({ message: 'No file uploaded.' });
  }
  console.log(`✅ File received: ${req.file.originalname} | Size: ${req.file.size} bytes`);

  // Validate sessionId
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    console.error('🚨 Invalid sessionId:', sessionId);
    return res.status(400).json({ message: 'Invalid session ID.' });
  }

  // Process CSV file (single pass)
  try {
    const updatedSession = await parseCSV(req.file.buffer, sessionId, req.user._id);
    console.log('🚀 CSV processing complete! Returning updated session.');
    return res.status(201).json(updatedSession);
  } catch (error) {
    console.error('🚨 Error processing CSV:', error.message);
    return res.status(500).json({ message: error.message });
  }
});

// ====================== POST /api/sessions (Create Session) ======================
export const registerSession = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
  const userId = req.user._id;
  // Validate date
  let parsedDate;
  if (typeof date === 'string') {
    parsedDate = new Date(date).getTime();
  } else if (typeof date === 'number') {
    parsedDate = date;
  } else {
    res.status(400);
    throw new Error('Invalid date format. Please send a valid date.');
  }
  if (isNaN(parsedDate)) {
    res.status(400);
    throw new Error('Invalid date format. Could not parse date.');
  }
  // Check team exists
  const team = await Team.findOne({ name: teamName, userId });
  if (!team) {
    res.status(400);
    throw new Error('Team does not exist. Please create a team first.');
  }
  // Convert splits if provided
  let processedSplits = [];
  if (splits && Array.isArray(splits)) {
    processedSplits = splits.map((split, i) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const startSec =
        typeof split.start === 'number'
          ? split.start
          : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      const endSec =
        typeof split.end === 'number'
          ? split.end
          : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
      return {
        title: split.title,
        splitNumber: i + 1,
        start: startSec,
        end: endSec,
      };
    });
  }
  const session = await Session.create({
    teamName,
    sessionName,
    date: parsedDate,
    type,
    duration,
    splits: processedSplits,
    notes,
    userId,
    number: 0,
  });
  if (session) {
    return res.status(200).json(session);
  } else {
    res.status(400);
    throw new Error('Invalid session data');
  }
});

// ====================== GET /api/sessions (Get All Sessions) ======================
export const getSessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id });
  if (!sessions || sessions.length === 0) {
    res.status(404);
    throw new Error('No sessions found.');
  }
  res.status(200).json(sessions);
});

// ====================== GET /api/sessions/:id (Get Session by ID) ======================
export const getSessionByID = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (session) {
    res.status(200).json(session);
  } else {
    res.status(404);
    throw new Error('Session not found');
  }
});

// ====================== DELETE /api/sessions/:id (Delete Session) ======================
export const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  await SessionPlayerData.deleteMany({ sessionId: session._id });
  await Session.deleteOne({ _id: session._id });
  res.status(200).json({ message: 'Session deleted successfully' });
});

// ====================== PUT /api/sessions/:id (Update Session) ======================
export const updateSession = asyncHandler(async (req, res) => {
  const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
  const session = await Session.findById(req.params.id);
  if (!session) {
    res.status(404);
    throw new Error('Session not found');
  }
  // Convert splits if provided
  let processedSplits = [];
  if (splits && Array.isArray(splits)) {
    processedSplits = splits.map((split, i) => {
      if (!split.title) {
        res.status(400);
        throw new Error('Split title is required.');
      }
      const startSec =
        typeof split.start === 'number'
          ? split.start
          : Math.floor(new Date(`1970-01-01T${split.start}`).getTime() / 1000);
      const endSec =
        typeof split.end === 'number'
          ? split.end
          : Math.floor(new Date(`1970-01-01T${split.end}`).getTime() / 1000);
      return {
        title: split.title,
        splitNumber: i + 1,
        start: startSec,
        end: endSec,
      };
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
  if (duration) session.duration = Number(duration);
  if (notes) session.notes = notes;
  if (processedSplits.length) session.splits = processedSplits;

  const updatedSession = await session.save();
  res.status(200).json(updatedSession);
});

// ====================== DELETE /api/sessions/:id/csvs/all (Delete All CSV Data) ======================
export const deleteAllSessionCSVs = asyncHandler(async (req, res) => {
  const sessionId = req.params.id;
  if (!sessionId) {
    res.status(400);
    throw new Error('Session ID is required.');
  }
  await SessionPlayerData.deleteMany({ sessionId });
  const session = await Session.findByIdAndUpdate(
    sessionId,
    { sessionPlayerData: [], number: 0, avgDistance: 0 },
    { new: true }
  );
  if (!session) {
    res.status(404);
    throw new Error('Session not found.');
  }
  res.status(200).json({ message: 'All CSV data deleted', session });
});
