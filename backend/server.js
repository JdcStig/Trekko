import express from 'express';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config();

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import userRoutes from './routes/userRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import playByPlayAnalysisRoutes from './routes/playByPlayAnalysisRoutes.js';
import { initSocket } from './socket.js';
import forceVelocityRoutes from './routes/forceVelocityRoutes.js';

const app = express();
const port = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Setup CORS
if (process.env.NODE_ENV === 'production') {
  // Production: allow only your production CLIENT_URL
  app.use(
    cors({
      origin: process.env.CLIENT_URL, // e.g., https://trakko.onrender.com
      credentials: true,
    })
  );
} else {
  // Development: allow localhost + any dev URLs
  app.use(
    cors({
      origin: ['http://localhost:3000', 'https://trakko.onrender.com'],
      credentials: true,
    })
  );
}

// =============== API Routes ===============
// e.g., /api/users, /api/players, /api/teams, /api/sessions
app.use('/api/users', userRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/playbyplayanalysis', playByPlayAnalysisRoutes);
app.use('/api/forcevelocity', forceVelocityRoutes);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.resolve();
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  app.get('*', (req, res) =>
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'))
  );
} else {
  app.get('/', (req, res) => {
    res.send('API is running...');
  });
}

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Create HTTP server and initialize Socket.IO
const server = http.createServer(app);
initSocket(server);

// Start the server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
