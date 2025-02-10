import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import Player from './models/playerModel.js';
import Team from './models/teamModel.js';
import SessionCollection from './models/sessionCollectionModel.js';
import SessionData from './models/sessionDataModel.js';
import bcrypt from 'bcryptjs';

dotenv.config();
connectDB();

const users = [
  {
    name: "Admin User",
    email: "admin@email.com",
    password: bcrypt.hashSync("123456", 10), 
  },
  {
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

const sessionCollections = [
  {     
    teamName: "XPX1",
    sessionName: "Session1",
    date: Math.floor(Date.now() / 1000), 
    number: 1, 
    type: 'Training', 
    duration: '', 
    avgDistance: '20.0', 
    splits: [
        {
            title: 'Split 1',
            start: '',
            end: ''
        }
    ],
    notes: '',
    sessionData: []
},
{
    teamName: "XPX2",
    sessionName: "Session2",
    date: Math.floor(Date.now() / 1000),
    number: 1,
    type: 'Game',
    duration: '',
    avgDistance: '20.0',
    splits: [
        {
            title: 'Split 1',
            start: '',
            end: ''
        }
    ],
    notes: '',
    sessionData: []
},
];

const sessionDatas = [
  {      
    playerId: 'player1',  
    startTime: '00:00.0',  
    endTime: '10:00.0',  
    lats: ['lats'],  
    lons: ['lons'],  
    speeds: ['speeds'],  
},
{
    playerId: 'player2',
    startTime: '00:00.0',
    endTime: '10:00.0',
    lats: ['lats'],
    lons: ['lons'],
    speeds: ['speeds'],
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
    await SessionCollection.deleteMany(); // Clears previous teams
    await SessionCollection.insertMany(sessionCollections); // Reinserts whats above
    await SessionData.deleteMany(); // Clears previous teams
    await SessionData.insertMany(sessionDatas); // Reinserts whats above
    console.log("Seeded successfully");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
