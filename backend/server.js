import cors from 'cors';
import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

dotenv.config();

import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import productRoutes from './routes/productRoutes.js';
import squadRoutes from './routes/squadRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const port = process.env.PORT || 5000;

// Connect to the database
connectDB();

// Enable CORS for requests coming from your frontend including credentials for cookies
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));

// Middleware to parse JSON bodies and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

const __dirname = path.resolve();


//routes handle backend API endpoints
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/squads', squadRoutes);


app.use(express.static(path.join(__dirname, '/frontend/build')));


// For any GET request that doesn't start with "/api/" redirect  them to the index.html file
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '/frontend/build', 'index.html'));
  } else {
    res.status(404).send('API route not found');
  }
});


app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
