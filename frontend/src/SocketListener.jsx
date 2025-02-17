import React, { useEffect } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

// Change the URL to your backend URL if needed.
const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000');

const SocketListener = () => {
  useEffect(() => {
    socket.on('playerCreated', ({ playerName }) => {
      toast.success(`New player created: ${playerName}`, { position: 'top-right' });
    });

    // Cleanup the event listener on unmount
    return () => {
      socket.off('playerCreated');
    };
  }, []);

  return null;
};

export default SocketListener;
