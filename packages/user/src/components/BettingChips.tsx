import React from 'react';
import { motion } from 'framer-motion';

interface BettingChipsProps {
  selectedChip: number;
  onChipSelect: (value: number) => void;
  disabled?: boolean;
}

const BettingChips: React.FC<BettingChipsProps> = ({
  selectedChip,
  onChipSelect,
  disabled = false,
}) => {
  const chips = [
    { value: 1, color: 'chip-1', label: '₹1' },
    { value: 5, color: 'chip-5', label: '₹5' },
    { value: 10, color: 'chip-10', label: '₹10' },
    { value: 25, color: 'chip-25', label: '₹25' },
    { value: 50, color: 'chip-50', label: '₹50' },
    { value: 100, color: 'chip-100', label: '₹100' },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-3 p-4">
      <h3 className="w-full text-center text-lg font-semibold text-gold-400 mb-2">
        Select Chip Value
      </h3>
      
      <div className="flex flex-wrap justify-center gap-3">
        {chips.map((chip) => (
          <motion.button
            key={chip.value}
            className={`chip ${chip.color} w-16 h-16 text-sm relative ${
              selectedChip === chip.value 
                ? 'ring-4 ring-gold-400 ring-opacity-75' 
                : ''
            }`}
            onClick={() => onChipSelect(chip.value)}
            disabled={disabled}
            whileHover={{ scale: disabled ? 1 : 1.1 }}
            whileTap={{ scale: disabled ? 1 : 0.95 }}
            animate={{
              scale: selectedChip === chip.value ? 1.05 : 1,
            }}
          >
            <div className="absolute inset-1 rounded-full border-2 border-white/30" />
            <span className="relative z-10 font-bold">
              {chip.label}
            </span>
            
            {/* Selection indicator */}
            {selectedChip === chip.value && (
              <motion.div
                className="absolute -top-1 -right-1 w-4 h-4 bg-gold-400 rounded-full border-2 border-white"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default BettingChips;