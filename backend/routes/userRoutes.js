import express from "express";
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

router.route('/').post(registerUser).get(protect, getUsers);
router.post('/logout', logoutUser);
router.post('/auth', authUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/:id').delete(protect, deleteUser).get(protect, getUserByID).put(protect, updateUser);


export default router;