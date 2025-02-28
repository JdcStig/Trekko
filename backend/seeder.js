import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/userModel.js';
import Player from './models/playerModel.js';
import Team from './models/teamModel.js';
import Session from './models/sessionModel.js';
import SessionPlayerData from './models/sessionPlayerDataModel.js';
import PlayByPlayAnalysis from './models/playByPlayAnalysisModel.js';
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

const sessions = [
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
    plays: [
      {
          title: 'Play 1',
          playNumber: 1,
          timeStart: 0,
          timeEnd: 0,
          teamStartPosession: 'Antrim',
          teamEndPosession: 'Offaly',
          turnovers: 1,
          startAction: 'Kickout',
          endAction: 'Kickout',
      }
  ],
    notes: '',
    sessionPlayerData: []
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
    plays: [
      {
          title: 'Play 1',
          playNumber: 2,
          timeStart: 5,
          timeEnd: 67,
          teamStartPosession: 'Offaly',
          teamEndPosession: 'Antrim',
          turnovers: 0,
          startAction: 'Kickout',
          endAction: 'Kickout',
      }
  ],
    notes: '',
    sessionPlayerData: []
},
];

const sessionPlayerDatas = [
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

const playByPlayAnalysis = [
   {
    timeStart: 0,
    timeEnd: 0,
    teamStartPosession: 'Antrim',
    teamEndPosession: 'Offaly',
    turnovers: 1,
    startAction: 'Kickout',
    endAction: 'Kickout',
    outcome: 'Shot',
   },  
   {
    timeStart: 0,
    timeEnd: 0,
    teamStartPosession: 'Offaly',
    teamEndPosession: 'Antrim',
    turnovers: 0,
    startAction: 'Kickout',
    endAction: 'Kickout',
    outcome: 'Free',
   }, 
];

const importData = async () => {
  try {
  //  await User.deleteMany(); // Clears previous users
  //  await User.insertMany(users); // Reinserts whats above
  //  await Player.deleteMany(); // Clears previous players
  //  await Player.insertMany(players); // Reinserts whats above
  //  await Team.deleteMany(); // Clears previous teams
  //  await Team.insertMany(teams); // Reinserts whats above
    await Session.deleteMany(); // Clears previous teams
    await Session.insertMany(sessions); // Reinserts whats above
  //  await SessionPlayerData.deleteMany(); // Clears previous teams
  //  await SessionPlayerData.insertMany(sessionPlayerDatas); // Reinserts whats above
    await PlayByPlayAnalysis.deleteMany(); // Clears previous teams
    await PlayByPlayAnalysis.insertMany(playByPlayAnalysis); // Reinserts whats above
    console.log("Seeded successfully");
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
