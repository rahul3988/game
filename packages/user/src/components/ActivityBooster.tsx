import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, TrendingUp } from 'lucide-react';
import { fakeActivityService } from '../services/fakeActivityService';

interface ActivityBoosterProps {
  gamePhase?: 'betting' | 'spinning' | 'result';
  roundNumber?: number;
}

const ActivityBooster: React.FC<ActivityBoosterProps> = ({ 
  gamePhase, 
  roundNumber 
}) => {
  // Trigger activity bursts during exciting moments
  useEffect(() => {
    if (gamePhase === 'spinning') {
      // Burst activity during spin
      fakeActivityService.triggerBurstActivity(10000); // 10 seconds
    } else if (gamePhase === 'result') {
      // Another burst after results
      setTimeout(() => {
        fakeActivityService.triggerBurstActivity(15000); // 15 seconds
      }, 2000);
    }
  }, [gamePhase]);

  // Special events based on round numbers
  useEffect(() => {
    if (!roundNumber) return;
    
    // Every 10th round creates excitement
    if (roundNumber % 10 === 0) {
      fakeActivityService.triggerBurstActivity(20000);
    }
    
    // Every 50th round is extra special
    if (roundNumber % 50 === 0) {
      fakeActivityService.triggerBurstActivity(30000);
    }
  }, [roundNumber]);

  return null; // This component doesn't render anything
};

// Hook to manually trigger activity boosts
export const useActivityBooster = () => {
  const triggerExcitement = (duration: number = 15000) => {
    fakeActivityService.triggerBurstActivity(duration);
  };

  const triggerMegaExcitement = () => {
    fakeActivityService.triggerBurstActivity(45000); // 45 seconds of intense activity
  };

  return {
    triggerExcitement,
    triggerMegaExcitement,
  };
};

export default ActivityBooster;