import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, TrendingUp } from 'lucide-react';

const LeaderboardPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const periods = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ] as const;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-gold-400" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-gold-500 to-gold-600 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-gray-400">See who's winning big at Win5x!</p>
        </div>

        {/* Period Selector */}
        <div className="flex justify-center">
          <div className="bg-gray-800 rounded-lg p-1 flex space-x-1">
            {periods.map((period) => (
              <button
                key={period.key}
                onClick={() => setSelectedPeriod(period.key)}
                className={`px-6 py-2 rounded-md font-semibold transition-all ${
                  selectedPeriod === period.key
                    ? 'bg-gold-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-gold-400" />
              {periods.find(p => p.key === selectedPeriod)?.label} Winners
            </h3>
            <p className="card-description">
              Top performers for the {selectedPeriod} period
            </p>
          </div>
          <div className="card-content">
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No rankings available yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Start playing to see your name on the leaderboard!
              </p>
              
              {/* Mock leaderboard structure */}
              <div className="mt-8 space-y-3 max-w-md mx-auto">
                {[1, 2, 3, 4, 5].map((rank) => (
                  <div
                    key={rank}
                    className={`leaderboard-item ${getRankStyle(rank)} opacity-30`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="leaderboard-rank">
                        {getRankIcon(rank)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold">Player {rank}</p>
                        <p className="text-sm opacity-75">0 wins</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">₹0</p>
                      <p className="text-sm opacity-75">0 bets</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 text-sm text-gray-400">
                <p>Leaderboard features:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Daily, weekly, and monthly rankings</li>
                  <li>• Total winnings and bet counts</li>
                  <li>• Win rate statistics</li>
                  <li>• Achievement badges and rewards</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LeaderboardPage;