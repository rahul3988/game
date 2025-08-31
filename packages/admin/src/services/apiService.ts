import { authService } from './authService';
import { 
  User, 
  Bet, 
  GameRound, 
  Transaction, 
  AnalyticsData,
  PaginatedResponse,
  ApiResponse,
  GameConfig,
  AuditLog,
  API_ENDPOINTS
} from '@win5x/common';

const api = authService.getApi();

export const apiService = {
  // Analytics
  async getAnalytics(period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<AnalyticsData> {
    const response = await api.get(`${API_ENDPOINTS.ANALYTICS}?period=${period}`);
    return response.data.data;
  },

  // Users
  async getUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<User>> {
    const response = await api.get(API_ENDPOINTS.USERS, { params });
    return response.data.data;
  },

  async getUserById(userId: string): Promise<User> {
    const response = await api.get(`${API_ENDPOINTS.USERS}/${userId}`);
    return response.data.data;
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    const response = await api.put(`${API_ENDPOINTS.USERS}/${userId}/status`, {
      isActive,
    });
    return response.data.data;
  },

  async adjustUserBalance(userId: string, amount: number, reason: string): Promise<User> {
    const response = await api.post(`${API_ENDPOINTS.USERS}/${userId}/balance`, {
      amount,
      reason,
    });
    return response.data.data;
  },

  // Transactions
  async getTransactions(params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    type?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<PaginatedResponse<Transaction>> {
    const response = await api.get(API_ENDPOINTS.TRANSACTIONS_ADMIN, { params });
    return response.data.data;
  },

  async approveTransaction(transactionId: string, status: 'APPROVED' | 'REJECTED', reason?: string): Promise<Transaction> {
    const response = await api.put(`${API_ENDPOINTS.TRANSACTIONS_ADMIN}/${transactionId}`, {
      status,
      reason,
    });
    return response.data.data;
  },

  // Bets
  async getBets(params: {
    page?: number;
    pageSize?: number;
    userId?: string;
    roundId?: string;
    betType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<PaginatedResponse<Bet>> {
    const response = await api.get(API_ENDPOINTS.BETS, { params });
    return response.data.data;
  },

  // Rounds
  async getRounds(params: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResponse<GameRound>> {
    const response = await api.get(API_ENDPOINTS.ROUNDS, { params });
    return response.data.data;
  },

  // Game Configuration
  async getGameConfig(): Promise<GameConfig> {
    const response = await api.get(API_ENDPOINTS.GAME_CONFIG);
    return response.data.data;
  },

  async updateGameConfig(config: Partial<GameConfig>): Promise<GameConfig> {
    const response = await api.put(API_ENDPOINTS.GAME_CONFIG, config);
    return response.data.data;
  },

  // Emergency Controls
  async emergencyStop(reason?: string): Promise<void> {
    await api.post(API_ENDPOINTS.EMERGENCY_STOP, { reason });
  },

  async manualSpin(): Promise<void> {
    await api.post(API_ENDPOINTS.MANUAL_SPIN);
  },

  // Audit Logs
  async getAuditLogs(params: {
    page?: number;
    pageSize?: number;
  } = {}): Promise<PaginatedResponse<AuditLog>> {
    const response = await api.get('/api/admin/audit-logs', { params });
    return response.data.data;
  },

  // System Status
  async getSystemStatus(): Promise<{
    gameEngine: {
      isRunning: boolean;
      currentRound: number | null;
    };
    database: {
      connected: boolean;
    };
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: string;
  }> {
    const response = await api.get('/api/admin/system-status');
    return response.data.data;
  },

  // Payment Management
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