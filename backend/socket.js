// backend/socket.js
import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://16.171.33.149:3000', 
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
  });

  console.log('Socket.IO initialized');
  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized!');
  return io;
};
