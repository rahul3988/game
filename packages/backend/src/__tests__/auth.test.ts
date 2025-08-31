import request from 'supertest';
import { app } from '../server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

jest.mock('@prisma/client');

describe('Authentication Endpoints', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!',
      };

      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);
      mockPrisma.user.create = jest.fn().mockResolvedValue({
        id: 'user-1',
        username: userData.username,
        email: userData.email,
        balance: 0,
        gameCredit: 0,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    test('should reject registration with existing username', async () => {
      const userData = {
        username: 'existinguser',
        email: 'test@example.com',
        password: 'Test123!',
      };

      mockPrisma.user.findFirst = jest.fn().mockResolvedValue({
        id: 'existing-user',
        username: 'existinguser',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    test('should validate password requirements', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak', // Weak password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Test123!', 12);
      
      const mockUser = {
        id: 'user-1',
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        balance: 1000,
        gameCredit: 100,
        isActive: true,
      };

      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.accessToken).toBeDefined();
    });

    test('should reject login with invalid credentials', async () => {
      mockPrisma.user.findFirst = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('JWT Token Management', () => {
    test('should refresh tokens with valid refresh token', async () => {
      // This would require mocking JWT verification
      // Implementation depends on your JWT setup
    });

    test('should reject invalid refresh tokens', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});