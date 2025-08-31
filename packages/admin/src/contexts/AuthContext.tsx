import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Admin, AuthTokens } from '@win5x/common';
import { authService } from '../services/authService';
import { toast } from 'sonner';

interface AuthContextType {
  admin: Admin | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedTokens = authService.getStoredTokens();
      if (storedTokens) {
        const adminData = await authService.verifyToken(storedTokens.accessToken);
        if (adminData) {
          setAdmin(adminData);
          setTokens(storedTokens);
        } else {
          authService.clearStoredTokens();
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      authService.clearStoredTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authService.login(username, password);
      
      setAdmin(response.admin);
      setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      
      authService.storeTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });
      
      toast.success('Login successful');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setAdmin(null);
    setTokens(null);
    authService.clearStoredTokens();
    toast.success('Logged out successfully');
  };

  const hasPermission = (permission: string): boolean => {
    if (!admin || !admin.permissions) return false;
    return admin.permissions.includes(permission as any);
  };

  const value: AuthContextType = {
    admin,
    tokens,
    isLoading,
    login,
    logout,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}