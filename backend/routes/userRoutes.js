import express from "express";
import User from '../models/userModel.js';
import asyncHandler from 'express-async-handler';
const router = express.Router();
import {
    authUser,
    registerUser,
    logoutUser,
    getUserProfile,
    updateUserProfile,
    getUsers,
    getUserByID,
    deleteUser,
    updateUser,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';



// @desc   Fetch all users from MongoDB
// @route  GET /api/users
// @access Public
router.route('/').post(registerUser).get(getUsers); 


router.post('/logout', logoutUser);
router.post('/auth', authUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/:id').delete(protect, deleteUser).get(protect, getUserByID).put(protect, updateUser);

export default router;
