import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getNumberColor } from '@win5x/common';

interface GameWheelProps {
  isSpinning: boolean;
  winningNumber: number | null;
  onSpinComplete?: () => void;
}

const GameWheel: React.FC<GameWheelProps> = ({ 
  isSpinning, 
  winningNumber, 
  onSpinComplete 
}) => {
  const [rotation, setRotation] = useState(0);
  const [finalRotation, setFinalRotation] = useState(0);

  // Number positions on the wheel (in degrees)
  const numberPositions = {
    0: 0,   // Top
    1: 36,  // Red
    2: 72,  // Black
    3: 108, // Red
    4: 144, // Black
    5: 180, // Red - Bottom
    6: 216, // Black
    7: 252, // Red
    8: 288, // Black
    9: 324, // Red
  };

  useEffect(() => {
    if (isSpinning && winningNumber !== null) {
      // Calculate the target rotation to land on the winning number
      const targetPosition = numberPositions[winningNumber as keyof typeof numberPositions];
      // Add multiple full rotations for dramatic effect
      const spins = 5 + Math.random() * 3; // 5-8 full rotations
      const finalRot = (spins * 360) + (360 - targetPosition); // Subtract because wheel spins clockwise but we want pointer to land on number
      
      setFinalRotation(finalRot);
      setRotation(finalRot);

      // Call onSpinComplete after animation
      const timer = setTimeout(() => {
        onSpinComplete?.();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isSpinning, winningNumber, onSpinComplete]);

  const wheelNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="relative flex items-center justify-center">
      {/* Wheel Container */}
      <div className="relative">
        {/* Wheel Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-4 z-20">
          <div className="wheel-pointer" />
        </div>

        {/* Main Wheel */}
        <motion.div
          className="wheel-container w-80 h-80 relative"
          animate={{ rotate: rotation }}
          transition={{
            duration: isSpinning ? 4 : 0,
            ease: isSpinning ? "easeOut" : "linear",
          }}
        >
          {/* Wheel Segments */}
          {wheelNumbers.map((number, index) => {
            const angle = (index * 36) - 18; // Each segment is 36 degrees, offset by -18 to center
            const color = getNumberColor(number);
            const isRed = color === 'red';
            
            return (
              <div
                key={number}
                className="absolute w-full h-full"
                style={{
                  transform: `rotate(${angle}deg)`,
                }}
              >
                {/* Segment Background */}
                <div
                  className={`absolute w-full h-1/2 origin-bottom ${
                    isRed ? 'bg-red-600' : 'bg-gray-900'
                  } border-r border-gold-400`}
                  style={{
                    clipPath: 'polygon(45% 0%, 55% 0%, 50% 100%)',
                  }}
                />
                
                {/* Number Text */}
                <div
                  className="absolute text-white font-bold text-2xl"
                  style={{
                    top: '15%',
                    left: '50%',
                    transform: 'translate(-50%, 0) rotate(0deg)',
                  }}
                >
                  {number}
                </div>
              </div>
            );
          })}

          {/* Center Hub */}
          <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-gold-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-4 border-gold-600 shadow-lg z-10">
            <div className="w-full h-full bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-gold-700 rounded-full" />
            </div>
          </div>
        </motion.div>

        {/* Outer Ring */}
        <div className="absolute inset-0 w-80 h-80 rounded-full border-8 border-gold-400 shadow-2xl pointer-events-none" />
        
        {/* Glow Effect */}
        <div className="absolute inset-0 w-80 h-80 rounded-full glow-gold opacity-50 pointer-events-none" />
      </div>

      {/* Winning Number Display */}
      {winningNumber !== null && !isSpinning && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute -bottom-16 left-1/2 transform -translate-x-1/2"
        >
          <div className={`px-6 py-3 rounded-full text-white font-bold text-xl shadow-lg ${
            getNumberColor(winningNumber) === 'red' ? 'bg-red-600' : 'bg-gray-900'
          }`}>
            Winner: {winningNumber}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default GameWheel;