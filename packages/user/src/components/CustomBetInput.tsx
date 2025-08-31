import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit3, Check, X } from 'lucide-react';

interface CustomBetInputProps {
  onCustomBet: (amount: number) => void;
  disabled?: boolean;
  minAmount?: number;
  maxAmount?: number;
}

const CustomBetInput: React.FC<CustomBetInputProps> = ({
  onCustomBet,
  disabled = false,
  minAmount = 10,
  maxAmount = 10000,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const amount = parseInt(customAmount);
    
    if (isNaN(amount)) {
      setError('Please enter a valid number');
      return;
    }
    
    if (amount < minAmount) {
      setError(`Minimum bet is ₹${minAmount}`);
      return;
    }
    
    if (amount > maxAmount) {
      setError(`Maximum bet is ₹${maxAmount}`);
      return;
    }
    
    setError('');
    onCustomBet(amount);
    setIsEditing(false);
    setCustomAmount('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCustomAmount('');
    setError('');
  };

  if (!isEditing) {
    return (
      <div className="flex justify-center">
        <motion.button
          className="btn btn-outline btn-md flex items-center gap-2"
          onClick={() => setIsEditing(true)}
          disabled={disabled}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
        >
          <Edit3 size={16} />
          Custom Amount
        </motion.button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="flex items-center space-x-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            ₹
          </span>
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder={`${minAmount}-${maxAmount}`}
            className="form-input pl-8 w-32 text-center"
            min={minAmount}
            max={maxAmount}
            autoFocus
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') handleCancel();
            }}
          />
        </div>
        
        <motion.button
          className="btn btn-success btn-sm"
          onClick={handleSubmit}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Check size={14} />
        </motion.button>
        
        <motion.button
          className="btn btn-secondary btn-sm"
          onClick={handleCancel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={14} />
        </motion.button>
      </div>
      
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
      
      <p className="text-gray-400 text-xs">
        Min: ₹{minAmount} | Max: ₹{maxAmount}
      </p>
    </div>
  );
};

export default CustomBetInput;