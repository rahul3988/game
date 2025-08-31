import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { generateTokens, verifyRefreshToken } from '../middleware/auth';
import { 
  loginSchema, 
  registerSchema, 
  ValidationError, 
  AuthenticationError,
  createSuccessResponse 
} from '@win5x/common';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// User Registration
router.post('/register', asyncHandler(async (req, res) => {
  const validatedData = registerSchema.parse(req.body);
  const { username, email, password } = validatedData;

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email },
      ],
    },
  });

  if (existingUser) {
    throw new ValidationError('Username or email already exists');
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
    },
    select: {
      id: true,
      username: true,
      email: true,
      balance: true,
      gameCredit: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    username: user.username,
    type: 'user',
  });

  logger.info(`User registered: ${user.username} (${user.id})`);

  res.status(201).json(createSuccessResponse({
    user,
    ...tokens,
  }, 'User registered successfully'));
}));

// User Login
router.post('/login', asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);
  const { username, password } = validatedData;

  // Find user
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        { email: username }, // Allow login with email
      ],
      isActive: true,
    },
  });

  if (!user) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid credentials');
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    username: user.username,
    type: 'user',
  });

  logger.info(`User logged in: ${user.username} (${user.id})`);

  res.json(createSuccessResponse({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      balance: user.balance,
      gameCredit: user.gameCredit,
    },
    ...tokens,
  }, 'Login successful'));
}));

// Admin Login
router.post('/admin/login', asyncHandler(async (req, res) => {
  const validatedData = loginSchema.parse(req.body);
  const { username, password } = validatedData;

  // Find admin
  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { username },
        { email: username },
      ],
      isActive: true,
    },
  });

  if (!admin) {
    throw new AuthenticationError('Invalid admin credentials');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, admin.password);
  if (!isValidPassword) {
    throw new AuthenticationError('Invalid admin credentials');
  }

  // Generate tokens
  const tokens = generateTokens({
    userId: admin.id,
    username: admin.username,
    type: 'admin',
    role: admin.role,
    permissions: admin.permissions,
  });

  logger.info(`Admin logged in: ${admin.username} (${admin.id})`);

  res.json(createSuccessResponse({
    admin: {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions,
    },
    ...tokens,
  }, 'Admin login successful'));
}));

// Refresh Token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AuthenticationError('Refresh token required');
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    let newTokens;
    
    if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId, isActive: true },
      });

      if (!admin) {
        throw new AuthenticationError('Admin not found or inactive');
      }

      newTokens = generateTokens({
        userId: admin.id,
        username: admin.username,
        type: 'admin',
        role: admin.role,
        permissions: admin.permissions,
      });
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, isActive: true },
      });

      if (!user) {
        throw new AuthenticationError('User not found or inactive');
      }

      newTokens = generateTokens({
        userId: user.id,
        username: user.username,
        type: 'user',
      });
    }

    res.json(createSuccessResponse(newTokens, 'Tokens refreshed successfully'));
  } catch (error) {
    throw new AuthenticationError('Invalid refresh token');
  }
}));

// Logout (optional - mainly for client-side token cleanup)
router.post('/logout', asyncHandler(async (req, res) => {
  // In a more sophisticated implementation, you might want to blacklist tokens
  // For now, we'll just return success and let the client handle token cleanup
  
  res.json(createSuccessResponse(null, 'Logged out successfully'));
}));

// Verify Token (for client-side token validation)
router.get('/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new AuthenticationError('Token required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.type === 'admin') {
      const admin = await prisma.admin.findUnique({
        where: { id: decoded.userId, isActive: true },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          permissions: true,
        },
      });

      if (!admin) {
        throw new AuthenticationError('Admin not found or inactive');
      }

      res.json(createSuccessResponse({
        type: 'admin',
        admin,
      }, 'Token valid'));
    } else {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, isActive: true },
        select: {
          id: true,
          username: true,
          email: true,
          balance: true,
          gameCredit: true,
        },
      });

      if (!user) {
        throw new AuthenticationError('User not found or inactive');
      }

      res.json(createSuccessResponse({
        type: 'user',
        user,
      }, 'Token valid'));
    }
  } catch (error) {
    throw new AuthenticationError('Invalid token');
  }
}));

export { router as authRoutes };