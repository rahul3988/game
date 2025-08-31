import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { 
  placeBetSchema, 
  paginationSchema,
  ValidationError,
  GameError,
  createSuccessResponse 
} from '@win5x/common';
import { gameEngine } from '../server';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Get current round (public)
router.get('/current-round', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const currentRound = gameEngine?.getCurrentRound();
  
  if (!currentRound) {
    res.json(createSuccessResponse(null, 'No active round'));
    return;
  }

  // Get bet distribution
  const bets = await prisma.bet.findMany({
    where: { roundId: currentRound.id, status: 'PENDING' },
  });

  const distribution = {
    numbers: {} as Record<string, { count: number; amount: number }>,
    oddEven: { odd: { count: 0, amount: 0 }, even: { count: 0, amount: 0 } },
    colors: { red: { count: 0, amount: 0 }, black: { count: 0, amount: 0 } },
  };

  // Initialize numbers
  for (let i = 0; i <= 9; i++) {
    distribution.numbers[i.toString()] = { count: 0, amount: 0 };
  }

  bets.forEach(bet => {
    const betValue = JSON.parse(bet.betValue);
    
    switch (bet.betType) {
      case 'NUMBER':
        if (typeof betValue === 'number' && betValue >= 0 && betValue <= 9) {
          distribution.numbers[betValue.toString()].count++;
          distribution.numbers[betValue.toString()].amount += bet.amount;
        }
        break;
      
      case 'ODD_EVEN':
        if (betValue === 'odd' || betValue === 'even') {
          distribution.oddEven[betValue as 'odd' | 'even'].count++;
          distribution.oddEven[betValue as 'odd' | 'even'].amount += bet.amount;
        }
        break;
      
      case 'COLOR':
        if (betValue === 'red' || betValue === 'black') {
          distribution.colors[betValue as 'red' | 'black'].count++;
          distribution.colors[betValue as 'red' | 'black'].amount += bet.amount;
        }
        break;
    }
  });

  res.json(createSuccessResponse({
    round: currentRound,
    distribution,
    totalBets: bets.length,
    totalAmount: bets.reduce((sum, bet) => sum + bet.amount, 0),
  }));
}));

// Get round history (public)
router.get('/rounds', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const query = paginationSchema.parse(req.query);
  const { page, pageSize } = query;

  const [rounds, total] = await Promise.all([
    prisma.gameRound.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { roundNumber: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        roundNumber: true,
        winningNumber: true,
        winningColor: true,
        isWinningOdd: true,
        totalBetAmount: true,
        totalPayout: true,
        houseProfitLoss: true,
        bettingStartTime: true,
        resultTime: true,
        _count: {
          select: { bets: true },
        },
      },
    }),
    prisma.gameRound.count({
      where: { status: 'COMPLETED' },
    }),
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

// Get specific round details (public)
router.get('/rounds/:roundId', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { roundId } = req.params;

  const round = await prisma.gameRound.findUnique({
    where: { id: roundId },
    include: {
      bets: {
        select: {
          id: true,
          betType: true,
          betValue: true,
          amount: true,
          isWinner: true,
          actualPayout: true,
          status: true,
          placedAt: true,
          user: {
            select: { username: true },
          },
        },
        orderBy: { placedAt: 'desc' },
      },
    },
  });

  if (!round) {
    throw new ValidationError('Round not found');
  }

  res.json(createSuccessResponse(round));
}));

// Place bet (authenticated users only)
router.post('/bet', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (req.user?.type !== 'user') {
    throw new ValidationError('Only users can place bets');
  }

  const validatedData = placeBetSchema.parse(req.body);
  const { roundId, betType, betValue, amount } = validatedData;

  if (!gameEngine) {
    throw new GameError('Game engine not available');
  }

  try {
    const bet = await gameEngine.placeBet(
      req.user.id,
      roundId,
      betType,
      betValue,
      amount
    );

    logger.info(`Bet placed via API: ${req.user.username} bet ${amount} on ${betType}:${betValue}`);

    res.status(201).json(createSuccessResponse(bet, 'Bet placed successfully'));
  } catch (error) {
    logger.error('Failed to place bet via API:', error);
    throw new GameError(error instanceof Error ? error.message : 'Failed to place bet');
  }
}));

