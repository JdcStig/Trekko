import express from 'express';
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
  googleAuthUser,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.route('/').post(registerUser).get(getUsers);
router.post('/auth', authUser);
router.post('/google-auth', googleAuthUser);
router.post('/logout', logoutUser); // Logout route

// Protected routes
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/:id')
  .delete(protect, deleteUser)
  .get(protect, getUserByID)
  .put(protect, updateUser);

export default router;
