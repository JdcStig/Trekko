import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import Player from './models/playerModel.js';
import Team from './models/teamModel.js';
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
    name: 'XForward',
    position: 'Forward',
    teamName: "XPX1",
},
{
    name: 'XStriker',
    position: 'Striker',
    teamName: "XPX2",
},
];


const teams = [
  {
    name: 'XTeam 1',
    sport: 'GAA',
},
{
    name: 'XTeam 2',
    sport: 'Soccer',
},
];

const importData = async () => {
  try {
    await User.deleteMany(); // Clears previous users
    await User.insertMany(users); // Reinserts whats above
    await Player.deleteMany(); // Clears previous players
    await Player.insertMany(players); // Reinserts whats above
    await Team.deleteMany(); // Clears previous teams
    await Team.insertMany(teams); // Reinserts whats above
    console.log("Seeded successfully");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
