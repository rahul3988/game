import React from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Trash2, RotateCw } from 'lucide-react';

interface GameControlsProps {
  onClearBets: () => void;
  onRebetLast: () => void;
  onUndoLastBet: () => void;
  disabled?: boolean;
  hasBets: boolean;
  hasLastBets: boolean;
}

const GameControls: React.FC<GameControlsProps> = ({
  onClearBets,
  onRebetLast,
  onUndoLastBet,
  disabled = false,
  hasBets,
  hasLastBets,
}) => {
  return (
    <div className="flex justify-center gap-4 p-4">
      {/* Clear Bets */}
      <motion.button
        className="btn btn-warning btn-md flex items-center gap-2"
        onClick={onClearBets}
        disabled={disabled || !hasBets}
        whileHover={{ scale: disabled || !hasBets ? 1 : 1.05 }}
        whileTap={{ scale: disabled || !hasBets ? 1 : 0.95 }}
      >
        <Trash2 size={16} />
        Clear
      </motion.button>

      {/* Undo Last Bet */}
      <motion.button
        className="btn btn-secondary btn-md flex items-center gap-2"
        onClick={onUndoLastBet}
        disabled={disabled || !hasBets}
        whileHover={{ scale: disabled || !hasBets ? 1 : 1.05 }}
        whileTap={{ scale: disabled || !hasBets ? 1 : 0.95 }}
      >
        <RotateCcw size={16} />
        Undo
      </motion.button>

      {/* Rebet Last */}
      <motion.button
        className="btn btn-success btn-md flex items-center gap-2"
        onClick={onRebetLast}
        disabled={disabled || !hasLastBets}
        whileHover={{ scale: disabled || !hasLastBets ? 1 : 1.05 }}
        whileTap={{ scale: disabled || !hasLastBets ? 1 : 0.95 }}
      >
        <RotateCw size={16} />
        Rebet
      </motion.button>
    </div>
  );
};

export default GameControls;