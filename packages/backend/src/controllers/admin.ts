import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  authenticateToken, 
  requireAdmin, 
  requirePermission, 
  validateUserStatus, 
  AuthenticatedRequest 
} from '../middleware/auth';
import { 
  gameConfigSchema,
  adminActionSchema,
  userQuerySchema,
  betHistorySchema,
  transactionHistorySchema,
  paginationSchema,
  ValidationError,
  AuthorizationError,
  createSuccessResponse 
} from '@win5x/common';
import { gameEngine } from '../server';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all admin routes
router.use(authenticateToken);
router.use(requireAdmin);
router.use(validateUserStatus);

// Get dashboard analytics
router.get('/analytics', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { period = 'daily' } = req.query;

  let dateFilter: any = {};
  const now = new Date();
  
  switch (period) {
    case 'daily':
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfDay };
      break;
    
    case 'weekly':
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfWeek };
      break;
    
    case 'monthly':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { gte: startOfMonth };
      break;
  }

  const [
    totalUsers,
    activeUsers,
    totalRounds,
    totalBets,
    totalRevenue,
    totalPayout,
    pendingWithdrawals,
    pendingDeposits,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.gameRound.count({
      where: { 
        status: 'COMPLETED',
        resultTime: dateFilter,
      },
    }),
    prisma.bet.count({
      where: { placedAt: dateFilter },
    }),
    prisma.bet.aggregate({
      where: { placedAt: dateFilter },
      _sum: { amount: true },
    }),
    prisma.bet.aggregate({
      where: { 
        status: 'WON',
        settledAt: dateFilter,
      },
      _sum: { actualPayout: true },
    }),
    prisma.transaction.count({
      where: {
        type: 'WITHDRAWAL',
        status: 'PENDING',
      },
    }),
    prisma.transaction.count({
      where: {
        type: 'DEPOSIT',
        status: 'PENDING',
      },
    }),
    prisma.gameRound.findMany({
      where: {
        status: 'COMPLETED',
        resultTime: dateFilter,
      },
      orderBy: { resultTime: 'desc' },
      take: 10,
      select: {
        roundNumber: true,
        winningNumber: true,
        totalBetAmount: true,
        totalPayout: true,
        houseProfitLoss: true,
        resultTime: true,
        _count: { select: { bets: true } },
      },
    }),
  ]);

  const revenue = totalRevenue._sum.amount || 0;
  const payout = totalPayout._sum.actualPayout || 0;
  const houseProfitLoss = revenue - payout;

  const analytics = {
    period,
    summary: {
      totalUsers,
      activeUsers,
      totalRounds,
      totalBets,
      revenue,
      payout,
      houseProfitLoss,
      houseEdge: revenue > 0 ? ((houseProfitLoss / revenue) * 100) : 0,
    },
    pending: {
      withdrawals: pendingWithdrawals,
      deposits: pendingDeposits,
    },
    recentActivity,
    generatedAt: new Date().toISOString(),
  };

  res.json(createSuccessResponse(analytics));
}));

// Get all users
router.get('/users', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = userQuerySchema.parse(req.query);
  const { page, pageSize, search, isActive, sortBy, sortOrder } = query;

  const where: any = {};
  
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }
  
  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        username: true,
        email: true,
        balance: true,
        gameCredit: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bets: true,
            transactions: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: users,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get user details
router.get('/users/:userId', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bets: {
        orderBy: { placedAt: 'desc' },
        take: 20,
        include: {
          round: {
            select: {
              roundNumber: true,
              winningNumber: true,
            },
          },
        },
      },
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      _count: {
        select: {
          bets: true,
          transactions: true,
        },
      },
    },
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  // Calculate user statistics
  const [totalWagered, totalWon, winningBets] = await Promise.all([
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
  ]);

  const stats = {
    totalWagered: totalWagered._sum.amount || 0,
    totalWon: totalWon._sum.actualPayout || 0,
    winningBets,
    totalBets: user._count.bets,
    winRate: user._count.bets > 0 ? (winningBets / user._count.bets) * 100 : 0,
  };

  res.json(createSuccessResponse({
    ...user,
    stats,
  }));
}));

// Update user status
router.put('/users/:userId/status', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== 'boolean') {
    throw new ValidationError('isActive must be a boolean');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'UPDATE_USER_STATUS',
      target: 'USER',
      targetId: userId,
      oldValue: JSON.stringify({ isActive: !isActive }),
      newValue: JSON.stringify({ isActive }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`User status updated by admin: ${req.user!.username} ${isActive ? 'activated' : 'deactivated'} user ${updatedUser.username}`);

  res.json(createSuccessResponse(updatedUser, `User ${isActive ? 'activated' : 'deactivated'} successfully`));
}));

// Adjust user balance
router.post('/users/:userId/balance', requirePermission('MANAGE_USERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;
  const { amount, reason } = req.body;

  if (!amount || typeof amount !== 'number') {
    throw new ValidationError('Valid amount is required');
  }

  if (!reason || typeof reason !== 'string') {
    throw new ValidationError('Reason is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, balance: true },
  });

  if (!user) {
    throw new ValidationError('User not found');
  }

  const oldBalance = user.balance;

  // Update user balance
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      balance: { increment: amount },
    },
    select: {
      id: true,
      username: true,
      balance: true,
    },
  });

  // Create transaction record
  await prisma.transaction.create({
    data: {
      userId,
      type: 'ADMIN_ADJUSTMENT',
      amount,
      status: 'COMPLETED',
      description: reason,
      approvedBy: req.user!.id,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'ADJUST_USER_BALANCE',
      target: 'USER',
      targetId: userId,
      oldValue: JSON.stringify({ balance: oldBalance }),
      newValue: JSON.stringify({ balance: updatedUser.balance }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`Balance adjusted by admin: ${req.user!.username} adjusted ${user.username}'s balance by ${amount} (${reason})`);

  res.json(createSuccessResponse(updatedUser, 'Balance adjusted successfully'));
}));

