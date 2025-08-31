import axios from 'axios';
import { User, AuthTokens, API_ENDPOINTS } from '@win5x/common';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class AuthService {
  private api = axios.create({
    baseURL: API_URL,
    timeout: 10000,
  });

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const tokens = this.getStoredTokens();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const tokens = this.getStoredTokens();
            if (tokens?.refreshToken) {
              const newTokens = await this.refreshToken(tokens.refreshToken);
              this.storeTokens(newTokens);
              
              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            this.clearStoredTokens();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async login(username: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const response = await this.api.post(API_ENDPOINTS.LOGIN, {
      username,
      password,
    });

    return response.data.data;
  }

  async register(username: string, email: string, password: string): Promise<{
    user: User;
    accessToken: string;
    refreshToken: string;
  }> {
    const response = await this.api.post(API_ENDPOINTS.REGISTER, {
      username,
      email,
      password,
    });

    return response.data.data;
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.api.post(API_ENDPOINTS.REFRESH, {
      refreshToken,
    });

    return response.data.data;
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.VERIFY}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success && response.data.data.type === 'user') {
        return response.data.data.user;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.api.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      // Ignore logout errors
    } finally {
      this.clearStoredTokens();
    }
  }

  storeTokens(tokens: AuthTokens): void {
    localStorage.setItem('user_tokens', JSON.stringify(tokens));
  }

  getStoredTokens(): AuthTokens | null {
    try {
      const stored = localStorage.getItem('user_tokens');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  clearStoredTokens(): void {
    localStorage.removeItem('user_tokens');
  }

  getApi() {
    return this.api;
  }
}

export const authService = new AuthService();