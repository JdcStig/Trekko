// src/components/SocketListener.jsx
import React, { useEffect } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-toastify';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const socket = io(BACKEND_URL, {
  transports: ['websocket'],
  withCredentials: true,
});

const SocketListener = ({ onPlayerCreated }) => {
  useEffect(() => {
    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('playerCreated', (data) => {
      toast.success(`New player created: ${data.playerName}`);
      if (onPlayerCreated) onPlayerCreated(); // 👈 trigger parent to refresh
    });

    return () => {
      socket.off('playerCreated');
    };
  }, [onPlayerCreated]);

  return null;
};

export default SocketListener;
