import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { gameService } from '../services/gameService';
import GameWheel from '../components/GameWheel';
import BettingChips from '../components/BettingChips';
import BettingBoard from '../components/BettingBoard';
import GameControls from '../components/GameControls';
import GameTimer from '../components/GameTimer';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '@win5x/common';

const GamePage: React.FC = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  // Game state
  const [selectedChip, setSelectedChip] = useState(10);
  const [currentBets, setCurrentBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});
  const [gameState, setGameState] = useState<any>(null);
  const [betDistribution, setBetDistribution] = useState<any>(null);
  const [timerState, setTimerState] = useState<any>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);

  // Fetch current game state
  const { data: currentGame, isLoading } = useQuery({
    queryKey: ['current-game'],
    queryFn: () => gameService.getCurrentRound(),
    refetchInterval: 30000,
  });

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('round_update', (round) => {
      setGameState(round);
      
      if (round.status === 'SPINNING') {
        setIsSpinning(true);
      } else if (round.status === 'COMPLETED') {
        setWinningNumber(round.winningNumber);
        setIsSpinning(false);
        
        // Save current bets as last bets for rebet functionality
        if (Object.keys(currentBets).length > 0) {
          setLastBets({ ...currentBets });
        }
        
        // Clear current bets
        setTimeout(() => {
          setCurrentBets({});
        }, 5000);
      } else if (round.status === 'BETTING') {
        setWinningNumber(null);
        setIsSpinning(false);
      }
    });

    socket.on('bet_distribution', (distribution) => {
      setBetDistribution(distribution);
    });

    socket.on('timer_update', (timer) => {
      setTimerState(timer);
    });

    socket.on('user_balance_update', (balance) => {
      // Update user balance in auth context if needed
    });

    socket.on('bet_placed', (bet) => {
      toast.success(`Bet placed: ₹${bet.amount} on ${bet.betType}`);
    });

    socket.on('error', (error) => {
      toast.error(error.message);
    });

    return () => {
      socket.off('round_update');
      socket.off('bet_distribution');
      socket.off('timer_update');
      socket.off('user_balance_update');
      socket.off('bet_placed');
      socket.off('error');
    };
  }, [socket, currentBets]);

  // Place bet handler
  const handlePlaceBet = async (betType: string, betValue: string | number) => {
    if (!gameState || gameState.status !== 'BETTING') {
      toast.error('Betting is not available right now');
      return;
    }

    if (!user || user.balance < selectedChip) {
      toast.error('Insufficient balance');
      return;
    }

    if (selectedChip <= 0) {
      toast.error('Please select a chip value');
      return;
    }

    try {
      const betKey = `${betType}_${betValue}`;
      const currentAmount = currentBets[betKey] || 0;
      
      // Place bet via socket
      socket?.emit('place_bet', {
        roundId: gameState.id,
        betType,
        betValue,
        amount: selectedChip,
      });

      // Update local state immediately for better UX
      setCurrentBets(prev => ({
        ...prev,
        [betKey]: currentAmount + selectedChip,
      }));

    } catch (error) {
      console.error('Failed to place bet:', error);
    }
  };

  // Clear all bets
  const handleClearBets = () => {
    setCurrentBets({});
    toast.success('All bets cleared');
  };

  // Undo last bet
  const handleUndoLastBet = () => {
    const betKeys = Object.keys(currentBets);
    if (betKeys.length === 0) return;

    const lastBetKey = betKeys[betKeys.length - 1];
    const newBets = { ...currentBets };
    
    if (newBets[lastBetKey] > selectedChip) {
      newBets[lastBetKey] -= selectedChip;
    } else {
      delete newBets[lastBetKey];
    }
    
    setCurrentBets(newBets);
    toast.success('Last bet undone');
  };

  // Rebet last round's bets
  const handleRebetLast = () => {
    if (Object.keys(lastBets).length === 0) {
      toast.error('No previous bets to repeat');
      return;
    }

    const totalAmount = Object.values(lastBets).reduce((sum, amount) => sum + amount, 0);
    
    if (!user || user.balance < totalAmount) {
      toast.error('Insufficient balance for rebet');
      return;
    }

    setCurrentBets({ ...lastBets });
    toast.success('Previous bets repeated');
  };

  const canBet = gameState?.status === 'BETTING' && isConnected;
  const hasBets = Object.keys(currentBets).length > 0;
  const hasLastBets = Object.keys(lastBets).length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header with balance and connection status */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-white">
            <h1 className="text-3xl font-bold text-gold-400">Win5x Roulette</h1>
            <p className="text-gray-300">Place your bets and spin to win!</p>
          </div>
          
          <div className="text-right">
            <div className="bg-gray-800 rounded-lg p-4 border border-gold-600">
              <p className="text-gray-300 text-sm">Balance</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(user?.balance || 0)}
              </p>
              {user?.gameCredit && user.gameCredit > 0 && (
                <p className="text-gold-400 text-sm">
                  Game Credit: {formatCurrency(user.gameCredit)}
                </p>
              )}
            </div>
            
            <div className={`mt-2 flex items-center justify-end gap-2 ${
              isConnected ? 'text-green-400' : 'text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left Column - Timer and Wheel */}
          <div className="xl:col-span-1 space-y-6">
            {/* Game Timer */}
            <GameTimer
              phase={timerState?.phase || gameState?.status || 'betting'}
              timeRemaining={timerState?.timeRemaining || 0}
              roundNumber={gameState?.roundNumber}
            />
            
            {/* Game Wheel */}
            <div className="flex justify-center">
              <GameWheel
                isSpinning={isSpinning}
                winningNumber={winningNumber}
                onSpinComplete={() => {
                  // Handle spin completion
                }}
              />
            </div>
          </div>

          {/* Right Columns - Betting Interface */}
          <div className="xl:col-span-2 space-y-6">
            {/* Betting Chips */}
            <BettingChips
              selectedChip={selectedChip}
              onChipSelect={setSelectedChip}
              disabled={!canBet}
            />

            {/* Betting Board */}
            <BettingBoard
              selectedChip={selectedChip}
              bets={currentBets}
              onPlaceBet={handlePlaceBet}
              disabled={!canBet}
              betDistribution={betDistribution}
            />

            {/* Game Controls */}
            <GameControls
              onClearBets={handleClearBets}
              onRebetLast={handleRebetLast}
              onUndoLastBet={handleUndoLastBet}
              disabled={!canBet}
              hasBets={hasBets}
              hasLastBets={hasLastBets}
            />
          </div>
        </div>

        {/* Game Status Messages */}
        {!isConnected && (
          <motion.div
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-900 border border-red-400 rounded-lg p-4 text-center"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-300 font-semibold">
              ⚠️ Connection lost. Reconnecting...
            </p>
          </motion.div>
        )}

        {gameState?.status === 'COMPLETED' && winningNumber !== null && (
          <motion.div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-800 border-4 border-gold-400 rounded-xl p-8 text-center z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <h2 className="text-3xl font-bold text-gold-400 mb-4">Round Complete!</h2>
            <div className="text-6xl font-bold text-white mb-4">{winningNumber}</div>
            <p className="text-gray-300">
              Winning number: <span className="font-bold">{winningNumber}</span>
            </p>
            <p className="text-gray-300">
              Color: <span className={`font-bold ${
                winningNumber % 2 === 1 ? 'text-red-400' : 'text-gray-400'
              }`}>
                {winningNumber % 2 === 1 ? 'Red' : 'Black'}
              </span>
            </p>
            <p className="text-gray-300">
              Parity: <span className="font-bold">
                {winningNumber % 2 === 0 ? 'Even' : 'Odd'}
              </span>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GamePage;