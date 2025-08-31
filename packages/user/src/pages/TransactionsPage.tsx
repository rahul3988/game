import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';

const TransactionsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Transactions</h1>
            <p className="text-gray-400">Manage your deposits, withdrawals, and betting history</p>
          </div>
          
          <div className="flex space-x-3">
            <button className="btn btn-success btn-md flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4" />
              Deposit
            </button>
            <button className="btn btn-warning btn-md flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-600 rounded-lg">
                  <ArrowDownCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Deposits</p>
                  <p className="text-2xl font-bold text-green-400">₹0</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-red-600 rounded-lg">
                  <ArrowUpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-red-400">₹0</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Bets</p>
                  <p className="text-2xl font-bold text-blue-400">₹0</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Transaction History</h3>
            <p className="card-description">
              Your complete transaction and betting history
            </p>
          </div>
          <div className="card-content">
            <div className="text-center py-12">
              <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No transactions yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Your transaction history will appear here once you start playing
              </p>
              
              <div className="mt-8 space-y-2 text-sm text-gray-400">
                <p>Features to be implemented:</p>
                <ul className="space-y-1">
                  <li>• Deposit and withdrawal management</li>
                  <li>• Detailed betting history</li>
                  <li>• Transaction filtering and search</li>
                  <li>• Export transaction reports</li>
                  <li>• Real-time transaction status updates</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TransactionsPage;