// Get all transactions
router.get('/transactions', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = transactionHistorySchema.parse(req.query);
  const { page, pageSize, userId, type, status, startDate, endDate } = query;

  const where: any = {};
  
  if (userId) {
    where.userId = userId;
  }
  
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
      include: {
        user: {
          select: { username: true, email: true },
        },
        approver: {
          select: { username: true },
        },
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

// Approve/reject transaction
router.put('/transactions/:transactionId', requirePermission('MANAGE_WITHDRAWALS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { transactionId } = req.params;
  const { status, reason } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    throw new ValidationError('Status must be APPROVED or REJECTED');
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: true },
  });

  if (!transaction) {
    throw new ValidationError('Transaction not found');
  }

  if (transaction.status !== 'PENDING') {
    throw new ValidationError('Transaction is not pending');
  }

  const oldStatus = transaction.status;

  // Update transaction
  const updatedTransaction = await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status,
      approvedBy: req.user!.id,
      description: reason ? `${transaction.description} - ${reason}` : transaction.description,
    },
    include: {
      user: { select: { username: true } },
      approver: { select: { username: true } },
    },
  });

  // Handle balance adjustments
  if (status === 'APPROVED') {
    if (transaction.type === 'DEPOSIT') {
      // Add deposit amount to user balance
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { balance: { increment: transaction.amount } },
      });
    } else if (transaction.type === 'WITHDRAWAL') {
      // Deduct withdrawal amount from user balance (amount is already negative)
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { balance: { increment: transaction.amount } },
      });
    }
  } else if (status === 'REJECTED' && transaction.type === 'WITHDRAWAL') {
    // Refund withdrawal amount back to user balance
    await prisma.user.update({
      where: { id: transaction.userId },
      data: { balance: { increment: Math.abs(transaction.amount) } },
    });
  }

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'APPROVE_TRANSACTION',
      target: 'TRANSACTION',
      targetId: transactionId,
      oldValue: JSON.stringify({ status: oldStatus }),
      newValue: JSON.stringify({ status }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`Transaction ${status.toLowerCase()} by admin: ${req.user!.username} ${status.toLowerCase()} ${transaction.type} of ${transaction.amount} for ${transaction.user.username}`);

  res.json(createSuccessResponse(updatedTransaction, `Transaction ${status.toLowerCase()} successfully`));
}));

// Get all bets
router.get('/bets', requirePermission('MANAGE_BETS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = betHistorySchema.parse(req.query);
  const { page, pageSize, userId, roundId, betType, status, startDate, endDate } = query;

  const where: any = {};
  
  if (userId) {
    where.userId = userId;
  }
  
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
        user: {
          select: { username: true, email: true },
        },
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

// Get all rounds
router.get('/rounds', requirePermission('MANAGE_BETS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  const [rounds, total] = await Promise.all([
    prisma.gameRound.findMany({
      orderBy: { roundNumber: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { bets: true },
        },
      },
    }),
    prisma.gameRound.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: rounds,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get game configuration
router.get('/game-config', requirePermission('MANAGE_TIMERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const config = gameEngine?.getGameConfig();
  
  if (!config) {
    throw new ValidationError('Game configuration not available');
  }

  res.json(createSuccessResponse(config));
}));

// Update game configuration
router.put('/game-config', requirePermission('MANAGE_TIMERS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const validatedData = gameConfigSchema.parse(req.body);

  if (!gameEngine) {
    throw new ValidationError('Game engine not available');
  }

  const oldConfig = gameEngine.getGameConfig();

  // Update configuration
  await gameEngine.updateGameConfig(validatedData);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'UPDATE_GAME_CONFIG',
      target: 'GAME_CONFIG',
      oldValue: JSON.stringify(oldConfig),
      newValue: JSON.stringify(validatedData),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.info(`Game configuration updated by admin: ${req.user!.username}`);

  res.json(createSuccessResponse(validatedData, 'Game configuration updated successfully'));
}));

// Emergency stop
router.post('/emergency-stop', requirePermission('EMERGENCY_CONTROLS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { reason } = req.body;

  if (!gameEngine) {
    throw new ValidationError('Game engine not available');
  }

  await gameEngine.emergencyStop();

  // Create audit log
  await prisma.auditLog.create({
    data: {
      adminId: req.user!.id,
      action: 'EMERGENCY_STOP',
      target: 'GAME_ENGINE',
      newValue: JSON.stringify({ reason: reason || 'Emergency stop executed' }),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    },
  });

  logger.warn(`Emergency stop executed by admin: ${req.user!.username} - ${reason || 'No reason provided'}`);

  res.json(createSuccessResponse(null, 'Emergency stop executed successfully'));
}));

// Get audit logs
router.get('/audit-logs', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        admin: {
          select: { username: true, email: true },
        },
      },
    }),
    prisma.auditLog.count(),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  res.json(createSuccessResponse({
    items: logs,
    total,
    page,
    pageSize,
    totalPages,
  }));
}));

// Get system status
router.get('/system-status', requirePermission('VIEW_ANALYTICS'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const status = {
    gameEngine: {
      isRunning: gameEngine?.isGameRunning() || false,
      currentRound: gameEngine?.getCurrentRound()?.roundNumber || null,
    },
    database: {
      connected: true, // If we reach here, DB is connected
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  };

  res.json(createSuccessResponse(status));
}));

export { router as adminRoutes };