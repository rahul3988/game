import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, requireUser, validateUserStatus, AuthenticatedRequest } from '../middleware/auth';
import { 
  depositSchema, 
  withdrawalSchema, 
  paginationSchema,
  betHistorySchema,
  transactionHistorySchema,
  ValidationError,
  createSuccessResponse,
  PAGINATION 
} from '@win5x/common';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all user routes
router.use(authenticateToken);
router.use(requireUser);
router.use(validateUserStatus);

// Get user profile
router.get('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      username: true,
      email: true,
      balance: true,
      gameCredit: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  res.json(createSuccessResponse(user));
}));

// Update user profile
router.put('/profile', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { email } = req.body;

  if (email) {
    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: req.user!.id },
      },
    });

    if (existingUser) {
      throw new ValidationError('Email is already taken');
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(email && { email }),
    },
    select: {
      id: true,
      username: true,
      email: true,
      balance: true,
      gameCredit: true,
      updatedAt: true,
    },
  });

  logger.info(`User profile updated: ${req.user!.username} (${req.user!.id})`);

  res.json(createSuccessResponse(updatedUser, 'Profile updated successfully'));
}));

// Get user balance
router.get('/balance', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { balance: true, gameCredit: true },
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  res.json(createSuccessResponse(user));
}));

// Deposit request
router.post('/deposit', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = depositSchema.parse(req.body);
  const { amount, paymentMethod, reference } = validatedData;

  // Create deposit transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      type: 'DEPOSIT',
      amount,
      status: 'PENDING',
      description: `Deposit via ${paymentMethod}`,
      reference,
    },
  });

  logger.info(`Deposit request created: ${req.user!.username} requested ${amount} via ${paymentMethod}`);

  res.status(201).json(createSuccessResponse(transaction, 'Deposit request submitted successfully'));
}));

// Withdrawal request
router.post('/withdraw', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = withdrawalSchema.parse(req.body);
  const { amount, paymentMethod, accountDetails } = validatedData;

  // Check if user has sufficient balance
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { balance: true },
  });

  if (!user || user.balance < amount) {
    throw new ValidationError('Insufficient balance');
  }

  // Create withdrawal transaction
  const transaction = await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      type: 'WITHDRAWAL',
      amount: -amount, // Negative for withdrawal
      status: 'PENDING',
      description: `Withdrawal to ${paymentMethod}: ${accountDetails}`,
    },
  });

  logger.info(`Withdrawal request created: ${req.user!.username} requested ${amount} to ${paymentMethod}`);

  res.status(201).json(createSuccessResponse(transaction, 'Withdrawal request submitted successfully'));
}));

// Get transaction history
router.get('/transactions', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = transactionHistorySchema.parse(req.query);
  const { page, pageSize, type, status, startDate, endDate } = query;

  const where: any = {
    userId: req.user!.id,
  };

  if (type) {
    where.type = type.toUpperCase();
  }

  if (status) {
    where.status = status.toUpperCase();
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        amount: true,
        status: true,
        description: true,
        reference: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: transactions,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get bet history
router.get('/bets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = betHistorySchema.parse(req.query);
  const { page, pageSize, roundId, betType, status, startDate, endDate } = query;

  const where: any = {
    userId: req.user!.id,
  };

  if (roundId) {
    where.roundId = roundId;
  }

  if (betType) {
    where.betType = betType.toUpperCase();
  }

  if (status) {
    where.status = status.toUpperCase();
  }

  if (startDate || endDate) {
    where.placedAt = {};
    if (startDate) {
      where.placedAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.placedAt.lte = new Date(endDate);
    }
  }

  const [bets, total] = await Promise.all([
    prisma.bet.findMany({
      where,
      orderBy: { placedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        round: {
          select: {
            roundNumber: true,
            winningNumber: true,
            winningColor: true,
            isWinningOdd: true,
            status: true,
          },
        },
      },
    }),
    prisma.bet.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: bets,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get user statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Get bet statistics
  const [
    totalBets,
    totalWagered,
    totalWon,
    winningBets,
    recentBets,
  ] = await Promise.all([
    prisma.bet.count({
      where: { userId },
    }),
    prisma.bet.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.bet.aggregate({
      where: { userId, status: 'WON' },
      _sum: { actualPayout: true },
    }),
    prisma.bet.count({
      where: { userId, status: 'WON' },
    }),
    prisma.bet.findMany({
      where: { userId },
      orderBy: { placedAt: 'desc' },
      take: 10,
      include: {
        round: {
          select: {
            roundNumber: true,
            winningNumber: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const totalWageredAmount = totalWagered._sum.amount || 0;
  const totalWonAmount = totalWon._sum.actualPayout || 0;
  const winRate = totalBets > 0 ? (winningBets / totalBets) * 100 : 0;
  const netProfit = totalWonAmount - totalWageredAmount;

  const stats = {
    totalBets,
    totalWagered: totalWageredAmount,
    totalWon: totalWonAmount,
    winningBets,
    winRate: Math.round(winRate * 100) / 100,
    netProfit,
    recentBets,
  };

  res.json(createSuccessResponse(stats));
}));

// Get user's current active bets
router.get('/active-bets', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const activeBets = await prisma.bet.findMany({
    where: {
      userId: req.user!.id,
      status: 'PENDING',
    },
    include: {
      round: {
        select: {
          id: true,
          roundNumber: true,
          status: true,
          bettingEndTime: true,
        },
      },
    },
    orderBy: { placedAt: 'desc' },
  });

  res.json(createSuccessResponse(activeBets));
}));

// Convert game credit to balance (if allowed)
router.post('/convert-credit', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw new ValidationError('Invalid amount');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { gameCredit: true },
  });

  if (!user || user.gameCredit < amount) {
    throw new ValidationError('Insufficient game credit');
  }

  // Note: In a real implementation, you might have restrictions on credit conversion
  // For now, we'll allow direct conversion
  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      gameCredit: { decrement: amount },
      balance: { increment: amount },
    },
  });

  // Create transaction record
  await prisma.transaction.create({
    data: {
      userId: req.user!.id,
      type: 'ADMIN_ADJUSTMENT',
      amount,
      status: 'COMPLETED',
      description: `Converted ${amount} game credit to balance`,
    },
  });

  logger.info(`Game credit converted: ${req.user!.username} converted ${amount} credit to balance`);

  res.json(createSuccessResponse(null, 'Game credit converted successfully'));
}));

export { router as userRoutes };