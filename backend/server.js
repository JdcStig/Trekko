import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import teamRoutes from './routes/teamRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const port = process.env.PORT || 5000;

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// API routes (registered before static files)
app.use('/api/users', userRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);

// Serve static React files in production
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

app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
