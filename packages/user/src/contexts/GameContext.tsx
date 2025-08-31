import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GameContextType {
  selectedChip: number;
  setSelectedChip: (value: number) => void;
  currentBets: Record<string, number>;
  setCurrentBets: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  lastBets: Record<string, number>;
  setLastBets: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameProviderProps {
  children: ReactNode;
}

export function GameProvider({ children }: GameProviderProps) {
  const [selectedChip, setSelectedChip] = useState(10);
  const [currentBets, setCurrentBets] = useState<Record<string, number>>({});
  const [lastBets, setLastBets] = useState<Record<string, number>>({});

  const value: GameContextType = {
    selectedChip,
    setSelectedChip,
    currentBets,
    setCurrentBets,
    lastBets,
    setLastBets,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}