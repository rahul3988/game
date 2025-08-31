import React from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Wallet, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '@win5x/common';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-24 w-24 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{user.username}</h1>
          <p className="text-gray-400">Player Profile</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Profile Information</h3>
            </div>
            <div className="card-content space-y-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gold-400" />
                <div>
                  <p className="text-sm text-gray-400">Username</p>
                  <p className="text-white font-semibold">{user.username}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gold-400" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white font-semibold">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gold-400" />
                <div>
                  <p className="text-sm text-gray-400">Member Since</p>
                  <p className="text-white font-semibold">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Wallet Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Wallet</h3>
            </div>
            <div className="card-content space-y-4">
              <div className="flex items-center space-x-3">
                <Wallet className="h-5 w-5 text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Available Balance</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatCurrency(user.balance)}
                  </p>
                </div>
              </div>
              
              {user.gameCredit > 0 && (
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-5 w-5 text-gold-400" />
                  <div>
                    <p className="text-sm text-gray-400">Game Credit</p>
                    <p className="text-xl font-bold text-gold-400">
                      {formatCurrency(user.gameCredit)}
                    </p>
                    <p className="text-xs text-gray-500">Non-withdrawable</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Quick Actions</h3>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="btn btn-primary btn-md">
                Deposit
              </button>
              <button className="btn btn-secondary btn-md">
                Withdraw
              </button>
              <button className="btn btn-outline btn-md">
                Transaction History
              </button>
              <button className="btn btn-ghost btn-md">
                Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Placeholder for future features */}
        <div className="text-center py-12 text-gray-500">
          <p>Additional profile features will be implemented here:</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>• Gaming statistics and achievements</li>
            <li>• Betting history and analytics</li>
            <li>• Account settings and preferences</li>
            <li>• Referral program and bonuses</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;