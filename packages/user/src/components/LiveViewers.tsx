import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Eye, TrendingUp, TrendingDown } from 'lucide-react';
import { fakeActivityService } from '../services/fakeActivityService';

interface LiveViewersProps {
  className?: string;
}

const LiveViewers: React.FC<LiveViewersProps> = ({ className }) => {
  const [viewerCount, setViewerCount] = useState(0);
  const [isIncreasing, setIsIncreasing] = useState(true);
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'join' | 'bet' | 'win';
    username: string;
    amount?: number;
    timestamp: number;
  }>>([]);

  // Initialize fake activity service and set up listeners
  useEffect(() => {
    // Start the fake activity service
    fakeActivityService.start();

    // Set initial viewer count
    setViewerCount(Math.floor(Math.random() * 400) + 200);

    // Listen for activity updates
    const unsubscribeActivity = fakeActivityService.onActivity((activity) => {
      setRecentActivity(prev => {
        const updated = [activity, ...prev].slice(0, 5);
        return updated;
      });
    });

    // Listen for viewer count updates
    const unsubscribeViewers = fakeActivityService.onViewerUpdate((count, trend) => {
      setViewerCount(count);
      setIsIncreasing(trend === 'up');
    });

    return () => {
      unsubscribeActivity();
      unsubscribeViewers();
    };
  }, []);

  // Auto-remove old activities
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setRecentActivity(prev => 
        prev.filter(activity => now - activity.timestamp < 30000) // Remove after 30 seconds
      );
    }, 5000);

    return () => clearInterval(cleanupInterval);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'join': return '👋';
      case 'leave': return '👋';
      case 'bet': return '🎰';
      case 'win': return '🎉';
      case 'big_win': return '💰';
      default: return '⭐';
    }
  };

  const getActivityText = (activity: typeof recentActivity[0]) => {
    switch (activity.type) {
      case 'join':
        return `${activity.username} joined the game`;
      case 'leave':
        return `${activity.username} left the game`;
      case 'bet':
        return `${activity.username} bet ₹${activity.amount}`;
      case 'win':
        return `${activity.username} won ₹${activity.amount}!`;
      case 'big_win':
        return `${activity.username} won BIG ₹${activity.amount}! 🔥`;
      default:
        return `${activity.username} is playing`;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Live Viewers Count */}
      <motion.div 
        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
        whileHover={{ scale: 1.02 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Users className="h-6 w-6 text-green-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Live Players</p>
              <motion.p 
                className="text-2xl font-bold text-white"
                key={viewerCount}
                initial={{ scale: 1.2, color: isIncreasing ? '#22c55e' : '#ef4444' }}
                animate={{ scale: 1, color: '#ffffff' }}
                transition={{ duration: 0.3 }}
              >
                {viewerCount.toLocaleString()}
              </motion.p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <motion.div
              animate={{ 
                rotate: isIncreasing ? 0 : 180,
                color: isIncreasing ? '#22c55e' : '#ef4444'
              }}
              transition={{ duration: 0.3 }}
            >
              <TrendingUp className="h-5 w-5" />
            </motion.div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">LIVE</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Activity Feed */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Eye className="h-4 w-4 text-gold-400" />
            <span className="text-sm font-semibold text-gold-400">Live Activity</span>
          </div>
        </div>
        
        <div className="p-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {recentActivity.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                layout
                className="flex items-center space-x-2 p-2 bg-gray-700/50 rounded text-xs"
              >
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
                <span className="text-gray-300 flex-1">
                  {getActivityText(activity)}
                </span>
                <span className="text-gray-500">
                  {Math.floor((Date.now() - activity.timestamp) / 1000)}s
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {recentActivity.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Watching for activity...</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
          <p className="text-xs text-gray-400">Peak Today</p>
          <p className="text-lg font-bold text-green-400">
            {(viewerCount + Math.floor(Math.random() * 300) + 100).toLocaleString()}
          </p>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
          <p className="text-xs text-gray-400">Total Bets</p>
          <p className="text-lg font-bold text-gold-400">
            {(Math.floor(Math.random() * 50000) + 10000).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveViewers;