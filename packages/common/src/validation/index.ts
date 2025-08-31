import { z } from 'zod';
import { VALIDATION_RULES, GAME_CONFIG } from '../constants';
import { BetType } from '../types';

// Auth Schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(VALIDATION_RULES.USERNAME.MIN_LENGTH, `Username must be at least ${VALIDATION_RULES.USERNAME.MIN_LENGTH} characters`)
    .max(VALIDATION_RULES.USERNAME.MAX_LENGTH, `Username must be at most ${VALIDATION_RULES.USERNAME.MAX_LENGTH} characters`)
    .regex(VALIDATION_RULES.USERNAME.PATTERN, 'Username can only contain letters, numbers, and underscores'),
  email: z
    .string()
    .email('Invalid email format')
    .regex(VALIDATION_RULES.EMAIL.PATTERN, 'Invalid email format'),
  password: z
    .string()
    .min(VALIDATION_RULES.PASSWORD.MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`)
    .max(VALIDATION_RULES.PASSWORD.MAX_LENGTH, `Password must be at most ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters`)
    .refine((password) => {
      if (VALIDATION_RULES.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
        return false;
      }
      if (VALIDATION_RULES.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
        return false;
      }
      if (VALIDATION_RULES.PASSWORD.REQUIRE_DIGIT && !/\d/.test(password)) {
        return false;
      }
      return true;
    }, 'Password must contain uppercase, lowercase, and digit'),
});

// Bet Schemas
export const placeBetSchema = z.object({
  roundId: z.string().uuid('Invalid round ID'),
  betType: z.enum(['number', 'odd_even', 'color'] as const),
  betValue: z.union([
    z.number().int().min(0).max(9), // for number bets
    z.enum(['odd', 'even']), // for odd/even bets
    z.enum(['red', 'black']), // for color bets
  ]),
  amount: z
    .number()
    .min(GAME_CONFIG.MIN_BET_AMOUNT, `Minimum bet amount is ${GAME_CONFIG.MIN_BET_AMOUNT}`)
    .max(GAME_CONFIG.MAX_BET_AMOUNT, `Maximum bet amount is ${GAME_CONFIG.MAX_BET_AMOUNT}`),
});

// Transaction Schemas
export const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  reference: z.string().optional(),
});

export const withdrawalSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  accountDetails: z.string().min(1, 'Account details are required'),
});

// Admin Schemas
export const gameConfigSchema = z.object({
  bettingDuration: z.number().int().min(10).max(300),
  spinDuration: z.number().int().min(5).max(60),
  resultDuration: z.number().int().min(5).max(60),
  minBetAmount: z.number().positive(),
  maxBetAmount: z.number().positive(),
  payoutMultiplier: z.number().positive(),
  cashbackPercentage: z.number().min(0).max(100),
  maxExposure: z.number().positive(),
});

export const adminActionSchema = z.object({
  action: z.enum(['emergency_stop', 'manual_spin', 'extend_betting', 'cancel_round']),
  data: z.any().optional(),
  reason: z.string().optional(),
});

// Query Schemas
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const userQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  sortBy: z.enum(['username', 'email', 'balance', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const betHistorySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  roundId: z.string().uuid().optional(),
  betType: z.enum(['number', 'odd_even', 'color']).optional(),
  status: z.enum(['pending', 'won', 'lost', 'cancelled', 'refunded']).optional(),
  ...dateRangeSchema.shape,
});

export const transactionHistorySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  type: z.enum(['deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_lost', 'cashback', 'admin_adjustment']).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'completed', 'cancelled']).optional(),
  ...dateRangeSchema.shape,
});

// Validation Helpers
export function validateBetValue(betType: BetType, betValue: number | string): boolean {
  switch (betType) {
    case 'number':
      return typeof betValue === 'number' && betValue >= 0 && betValue <= 9 && Number.isInteger(betValue);
    case 'odd_even':
      return betValue === 'odd' || betValue === 'even';
    case 'color':
      return betValue === 'red' || betValue === 'black';
    default:
      return false;
  }
}

export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters long`);
  }
  
  if (password.length > VALIDATION_RULES.PASSWORD.MAX_LENGTH) {
    errors.push(`Password must be at most ${VALIDATION_RULES.PASSWORD.MAX_LENGTH} characters long`);
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_DIGIT && !/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Type exports for schema inference
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type PlaceBetRequest = z.infer<typeof placeBetSchema>;
export type DepositRequest = z.infer<typeof depositSchema>;
export type WithdrawalRequest = z.infer<typeof withdrawalSchema>;
export type GameConfigRequest = z.infer<typeof gameConfigSchema>;
export type AdminActionRequest = z.infer<typeof adminActionSchema>;
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type DateRangeQuery = z.infer<typeof dateRangeSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
export type BetHistoryQuery = z.infer<typeof betHistorySchema>;
export type TransactionHistoryQuery = z.infer<typeof transactionHistorySchema>;