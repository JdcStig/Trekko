import { response } from 'express';
import asyncHandler from '../middleware/asyncHandler.js';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import bcrypt from 'bcryptjs'; 

// @desc   Auth user & get token
// @route  POST /api/users/login
// @access Public
const authUser = asyncHandler(async (req, res) => {
    // Takes out the email and password
    const { email, password } = req.body;

    //console.log('------- Backend received:', email, password);

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        generateToken(res, user._id);

        res.status(200).json({
         _id: user._id,
         id: user.id,
         name: user.name,
         email: user.email,
        });
    } else {
      res.status(401);
      throw new Error('Invalid email or password');
    }
});





// @desc   Authenticate user via Google
// @route  POST /api/users/google-auth
// @access Public
const googleAuthUser = asyncHandler(async (req, res) => {
    const { email, name, googleId } = req.body;
    let user = await User.findOne({ email });
  
    if (!user) {
      user = await User.create({
        id: googleId,
        name,
        email,
        password: googleId, // Dummy password for Google login
      });
    }
  
    generateToken(res, user._id);
    res.status(200).json({
      _id: user._id,
      id: user.id,
      name: user.name,
      email: user.email,
    });
  });






// @desc   Register user
// @route  POST /api/users
// @access Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    // Finds the highest `id` in the database
    const lastUser = await User.findOne().sort({ id: -1 });

    // Auto-increments the "id" (If no users exist, start from 1)
    const newId = lastUser ? lastUser.id + 1 : 1;

    const user = await User.create({
        id: newId, // Auto-incremented
        name,
        email,
        password,
    });

    if (user) {
       generateToken(res, user._id);

       res.status(201).json({
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
       }); 
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc   Logout user / clear cookie
// @route  POST /api/users/logout
// @access Private
const logoutUser = asyncHandler(async (req, res) => {
    res.cookie('jwt', '', {
        httpOnly: true,
        expires: new Date(0)
    });

    res.status(200).json({ message: 'Logged out successfully' });
});

// @desc   Get user profile
// @route  GET /api/users/profile
// @access Private
const getUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
       res.status(200).json({
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
       }); 
    } else {
      res.status(404);
      throw new Error('User not found');
    }
});

// @desc   Update user profile
// @route  PUT /api/users/profile
// @access Private
const updateUserProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
       user.name = req.body.name || user.name; 
       user.email = req.body.email || user.email; 

       if (req.body.password) {
        user.password = req.body.password;
       }

       const updatedUser = await user.save();

       res.status(200).json({
        _id: updatedUser._id,
        id: user.id,
        name: updateUser.name,
        email: updatedUser.email,
       });
    } else {
      res.status(404);
      throw new Error('User not found');  
    }
});

// @desc   Get users
// @route  GET /api/users
// @access Private/Admin
const getUsers = asyncHandler(async (req, res) => {
    const users = await User.find({});
    res.status(200).json(users);
});

// @desc   Get user by ID
// @route  GET /api/users/:id
// @access Private/Admin
const getUserByID = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');

    if (user) {
        res.status(200).json(user);
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// @desc   Delete users
// @route  DELETE /api/users/:id
// @access Private/Admin
const deleteUser = asyncHandler(async (req, res) => {
   const user = await User.findById(req.params.id);

   if (user) {
    // if (user.isAdmin) {
    //    res.status(400);
    //    throw new Error('Cannot delete admin user')
    // }
    await User.deleteOne({_id: user._id})
    res.status(200).json({ message: 'User deleted successfully'})
   } else {
    res.status(404);
    throw new Error('User not found');
   }
});

// @desc   Update users
// @route  PUT /api/users/:id
// @access Private/Admin
const updateUser = asyncHandler(async (req, res) => {
    const user = await User.findOne({ id: req.params.id }); // Uses id instead of _id

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;

        if (req.body.password) {
            user.password = req.body.password;  
        }

        const updatedUser = await user.save();

        res.status(200).json({
            _id: updatedUser._id,
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
        })
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

export{
    authUser,
    googleAuthUser,
    registerUser,
    logoutUser,
    getUserProfile,
    updateUserProfile,
    getUsers,
    getUserByID,
    deleteUser,
    updateUser,
}