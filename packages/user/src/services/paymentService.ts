import { authService } from './authService';

const api = authService.getApi();

export const paymentService = {
  // Payment methods
  async getPaymentMethods() {
    const response = await api.get('/api/payment/methods');
    return response.data.data;
  },

  // Deposits
  async createDepositRequest(data: {
    paymentMethodId: string;
    amount: number;
    utrCode: string;
  }) {
    const response = await api.post('/api/payment/deposit', data);
    return response.data.data;
  },

  async getUserDeposits(params: {
    page?: number;
    pageSize?: number;
  } = {}) {
    const response = await api.get('/api/payment/deposits', { params });
    return response.data.data;
  },

  // Withdrawals
  async createWithdrawalRequest(data: {
    amount: number;
    paymentMethod: string;
    accountDetails: any;
  }) {
    const response = await api.post('/api/payment/withdraw', data);
    return response.data.data;
  },

  async getUserWithdrawals(params: {
    page?: number;
    pageSize?: number;
  } = {}) {
    const response = await api.get('/api/payment/withdrawals', { params });
    return response.data.data;
  },

  // Admin functions
  async getAllPaymentMethods() {
    const response = await api.get('/api/payment/admin/methods');
    return response.data.data;
  },

  async updatePaymentMethod(id: string, data: any) {
    const response = await api.put(`/api/payment/admin/methods/${id}`, data);
    return response.data.data;
  },

  async getAdminDeposits(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    userId?: string;
  } = {}) {
    const response = await api.get('/api/payment/admin/deposits', { params });
    return response.data.data;
  },

  async processDepositRequest(id: string, action: 'approve' | 'reject', notes?: string, reason?: string) {
    const response = await api.put(`/api/payment/admin/deposits/${id}`, {
      action,
      notes,
      reason,
    });
    return response.data.data;
  },

  async getAdminWithdrawals(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    userId?: string;
  } = {}) {
    const response = await api.get('/api/payment/admin/withdrawals', { params });
    return response.data.data;
  },

  async processWithdrawalRequest(id: string, action: 'approve' | 'reject', notes?: string, reason?: string) {
    const response = await api.put(`/api/payment/admin/withdrawals/${id}`, {
      action,
      notes,
      reason,
    });
    return response.data.data;
  },

  async getPaymentStats() {
    const response = await api.get('/api/payment/admin/stats');
    return response.data.data;
  },
};