import { authService } from './authService';
import { API_ENDPOINTS } from '@win5x/common';

const api = authService.getApi();

export const gameService = {
  // Get current round
  async getCurrentRound() {
    const response = await api.get(API_ENDPOINTS.CURRENT_ROUND);
    return response.data.data;
  },

  // Get round history
  async getRounds(params: {
    page?: number;
    pageSize?: number;
  } = {}) {
    const response = await api.get(API_ENDPOINTS.ROUND_HISTORY, { params });
    return response.data.data;
  },

  // Place bet
  async placeBet(betData: {
    roundId: string;
    betType: string;
    betValue: number | string;
    amount: number;
  }) {
    const response = await api.post(API_ENDPOINTS.PLACE_BET, betData);
    return response.data.data;
  },

  // Get leaderboard
  async getLeaderboard(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const response = await api.get(`${API_ENDPOINTS.LEADERBOARD}?period=${period}`);
    return response.data.data;
  },

  // Get game statistics
  async getGameStats() {
    const response = await api.get('/api/game/stats');
    return response.data.data;
  },

  // Get number statistics
  async getNumberStats(limit: number = 100) {
    const response = await api.get(`/api/game/number-stats?limit=${limit}`);
    return response.data.data;
  },

  // Get game configuration
  async getGameConfig() {
    const response = await api.get('/api/game/config');
    return response.data.data;
  },
};