// Get leaderboard (public)
router.get('/leaderboard', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
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
    
    default:
      throw new ValidationError('Invalid period. Use daily, weekly, or monthly');
  }

  // Get top winners for the period
  const topWinners = await prisma.bet.groupBy({
    by: ['userId'],
    where: {
      status: 'WON',
      settledAt: dateFilter,
    },
    _sum: {
      actualPayout: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        actualPayout: 'desc',
      },
    },
    take: 20,
  });

  // Get user details
  const userIds = topWinners.map(winner => winner.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });

  const userMap = new Map(users.map(user => [user.id, user]));

  const leaderboard = topWinners.map((winner, index) => {
    const user = userMap.get(winner.userId);
    return {
      rank: index + 1,
      userId: winner.userId,
      username: user?.username || 'Unknown',
      totalWinnings: winner._sum.actualPayout || 0,
      totalWins: winner._count.id,
    };
  });

  res.json(createSuccessResponse({
    period,
    leaderboard,
    generatedAt: new Date().toISOString(),
  }));
}));

// Get game statistics (public)
router.get('/stats', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const [
    totalRounds,
    totalBets,
    totalWagered,
    totalPayout,
    activeUsers,
    recentRounds,
  ] = await Promise.all([
    prisma.gameRound.count({
      where: { status: 'COMPLETED' },
    }),
    prisma.bet.count(),
    prisma.bet.aggregate({
      _sum: { amount: true },
    }),
    prisma.bet.aggregate({
      where: { status: 'WON' },
      _sum: { actualPayout: true },
    }),
    prisma.user.count({
      where: { isActive: true },
    }),
    prisma.gameRound.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { roundNumber: 'desc' },
      take: 10,
      select: {
        roundNumber: true,
        winningNumber: true,
        totalBetAmount: true,
        totalPayout: true,
        houseProfitLoss: true,
        resultTime: true,
      },
    }),
  ]);

  const totalWageredAmount = totalWagered._sum.amount || 0;
  const totalPayoutAmount = totalPayout._sum.actualPayout || 0;
  const houseEdge = totalWageredAmount > 0 ? 
    ((totalWageredAmount - totalPayoutAmount) / totalWageredAmount) * 100 : 0;

  const stats = {
    totalRounds,
    totalBets,
    totalWagered: totalWageredAmount,
    totalPayout: totalPayoutAmount,
    houseEdge: Math.round(houseEdge * 100) / 100,
    activeUsers,
    averageBetAmount: totalBets > 0 ? totalWageredAmount / totalBets : 0,
    recentRounds,
    isGameRunning: gameEngine?.isGameRunning() || false,
    currentRoundNumber: gameEngine?.getCurrentRound()?.roundNumber || null,
  };

  res.json(createSuccessResponse(stats));
}));

// Get game configuration (public)
router.get('/config', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const config = gameEngine?.getGameConfig();
  
  if (!config) {
    throw new GameError('Game configuration not available');
  }

  // Return only public configuration
  const publicConfig = {
    bettingDuration: config.bettingDuration,
    spinDuration: config.spinDuration,
    resultDuration: config.resultDuration,
    minBetAmount: config.minBetAmount,
    maxBetAmount: config.maxBetAmount,
    payoutMultiplier: config.payoutMultiplier,
  };

  res.json(createSuccessResponse(publicConfig));
}));

// Get number statistics (public)
router.get('/number-stats', optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { limit = 100 } = req.query;

  // Get recent completed rounds
  const rounds = await prisma.gameRound.findMany({
    where: { 
      status: 'COMPLETED',
      winningNumber: { not: null },
    },
    orderBy: { roundNumber: 'desc' },
    take: parseInt(limit as string),
    select: {
      winningNumber: true,
      roundNumber: true,
    },
  });

  // Count frequency of each number
  const numberFrequency: Record<number, number> = {};
  for (let i = 0; i <= 9; i++) {
    numberFrequency[i] = 0;
  }

  rounds.forEach(round => {
    if (round.winningNumber !== null) {
      numberFrequency[round.winningNumber]++;
    }
  });

  // Calculate percentages
  const totalRounds = rounds.length;
  const numberStats = Object.entries(numberFrequency).map(([number, count]) => ({
    number: parseInt(number),
    count,
    percentage: totalRounds > 0 ? (count / totalRounds) * 100 : 0,
  }));

  res.json(createSuccessResponse({
    totalRounds,
    numberStats,
    recentWinningNumbers: rounds.slice(0, 20).map(r => r.winningNumber),
  }));
}));

export { router as gameRoutes };