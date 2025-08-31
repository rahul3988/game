import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Trophy } from 'lucide-react';

interface GameTimerProps {
  phase: 'betting' | 'spinning' | 'result';
  timeRemaining: number;
  roundNumber?: number;
}

const GameTimer: React.FC<GameTimerProps> = ({
  phase,
  timeRemaining,
  roundNumber,
}) => {
  const [displayTime, setDisplayTime] = useState(timeRemaining);

  useEffect(() => {
    setDisplayTime(timeRemaining);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  const getPhaseConfig = () => {
    switch (phase) {
      case 'betting':
        return {
          title: 'Place Your Bets',
          icon: Clock,
          color: 'text-green-400',
          bgColor: 'bg-green-900/50',
          borderColor: 'border-green-400',
        };
      case 'spinning':
        return {
          title: 'Spinning...',
          icon: Play,
          color: 'text-gold-400',
          bgColor: 'bg-gold-900/50',
          borderColor: 'border-gold-400',
        };
      case 'result':
        return {
          title: 'Results',
          icon: Trophy,
          color: 'text-blue-400',
          bgColor: 'bg-blue-900/50',
          borderColor: 'border-blue-400',
        };
      default:
        return {
          title: 'Waiting...',
          icon: Clock,
          color: 'text-gray-400',
          bgColor: 'bg-gray-900/50',
          borderColor: 'border-gray-400',
        };
    }
  };

  const config = getPhaseConfig();
  const Icon = config.icon;
  const isLowTime = displayTime <= 5 && phase === 'betting';

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Round Number */}
      {roundNumber && (
        <div className="text-center">
          <p className="text-gray-400 text-sm">Round</p>
          <p className="text-white text-xl font-bold">#{roundNumber}</p>
        </div>
      )}

      {/* Timer Card */}
      <motion.div
        className={`${config.bgColor} ${config.borderColor} border-2 rounded-xl p-6 text-center min-w-[200px]`}
        animate={{
          scale: isLowTime ? [1, 1.05, 1] : 1,
        }}
        transition={{
          duration: 0.5,
          repeat: isLowTime ? Infinity : 0,
        }}
      >
        {/* Phase Icon */}
        <div className="flex justify-center mb-3">
          <div className={`p-3 rounded-full ${config.bgColor} ${config.borderColor} border`}>
            <Icon className={`w-6 h-6 ${config.color}`} />
          </div>
        </div>

        {/* Phase Title */}
        <h3 className={`text-lg font-semibold mb-2 ${config.color}`}>
          {config.title}
        </h3>

        {/* Timer Display */}
        <div className="relative">
          <motion.div
            className={`text-4xl font-bold ${config.color} ${
              isLowTime ? 'text-red-400' : ''
            }`}
            animate={{
              color: isLowTime ? ['#f87171', '#dc2626', '#f87171'] : undefined,
            }}
            transition={{
              duration: 0.5,
              repeat: isLowTime ? Infinity : 0,
            }}
          >
            {formatTime(displayTime)}
          </motion.div>

          {/* Progress Ring */}
          <svg
            className="absolute inset-0 w-full h-full transform -rotate-90"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-gray-700"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              className={config.color}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              initial={{ strokeDashoffset: 0 }}
              animate={{
                strokeDashoffset: `${2 * Math.PI * 45 * (1 - displayTime / (phase === 'betting' ? 30 : phase === 'spinning' ? 10 : 15))}`,
              }}
              transition={{ duration: 1 }}
            />
          </svg>
        </div>

        {/* Phase Description */}
        <p className="text-gray-300 text-sm mt-3">
          {phase === 'betting' && 'Select chips and place your bets'}
          {phase === 'spinning' && 'Wheel is spinning...'}
          {phase === 'result' && 'Check your winnings!'}
        </p>
      </motion.div>

      {/* Urgent Betting Warning */}
      {isLowTime && (
        <motion.div
          className="bg-red-900/80 border border-red-400 rounded-lg p-3 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-red-300 font-semibold">⚠️ Betting closes soon!</p>
        </motion.div>
      )}
    </div>
  );
};

export default GameTimer;