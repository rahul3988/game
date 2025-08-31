import { NUMBER_COLORS, TIME_CONSTANTS } from '../constants';
import { BetType } from '../types';

// Game Utilities
export function getNumberColor(number: number): 'red' | 'black' {
  return NUMBER_COLORS[number as keyof typeof NUMBER_COLORS] || 'black';
}

export function isNumberOdd(number: number): boolean {
  return number % 2 === 1;
}

export function calculatePayout(betType: BetType, betValue: number | string, amount: number, winningNumber: number): number {
  const multiplier = 5; // 5x payout
  
  switch (betType) {
    case 'number':
      return betValue === winningNumber ? amount * multiplier : 0;
    case 'odd_even':
      const isWinningOdd = isNumberOdd(winningNumber);
      const betIsOdd = betValue === 'odd';
      return isWinningOdd === betIsOdd ? amount * multiplier : 0;
    case 'color':
      const winningColor = getNumberColor(winningNumber);
      return betValue === winningColor ? amount * multiplier : 0;
    default:
      return 0;
  }
}

export function determineLeastChosenNumber(betDistribution: Record<string, number>): number {
  // Find the number with the least total bet amount
  let leastChosenNumber = 0;
  let leastAmount = Infinity;
  
  for (let i = 0; i <= 9; i++) {
    const amount = betDistribution[i.toString()] || 0;
    if (amount < leastAmount) {
      leastAmount = amount;
      leastChosenNumber = i;
    }
  }
  
  return leastChosenNumber;
}

// Time Utilities
export function formatTimeRemaining(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  return `${remainingSeconds}s`;
}

export function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < TIME_CONSTANTS.ONE_MINUTE) {
    return 'just now';
  } else if (diffMs < TIME_CONSTANTS.ONE_HOUR) {
    const minutes = Math.floor(diffMs / TIME_CONSTANTS.ONE_MINUTE);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffMs < TIME_CONSTANTS.ONE_DAY) {
    const hours = Math.floor(diffMs / TIME_CONSTANTS.ONE_HOUR);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffMs < TIME_CONSTANTS.ONE_WEEK) {
    const days = Math.floor(diffMs / TIME_CONSTANTS.ONE_DAY);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function isDateToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function getDateRange(period: 'daily' | 'weekly' | 'monthly'): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  
  switch (period) {
    case 'daily':
      // Already set to today
      break;
    case 'weekly':
      start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      break;
    case 'monthly':
      start.setDate(1); // Start of month
      break;
  }
  
  return { start, end };
}

// Number Utilities
export function formatCurrency(amount: number, currency: string = '$'): string {
  return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function roundToDecimal(num: number, decimals: number = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// String Utilities
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Array Utilities
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

// Validation Utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  return username.length >= 3 && username.length <= 20 && usernameRegex.test(username);
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Error Utilities
export function createErrorResponse(message: string, code?: string, statusCode: number = 400) {
  return {
    success: false,
    error: message,
    code,
    statusCode,
  };
}

export function createSuccessResponse<T>(data: T, message?: string) {
  return {
    success: true,
    data,
    message,
  };
}

// Local Storage Utilities (for frontend)
export const storage = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Handle storage quota exceeded or other errors
    }
  },
  
  remove: (key: string): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
  
  clear: (): void => {
    if (typeof window === 'undefined') return;
    window.localStorage.clear();
  },
};

// Debounce Utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle Utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Deep Clone Utility
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const copy: any = {};
    Object.keys(obj).forEach(key => {
      copy[key] = deepClone((obj as any)[key]);
    });
    return copy;
  }
  return obj;
}