import React from 'react';
import { motion } from 'framer-motion';
import { getNumberColor } from '@win5x/common';

interface BettingBoardProps {
  selectedChip: number;
  bets: Record<string, number>;
  onPlaceBet: (betType: string, betValue: string | number) => void;
  disabled?: boolean;
  betDistribution?: {
    numbers: Record<string, { count: number; amount: number }>;
    oddEven: { odd: { count: number; amount: number }; even: { count: number; amount: number } };
    colors: { red: { count: number; amount: number }; black: { count: number; amount: number } };
  };
}

const BettingBoard: React.FC<BettingBoardProps> = ({
  selectedChip,
  bets,
  onPlaceBet,
  disabled = false,
  betDistribution,
}) => {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const getBetAmount = (betType: string, betValue: string | number) => {
    const key = `${betType}_${betValue}`;
    return bets[key] || 0;
  };

  const getDistributionAmount = (betType: string, betValue: string | number) => {
    if (!betDistribution) return 0;
    
    if (betType === 'number') {
      return betDistribution.numbers[betValue.toString()]?.amount || 0;
    } else if (betType === 'color') {
      return betDistribution.colors[betValue as 'red' | 'black']?.amount || 0;
    } else if (betType === 'odd_even') {
      return betDistribution.oddEven[betValue as 'odd' | 'even']?.amount || 0;
    }
    
    return 0;
  };

  return (
    <div className="bg-green-900 rounded-lg p-6 border-4 border-gold-600 shadow-2xl">
      {/* Numbers Grid */}
      <div className="mb-6">
        <h3 className="text-center text-lg font-semibold text-gold-400 mb-4">
          Numbers (5x Payout)
        </h3>
        
        <div className="grid grid-cols-5 gap-3">
          {numbers.map((number) => {
            const color = getNumberColor(number);
            const isRed = color === 'red';
            const userBet = getBetAmount('number', number);
            const totalBet = getDistributionAmount('number', number);
            
            return (
              <motion.button
                key={number}
                className={`number-btn ${
                  isRed ? 'number-btn-red' : 'number-btn-black'
                } relative ${userBet > 0 ? 'ring-4 ring-gold-400' : ''}`}
                onClick={() => onPlaceBet('number', number)}
                disabled={disabled || selectedChip === 0}
                whileHover={{ scale: disabled ? 1 : 1.05 }}
                whileTap={{ scale: disabled ? 1 : 0.95 }}
              >
                <span className="text-2xl font-bold">{number}</span>
                
                {/* User bet indicator */}
                {userBet > 0 && (
                  <div className="absolute -top-2 -right-2 bg-gold-500 text-black text-xs font-bold px-1 rounded-full min-w-[20px]">
                    ₹{userBet}
                  </div>
                )}
                
                {/* Total bet amount */}
                {totalBet > 0 && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded">
                    ₹{totalBet}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Color Betting */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <h3 className="text-center text-md font-semibold text-gold-400 mb-3">
            Colors (5x Payout)
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {['red', 'black'].map((color) => {
              const userBet = getBetAmount('color', color);
              const totalBet = getDistributionAmount('color', color);
              
              return (
                <motion.button
                  key={color}
                  className={`btn-lg relative font-bold ${
                    color === 'red' 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'bg-gray-900 hover:bg-gray-800 text-white border-2 border-gray-700'
                  } ${userBet > 0 ? 'ring-4 ring-gold-400' : ''}`}
                  onClick={() => onPlaceBet('color', color)}
                  disabled={disabled || selectedChip === 0}
                  whileHover={{ scale: disabled ? 1 : 1.05 }}
                  whileTap={{ scale: disabled ? 1 : 0.95 }}
                >
                  {color.toUpperCase()}
                  
                  {/* User bet indicator */}
                  {userBet > 0 && (
                    <div className="absolute -top-2 -right-2 bg-gold-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                      ₹{userBet}
                    </div>
                  )}
                  
                  {/* Total bet amount */}
                  {totalBet > 0 && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded">
                      ₹{totalBet}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-center text-md font-semibold text-gold-400 mb-3">
            Parity (5x Payout)
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            {['odd', 'even'].map((parity) => {
              const userBet = getBetAmount('odd_even', parity);
              const totalBet = getDistributionAmount('odd_even', parity);
              
              return (
                <motion.button
                  key={parity}
                  className={`btn-lg relative font-bold bg-blue-600 hover:bg-blue-700 text-white ${
                    userBet > 0 ? 'ring-4 ring-gold-400' : ''
                  }`}
                  onClick={() => onPlaceBet('odd_even', parity)}
                  disabled={disabled || selectedChip === 0}
                  whileHover={{ scale: disabled ? 1 : 1.05 }}
                  whileTap={{ scale: disabled ? 1 : 0.95 }}
                >
                  {parity.toUpperCase()}
                  
                  {/* User bet indicator */}
                  {userBet > 0 && (
                    <div className="absolute -top-2 -right-2 bg-gold-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                      ₹{userBet}
                    </div>
                  )}
                  
                  {/* Total bet amount */}
                  {totalBet > 0 && (
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gray-700 text-white text-xs px-2 py-1 rounded">
                      ₹{totalBet}
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Betting Summary */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gold-600">
        <h3 className="text-center text-lg font-semibold text-gold-400 mb-2">
          Your Bets
        </h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-300">Total Bet Amount:</p>
            <p className="text-white font-bold text-lg">
              ₹{Object.values(bets).reduce((sum, amount) => sum + amount, 0)}
            </p>
          </div>
          <div>
            <p className="text-gray-300">Potential Payout:</p>
            <p className="text-green-400 font-bold text-lg">
              ₹{Object.values(bets).reduce((sum, amount) => sum + amount, 0) * 5}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BettingBoard;