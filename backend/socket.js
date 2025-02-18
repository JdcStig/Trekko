// import { Server } from 'socket.io';

// let io;

// export const initSocket = (server) => {
//   io = new Server(server, {
//     cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000' },
//   });
//   //console.log('Socket.IO initialized');
//   return io;
// };

// export const getIO = () => {
//   if (!io) {
//     throw new Error('Socket.io not initialized!');
//   }
//   return io;
// };





import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { 
      origin: process.env.CLIENT_URL || 'http://localhost:3000', // Use production CLIENT_URL
      methods: ['GET', 'POST']
    },
    // Optionally, enable secure settings if needed:
    // transports: ['websocket'] 
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