import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gamepad2
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatNumber } from '@win5x/common';

const DashboardPage: React.FC = () => {
  const { isConnected } = useSocket();
  
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'daily'],
    queryFn: () => apiService.getAnalytics('daily'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: systemStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => apiService.getSystemStatus(),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  if (analyticsLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Users',
      value: analytics?.summary.totalUsers || 0,
      change: '+12%',
      changeType: 'positive',
      icon: Users,
      color: 'blue',
    },
    {
      name: 'Active Users',
      value: analytics?.summary.activeUsers || 0,
      change: '+5%',
      changeType: 'positive',
      icon: Activity,
      color: 'green',
    },
    {
      name: 'Total Revenue',
      value: formatCurrency(analytics?.summary.revenue || 0),
      change: '+8%',
      changeType: 'positive',
      icon: DollarSign,
      color: 'emerald',
    },
    {
      name: 'House P/L',
      value: formatCurrency(analytics?.summary.houseProfitLoss || 0),
      change: analytics?.summary.houseProfitLoss >= 0 ? '+' : '',
      changeType: analytics?.summary.houseProfitLoss >= 0 ? 'positive' : 'negative',
      icon: TrendingUp,
      color: analytics?.summary.houseProfitLoss >= 0 ? 'green' : 'red',
    },
  ];

  const alerts = [
    ...(analytics?.pending.withdrawals > 0 ? [{
      type: 'warning' as const,
      title: 'Pending Withdrawals',
      message: `${analytics.pending.withdrawals} withdrawal requests need review`,
      action: 'View Transactions',
      href: '/transactions',
    }] : []),
    ...(analytics?.pending.deposits > 0 ? [{
      type: 'info' as const,
      title: 'Pending Deposits',
      message: `${analytics.pending.deposits} deposit requests need approval`,
      action: 'View Transactions',
      href: '/transactions',
    }] : []),
    ...(!systemStatus?.gameEngine.isRunning ? [{
      type: 'error' as const,
      title: 'Game Engine Stopped',
      message: 'The game engine is not running. Players cannot place bets.',
      action: 'Check Settings',
      href: '/settings',
    }] : []),
    ...(!isConnected ? [{
      type: 'error' as const,
      title: 'Connection Lost',
      message: 'Real-time connection to server is lost.',
      action: 'Refresh Page',
      href: '#',
    }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`h-8 w-8 rounded-md bg-${item.color}-500 flex items-center justify-center`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {item.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {typeof item.value === 'string' ? item.value : formatNumber(item.value)}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        item.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`rounded-md p-4 ${
                  alert.type === 'error' 
                    ? 'bg-red-50 border border-red-200' 
                    : alert.type === 'warning'
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    {alert.type === 'error' ? (
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                    ) : alert.type === 'warning' ? (
                      <Clock className="h-5 w-5 text-yellow-400" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-blue-400" />
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className={`text-sm font-medium ${
                      alert.type === 'error' 
                        ? 'text-red-800' 
                        : alert.type === 'warning'
                        ? 'text-yellow-800'
                        : 'text-blue-800'
                    }`}>
                      {alert.title}
                    </h3>
                    <div className={`mt-2 text-sm ${
                      alert.type === 'error' 
                        ? 'text-red-700' 
                        : alert.type === 'warning'
                        ? 'text-yellow-700'
                        : 'text-blue-700'
                    }`}>
                      <p>{alert.message}</p>
                    </div>
                    <div className="mt-4">
                      <div className="-mx-2 -my-1.5 flex">
                        <a
                          href={alert.href}
                          className={`px-2 py-1.5 rounded-md text-sm font-medium ${
                            alert.type === 'error' 
                              ? 'text-red-800 hover:bg-red-100' 
                              : alert.type === 'warning'
                              ? 'text-yellow-800 hover:bg-yellow-100'
                              : 'text-blue-800 hover:bg-blue-100'
                          }`}
                        >
                          {alert.action}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* System Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Status</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Game Engine</span>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${
                    systemStatus?.gameEngine.isRunning ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className={`text-sm ${
                    systemStatus?.gameEngine.isRunning ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {systemStatus?.gameEngine.isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Current Round</span>
                <span className="text-sm text-gray-900">
                  {systemStatus?.gameEngine.currentRound ? `#${systemStatus.gameEngine.currentRound}` : 'None'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Database</span>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${
                    systemStatus?.database.connected ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className={`text-sm ${
                    systemStatus?.database.connected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {systemStatus?.database.connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Uptime</span>
                <span className="text-sm text-gray-900">
                  {systemStatus ? `${Math.floor(systemStatus.uptime / 3600)}h ${Math.floor((systemStatus.uptime % 3600) / 60)}m` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Rounds */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Recent Rounds</h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {analytics?.recentActivity?.slice(0, 5).map((round, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <Gamepad2 className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        Round #{round.roundNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        Winner: {round.winningNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(round.totalBetAmount)}
                    </p>
                    <p className={`text-xs ${
                      round.houseProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {round.houseProfitLoss >= 0 ? '+' : ''}{formatCurrency(round.houseProfitLoss)}
                    </p>
                  </div>
                </div>
              )) || (
                <p className="text-sm text-gray-500 text-center py-4">
                  No recent rounds available
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;