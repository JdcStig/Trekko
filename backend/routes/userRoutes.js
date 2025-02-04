import express from "express";
import asyncHandler from 'express-async-handler';
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

const router = express.Router();

/*
  @desc   Register a new user
  @route  POST /api/users
  @access Public
*/
router.route('/').post(registerUser);

/*
  @desc   Fetch all users from MongoDB
  @route  GET /api/users
  @access Public
*/
router.route('/').get(getUsers);

/*
  @desc   Authenticate user and get token
  @route  POST /api/users/auth
  @access Public
*/
router.post('/auth', authUser);

/*
  @desc   Logout user and clear cookie
  @route  POST /api/users/logout
  @access Public
*/
router.post('/logout', logoutUser);

/*
  @desc   Get or update the authenticated user's profile
  @route  GET /api/users/profile
          PUT /api/users/profile
  @access Private
*/
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

/*
  @desc   Delete, get, or update a user by ID
  @route  DELETE /api/users/:id
          GET /api/users/:id
          PUT /api/users/:id
  @access Private
*/
router.route('/:id')
  .delete(protect, deleteUser)
  .get(protect, getUserByID)
  .put(protect, updateUser);

export default router;
