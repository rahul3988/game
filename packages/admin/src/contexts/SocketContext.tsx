import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { SOCKET_EVENTS } from '@win5x/common';
import { toast } from 'sonner';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectedUsers: number;
  connectedAdmins: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { admin, tokens } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(0);
  const [connectedAdmins, setConnectedAdmins] = useState(0);

  useEffect(() => {
    if (admin && tokens?.accessToken) {
      initializeSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [admin, tokens]);

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
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      
      if (error.message.includes('Authentication')) {
        toast.error('Socket authentication failed');
      }
    });

    // Listen to admin notifications
    newSocket.on(SOCKET_EVENTS.ADMIN_NOTIFICATION, (notification) => {
      switch (notification.type) {
        case 'withdrawal_request':
          toast.info('New withdrawal request', {
            description: notification.message,
          });
          break;
        case 'high_exposure':
          toast.warning('High exposure alert', {
            description: notification.message,
          });
          break;
        case 'system_alert':
          toast.info('System Alert', {
            description: notification.message,
          });
          break;
      }
    });

    // Listen to game events for admin dashboard
    newSocket.on(SOCKET_EVENTS.ROUND_UPDATE, (round) => {
      // Handle round updates for real-time dashboard
      console.log('Round update:', round);
    });

    newSocket.on(SOCKET_EVENTS.BET_UPDATE, (bets) => {
      // Handle bet updates
      console.log('Bet update:', bets);
    });

    newSocket.on(SOCKET_EVENTS.ERROR, (error) => {
      toast.error('Socket Error', {
        description: error.message,
      });
    });

    // Custom admin events
    newSocket.on('user_connected', (data) => {
      setConnectedUsers(data.count);
    });

    newSocket.on('admin_connected', (data) => {
      setConnectedAdmins(data.count);
    });

    newSocket.on('game_stopped', (data) => {
      toast.error('Game Stopped', {
        description: `${data.reason} by ${data.admin}`,
      });
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
    connectedUsers,
    connectedAdmins,
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