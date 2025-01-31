import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import bcrypt from 'bcryptjs';

dotenv.config();
connectDB();

const users = [
  {
    id: 1,
    name: "Admin User",
    email: "admin@email.com",
    password: bcrypt.hashSync("123456", 10), 
  },
  {
    id: 2,
    name: "John Doe",
    email: "john@email.com",
    password: bcrypt.hashSync("password", 10),
  },
];

const importData = async () => {
  try {
    await User.deleteMany(); // Clears previous users
    await User.insertMany(users); // Reinserts whats above
    console.log("Seeded successfully");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
