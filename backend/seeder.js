import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import Player from './models/playerModel.js';
import Squad from './models/squadModel.js';
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

const players = [
  {
    id: '1',
    name: 'XForward',
    position: 'Forward',
    teamId: "XPX1",
},
{
    id: '2',
    name: 'XStriker',
    position: 'Striker',
    teamId: "XPX2",
},
];


const squads = [
  {
    id: '1',
    name: 'XTeam 1',
    teamId: "XPX1",
},
{
    id: '2',
    name: 'XTeam 2',
    teamId: "XPX2",
},
];

const importData = async () => {
  try {
    await User.deleteMany(); // Clears previous users
    await User.insertMany(users); // Reinserts whats above
    await Player.deleteMany(); // Clears previous players
    await Player.insertMany(players); // Reinserts whats above
    await Squad.deleteMany(); // Clears previous squads
    await Squad.insertMany(squads); // Reinserts whats above
    console.log("Seeded successfully");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
