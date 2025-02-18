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
      origin: process.env.CLIENT_URL || 'http://localhost:3000', 
      methods: ['GET', 'POST']
    },
    // Optionally add transports or secure options if needed
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