import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  // Allowed origins: localhost for development, and your deployed domain for production
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:3000',          // for local dev
        'https://trakko.onrender.com'      // for production
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  console.log('Socket.IO initialized');
  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};