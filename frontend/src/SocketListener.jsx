import React, { useEffect } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

// REACT_APP_BACKEND_URL is defined in your .env file.
// It will switch automatically based on NODE_ENV.
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const socket = io(BACKEND_URL, {
  transports: ['websocket'], // optional: force use of websocket
});

const SocketListener = () => {
  useEffect(() => {
    // Listen for the 'playerCreated' event from the backend
    socket.on('playerCreated', (data) => {
      toast.success(`New player created: ${data.playerName}`, { position: 'top-right' });
    });

    // Cleanup on component unmount
    return () => {
      socket.off('playerCreated');
    };
  }, []);

  return null; // No visual output
};

export default SocketListener;