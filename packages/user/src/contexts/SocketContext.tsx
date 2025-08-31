import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_EVENTS } from '@win5x/common';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { user, tokens } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (user && tokens?.accessToken) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [user, tokens]);

  const initializeSocket = () => {
    if (socket) {
      disconnectSocket();
    }

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3001', {
      auth: {
        token: tokens?.accessToken,
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      toast.success('Connected to game server');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      if (reason !== 'io client disconnect') {
        toast.error('Disconnected from game server');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      
      if (error.message.includes('Authentication')) {
        toast.error('Authentication failed');
      } else {
        toast.error('Failed to connect to game server');
      }
    });

    newSocket.on(SOCKET_EVENTS.ERROR, (error) => {
      toast.error(error.message || 'Game error occurred');
    });

    newSocket.on('connected', (data) => {
      console.log('Socket authenticated:', data);
    });

    setSocket(newSocket);
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}