import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  QrCode, 
  Upload, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { apiService } from '../services/apiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '@win5x/common';

const PaymentManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'methods' | 'deposits' | 'withdrawals' | 'stats'>('methods');
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject';
    request: any;
  } | null>(null);

  // Fetch data
  const { data: paymentMethods, isLoading: methodsLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: () => apiService.getAllPaymentMethods(),
  });

  const { data: deposits, isLoading: depositsLoading } = useQuery({
    queryKey: ['admin-deposits'],
    queryFn: () => apiService.getAdminDeposits({ pageSize: 50 }),
  });

  const { data: withdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: () => apiService.getAdminWithdrawals({ pageSize: 50 }),
  });

  const { data: paymentStats, isLoading: statsLoading } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => apiService.getPaymentStats(),
  });

  // Mutations
  const updateMethodMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiService.updatePaymentMethod(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payment-methods'] });
      toast.success('Payment method updated successfully');
    },
    onError: () => {
      toast.error('Failed to update payment method');
    },
  });

  const processDepositMutation = useMutation({
    mutationFn: ({ id, action, notes, reason }: { id: string; action: 'approve' | 'reject'; notes?: string; reason?: string }) =>
      apiService.processDepositRequest(id, action, notes, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      setActionModal(null);
      toast.success('Deposit request processed successfully');
    },
    onError: () => {
      toast.error('Failed to process deposit request');
    },
  });

  const processWithdrawalMutation = useMutation({
    mutationFn: ({ id, action, notes, reason }: { id: string; action: 'approve' | 'reject'; notes?: string; reason?: string }) =>
      apiService.processWithdrawalRequest(id, action, notes, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
      setActionModal(null);
      toast.success('Withdrawal request processed successfully');
    },
    onError: () => {
      toast.error('Failed to process withdrawal request');
    },
  });

  const handleProcessRequest = (notes: string, reason?: string) => {
    if (!actionModal) return;

    if (actionModal.request.type === 'deposit') {
      processDepositMutation.mutate({
        id: actionModal.request.id,
        action: actionModal.type,
        notes,
        reason,
      });
    } else {
      processWithdrawalMutation.mutate({
        id: actionModal.request.id,
        action: actionModal.type,
        notes,
        reason,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600">Manage QR codes, deposits, and withdrawals</p>
      </div>

      {/* Stats Cards */}
      {!statsLoading && paymentStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Deposits</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(paymentStats.totalDeposits.amount)}
                  </p>
                  <p className="text-xs text-gray-500">{paymentStats.totalDeposits.count} transactions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(paymentStats.totalWithdrawals.amount)}
                  </p>
                  <p className="text-xs text-gray-500">{paymentStats.totalWithdrawals.count} transactions</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Deposits</p>
                  <p className="text-2xl font-bold text-gray-900">{paymentStats.pending.deposits}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Withdrawals</p>
                  <p className="text-2xl font-bold text-gray-900">{paymentStats.pending.withdrawals}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'methods', name: 'Payment Methods', icon: QrCode },
            { id: 'deposits', name: 'Deposits', icon: TrendingUp, badge: paymentStats?.pending.deposits },
            { id: 'withdrawals', name: 'Withdrawals', icon: DollarSign, badge: paymentStats?.pending.withdrawals },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Payment Methods Tab */}
      {activeTab === 'methods' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
          </div>

          {methodsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="grid gap-6">
              {paymentMethods?.map((method: any) => (
                <div key={method.id} className="card">
                  <div className="card-content">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">
                          {method.name === 'phonepe' && '📱'}
                          {method.name === 'googlepay' && '💳'}
                          {method.name === 'paytm' && '💰'}
                          {method.name === 'usdt' && '₿'}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{method.displayName}</h3>
                          <p className="text-sm text-gray-500">
                            ₹{method.minAmount} - ₹{method.maxAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          method.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {method.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button className="btn btn-outline btn-sm">
                          <Edit3 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          QR Code URL
                        </label>
                        <input
                          type="url"
                          value={method.qrCodeUrl || ''}
                          onChange={(e) => {
                            updateMethodMutation.mutate({
                              id: method.id,
                              data: { qrCodeUrl: e.target.value }
                            });
                          }}
                          className="form-input"
                          placeholder="https://example.com/qr-code.png"
                        />
                      </div>

                      {method.name === 'usdt' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Wallet Address
                          </label>
                          <input
                            type="text"
                            value={method.walletAddress || ''}
                            onChange={(e) => {
                              updateMethodMutation.mutate({
                                id: method.id,
                                data: { walletAddress: e.target.value }
                              });
                            }}
                            className="form-input"
                            placeholder="USDT wallet address"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instructions
                      </label>
                      <textarea
                        value={method.instructions || ''}
                        onChange={(e) => {
                          updateMethodMutation.mutate({
                            id: method.id,
                            data: { instructions: e.target.value }
                          });
                        }}
                        className="form-input"
                        rows={2}
                        placeholder="Payment instructions for users"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deposits Tab */}
      {activeTab === 'deposits' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Deposit Requests</h2>

          {depositsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UTR Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deposits?.deposits?.map((deposit: any) => (
                      <tr key={deposit.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {deposit.user.username}
                            </div>
                            <div className="text-sm text-gray-500">
                              {deposit.user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(deposit.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {deposit.paymentMethod.displayName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-mono text-gray-900">
                            {deposit.utrCode}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(deposit.status)}`}>
                            {deposit.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(deposit.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {deposit.status === 'PENDING' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setActionModal({ type: 'approve', request: { ...deposit, type: 'deposit' } })}
                                className="text-green-600 hover:text-green-900"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setActionModal({ type: 'reject', request: { ...deposit, type: 'deposit' } })}
                                className="text-red-600 hover:text-red-900"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Withdrawals Tab - Similar structure to deposits */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Withdrawal Requests</h2>
          <div className="text-center py-12 text-gray-500">
            <p>Withdrawal management interface will be implemented here</p>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {actionModal.type === 'approve' ? 'Approve' : 'Reject'} Request
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  User: <span className="font-semibold">{actionModal.request.user.username}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Amount: <span className="font-semibold">{formatCurrency(actionModal.request.amount)}</span>
                </p>
                {actionModal.request.utrCode && (
                  <p className="text-sm text-gray-600">
                    UTR: <span className="font-mono">{actionModal.request.utrCode}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {actionModal.type === 'approve' ? 'Admin Notes' : 'Rejection Reason'}
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={actionModal.type === 'approve' ? 'Optional notes...' : 'Please provide a reason for rejection'}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setActionModal(null)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleProcessRequest('', actionModal.type === 'reject' ? 'Admin rejection' : undefined)}
                  className={`btn flex-1 ${
                    actionModal.type === 'approve' ? 'btn-success' : 'btn-danger'
                  }`}
                >
                  {actionModal.type === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentManagementPage;