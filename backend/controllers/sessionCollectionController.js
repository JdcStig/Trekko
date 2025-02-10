import { response } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import SessionCollection from '../models/sessionCollectionModel.js';
import Team from '../models/teamModel.js';


// @desc   Register sessionCollection
// @route  POST /api/sessionCollections
// @access Public
const registerSessionCollection = asyncHandler(async (req, res) => {
    const { teamName, sessionName, date, type, duration, splits, notes } = req.body;
    const userId = req.user._id; // Gets the logged-in user's ID

    const team = await Team.findOne({ name: teamName, userId });

    if (!team) {
        res.status(400);
        throw new Error("Team does not exist");
    }

    const sessionCollection = await SessionCollection.create({
        teamName,
        sessionName,
        date,
        type,
        duration,
        splits,
        notes,
        userId,
    });

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
            userId: sessionCollection.userId,
           });
    } else {
        res.status(400);
        throw new Error('Invalid session Collection data');
    }
});

// @desc   Get sessionCollection profile
// @route  GET /api/sessionCollections/profile
// @access Private
const getSessionCollectionProfile = asyncHandler(async (req, res) => {
    const sessionCollection = await SessionCollection.findById(req.sessionCollection._id);

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
// @access Private
const updateSessionCollectionProfile = asyncHandler(async (req, res) => {
    const sessionCollection = await SessionCollection.findById(req.sessionCollection._id);

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
        teamName: updateSessionCollection.teamName,
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
// @access Private/Admin
const getSessionCollections = asyncHandler(async (req, res) => {
    const sessionCollections = await SessionCollection.find({ userId: req.user._id }); // Only returns user's session Collections
    res.status(200).json(sessionCollections);
});

// @desc   Get sessionCollection by ID
// @route  GET /api/sessionCollections/:id
// @access Private/Admin
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
// @access Private/Admin
const deleteSessionCollection = asyncHandler(async (req, res) => {
   const sessionCollection = await SessionCollection.findById(req.params.id);

   if (sessionCollection) {
    await SessionCollection.deleteOne({_id: sessionCollection._id})
    res.status(200).json({ message: 'Session Collection deleted successfully'})
   } else {
    res.status(404);
    throw new Error('Session Collection not found');
   }
});

// @desc   Update sessionCollections
// @route  PUT /api/sessionCollections/:id
// @access Private/Admin
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





export{
    registerSessionCollection,
    getSessionCollectionProfile,
    updateSessionCollectionProfile,
    getSessionCollections,
    deleteSessionCollection,
    updateSessionCollection,
}