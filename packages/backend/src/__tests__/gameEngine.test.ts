import { GameEngine } from '../services/GameEngine';
import { RedisService } from '../services/RedisService';
import { PrismaClient } from '@prisma/client';
import { determineLeastChosenNumber, calculatePayout } from '@win5x/common';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../services/RedisService');

describe('GameEngine', () => {
  let gameEngine: GameEngine;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockRedis: jest.Mocked<RedisService>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockRedis = new RedisService() as jest.Mocked<RedisService>;
    gameEngine = new GameEngine(mockPrisma, mockRedis);
  });

  describe('Least Chosen Number Logic', () => {
    test('should determine least chosen number correctly', () => {
      const betDistribution = {
        '0': 100,
        '1': 200,
        '2': 50,  // Least chosen
        '3': 150,
        '4': 300,
        '5': 0,   // No bets, should be chosen
        '6': 100,
        '7': 250,
        '8': 180,
        '9': 120,
      };

      const result = determineLeastChosenNumber(betDistribution);
      expect(result).toBe(5); // Number with 0 bets
    });

    test('should handle tie in least chosen numbers', () => {
      const betDistribution = {
        '0': 100,
        '1': 50,  // Tied for least
        '2': 50,  // Tied for least
        '3': 150,
        '4': 200,
        '5': 100,
        '6': 100,
        '7': 250,
        '8': 180,
        '9': 120,
      };

      const result = determineLeastChosenNumber(betDistribution);
      expect([1, 2]).toContain(result);
    });
  });

  describe('Payout Calculation', () => {
    test('should calculate number bet payout correctly', () => {
      const payout = calculatePayout('number', 5, 100, 5);
      expect(payout).toBe(500); // 100 * 5x multiplier

      const lossPayout = calculatePayout('number', 3, 100, 5);
      expect(lossPayout).toBe(0);
    });

    test('should calculate color bet payout correctly', () => {
      const redPayout = calculatePayout('color', 'red', 100, 1); // 1 is red
      expect(redPayout).toBe(500);

      const blackPayout = calculatePayout('color', 'black', 100, 1); // 1 is red
      expect(blackPayout).toBe(0);
    });

    test('should calculate odd/even bet payout correctly', () => {
      const oddPayout = calculatePayout('odd_even', 'odd', 100, 3); // 3 is odd
      expect(oddPayout).toBe(500);

      const evenPayout = calculatePayout('odd_even', 'even', 100, 3); // 3 is odd
      expect(evenPayout).toBe(0);
    });
  });

  describe('Bet Validation', () => {
    test('should validate bet amounts within limits', async () => {
      const mockUser = {
        id: 'user-1',
        balance: 1000,
      };

      const mockRound = {
        id: 'round-1',
        status: 'BETTING',
        bettingEndTime: new Date(Date.now() + 30000),
      };

      mockPrisma.gameRound.findUnique = jest.fn().mockResolvedValue(mockRound);
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      // Test valid bet
      expect(async () => {
        await gameEngine.placeBet('user-1', 'round-1', 'number', 5, 100);
      }).not.toThrow();

      // Test invalid bet amount (too low)
      await expect(
        gameEngine.placeBet('user-1', 'round-1', 'number', 5, 5)
      ).rejects.toThrow('Bet amount must be between');

      // Test insufficient balance
      await expect(
        gameEngine.placeBet('user-1', 'round-1', 'number', 5, 2000)
      ).rejects.toThrow('Insufficient balance');
    });
  });
});