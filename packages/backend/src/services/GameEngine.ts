import { PrismaClient, GameRound, GameRoundStatus, Bet, BetStatus } from '@prisma/client';
import { RedisService } from './RedisService';
import { logger } from '../utils/logger';
import { 
  GAME_CONFIG, 
  CACHE_KEYS, 
  determineLeastChosenNumber, 
  calculatePayout, 
  getNumberColor,
  isNumberOdd 
} from '@win5x/common';
import { EventEmitter } from 'events';

export interface GameEngineEvents {
  'round_started': (round: GameRound) => void;
  'betting_closed': (round: GameRound) => void;
  'spin_started': (round: GameRound) => void;
  'round_completed': (round: GameRound, winningNumber: number) => void;
  'bet_distribution_updated': (roundId: string, distribution: any) => void;
  'timer_updated': (roundId: string, phase: string, timeRemaining: number) => void;
}

export class GameEngine extends EventEmitter {
  private prisma: PrismaClient;
  private redis: RedisService;
  private currentRound: GameRound | null = null;
  private gameConfig: any;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;
  private roundCounter: number = 0;

  constructor(prisma: PrismaClient, redis: RedisService) {
    super();
    this.prisma = prisma;
    this.redis = redis;
  }

  async initialize(): Promise<void> {
    try {
      // Load game configuration
      await this.loadGameConfig();
      
      // Get the last round number
      const lastRound = await this.prisma.gameRound.findFirst({
        orderBy: { roundNumber: 'desc' },
      });
      
      this.roundCounter = lastRound ? lastRound.roundNumber : 0;
      
      // Check for any incomplete rounds
      await this.handleIncompleteRounds();
      
      logger.info('Game Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Game Engine:', error);
      throw error;
    }
  }

  async loadGameConfig(): Promise<void> {
    try {
      // Try to get from cache first
      const cachedConfig = await this.redis.get(CACHE_KEYS.GAME_CONFIG);
      if (cachedConfig) {
        this.gameConfig = cachedConfig;
        return;
      }

      // Get from database
      const dbConfig = await this.prisma.gameConfig.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      this.gameConfig = dbConfig || {
        bettingDuration: GAME_CONFIG.DEFAULT_BETTING_DURATION,
        spinDuration: GAME_CONFIG.DEFAULT_SPIN_DURATION,
        resultDuration: GAME_CONFIG.DEFAULT_RESULT_DURATION,
        minBetAmount: GAME_CONFIG.MIN_BET_AMOUNT,
        maxBetAmount: GAME_CONFIG.MAX_BET_AMOUNT,
        payoutMultiplier: GAME_CONFIG.PAYOUT_MULTIPLIER,
        cashbackPercentage: GAME_CONFIG.CASHBACK_PERCENTAGE,
        maxExposure: GAME_CONFIG.MAX_EXPOSURE_MULTIPLIER * GAME_CONFIG.MAX_BET_AMOUNT,
      };

      // Cache the configuration
      await this.redis.set(CACHE_KEYS.GAME_CONFIG, this.gameConfig, 300); // 5 minutes cache
    } catch (error) {
      logger.error('Failed to load game configuration:', error);
      throw error;
    }
  }

  async handleIncompleteRounds(): Promise<void> {
    try {
      const incompleteRounds = await this.prisma.gameRound.findMany({
        where: {
          status: {
            in: [GameRoundStatus.BETTING, GameRoundStatus.BETTING_CLOSED, GameRoundStatus.SPINNING],
          },
        },
        include: {
          bets: true,
        },
      });

      for (const round of incompleteRounds) {
        logger.warn(`Found incomplete round ${round.id}, completing it...`);
        await this.completeRound(round);
      }
    } catch (error) {
      logger.error('Failed to handle incomplete rounds:', error);
    }
  }

  start(): void {
    if (this.isRunning) {
      logger.warn('Game Engine is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Game Engine started');
    
    // Start the first round immediately
    this.startNewRound();
  }

  stop(): void {
    if (!this.isRunning) {
      logger.warn('Game Engine is not running');
      return;
    }

    this.isRunning = false;
    
    // Clear all timers
    this.timers.forEach((timer, key) => {
      clearTimeout(timer);
      this.timers.delete(key);
    });

    logger.info('Game Engine stopped');
  }

  async startNewRound(): Promise<GameRound> {
    try {
      if (!this.isRunning) {
        throw new Error('Game Engine is not running');
      }

      this.roundCounter++;
      
      const round = await this.prisma.gameRound.create({
        data: {
          roundNumber: this.roundCounter,
          status: GameRoundStatus.BETTING,
          bettingStartTime: new Date(),
          bettingEndTime: new Date(Date.now() + this.gameConfig.bettingDuration * 1000),
        },
      });

      this.currentRound = round;
      
      // Cache the current round
      await this.redis.set(CACHE_KEYS.CURRENT_ROUND, round, this.gameConfig.bettingDuration + 60);
      
      // Initialize bet distribution
      await this.updateBetDistribution(round.id);
      
      // Emit event
      this.emit('round_started', round);
      
      // Set timer for betting phase
      this.setTimer('betting', round.id, this.gameConfig.bettingDuration * 1000, () => {
        this.closeBetting(round.id);
      });

      // Start timer updates
      this.startTimerUpdates(round.id, 'betting', this.gameConfig.bettingDuration);
      
      logger.info(`Started new round ${round.roundNumber} (${round.id})`);
      
      return round;
    } catch (error) {
      logger.error('Failed to start new round:', error);
      throw error;
    }
  }

  async closeBetting(roundId: string): Promise<void> {
    try {
      const round = await this.prisma.gameRound.update({
        where: { id: roundId },
        data: {
          status: GameRoundStatus.BETTING_CLOSED,
          bettingEndTime: new Date(),
        },
      });

      this.emit('betting_closed', round);
      
      // Start spinning phase
      setTimeout(() => {
        this.startSpinning(roundId);
      }, 1000); // 1 second delay for UI transition

      logger.info(`Closed betting for round ${round.roundNumber}`);
    } catch (error) {
      logger.error(`Failed to close betting for round ${roundId}:`, error);
    }
  }

  async startSpinning(roundId: string): Promise<void> {
    try {
      const round = await this.prisma.gameRound.update({
        where: { id: roundId },
        data: {
          status: GameRoundStatus.SPINNING,
          spinStartTime: new Date(),
        },
      });

      this.emit('spin_started', round);
      
      // Set timer for spinning phase
      this.setTimer('spinning', roundId, this.gameConfig.spinDuration * 1000, () => {
        this.completeRound(round);
      });

      // Start timer updates for spinning
      this.startTimerUpdates(roundId, 'spinning', this.gameConfig.spinDuration);
      
      logger.info(`Started spinning for round ${round.roundNumber}`);
    } catch (error) {
      logger.error(`Failed to start spinning for round ${roundId}:`, error);
    }
  }

  async completeRound(round: GameRound): Promise<void> {
    try {
      // Get all bets for this round
      const bets = await this.prisma.bet.findMany({
        where: { roundId: round.id, status: BetStatus.PENDING },
      });

      // Calculate bet distribution by number
      const numberDistribution: Record<string, number> = {};
      for (let i = 0; i <= 9; i++) {
        numberDistribution[i.toString()] = 0;
      }

      bets.forEach(bet => {
        if (bet.betType === 'NUMBER') {
          const betValue = JSON.parse(bet.betValue);
          if (typeof betValue === 'number' && betValue >= 0 && betValue <= 9) {
            numberDistribution[betValue.toString()] += bet.amount;
          }
        }
      });

      // Determine winning number (least chosen)
      const winningNumber = determineLeastChosenNumber(numberDistribution);
      const winningColor = getNumberColor(winningNumber);
      const isWinningOdd = isNumberOdd(winningNumber);

      // Calculate total bet amount and payout
      let totalBetAmount = 0;
      let totalPayout = 0;

      // Process each bet
      for (const bet of bets) {
        totalBetAmount += bet.amount;
        
        const betValue = JSON.parse(bet.betValue);
        const payout = calculatePayout(
          bet.betType.toLowerCase() as any,
          betValue,
          bet.amount,
          winningNumber
        );

        const isWinner = payout > 0;
        totalPayout += payout;

        // Update bet
        await this.prisma.bet.update({
          where: { id: bet.id },
          data: {
            isWinner,
            actualPayout: payout,
            status: isWinner ? BetStatus.WON : BetStatus.LOST,
            settledAt: new Date(),
          },
        });

        // Update user balance if they won
        if (isWinner) {
          await this.prisma.user.update({
            where: { id: bet.userId },
            data: {
              balance: {
                increment: payout,
              },
            },
          });

          // Create transaction record
          await this.prisma.transaction.create({
            data: {
              userId: bet.userId,
              type: 'BET_WON',
              amount: payout,
              status: 'COMPLETED',
              description: `Won bet on round ${round.roundNumber}`,
            },
          });
        }
      }

      const houseProfitLoss = totalBetAmount - totalPayout;

      // Update round
      const completedRound = await this.prisma.gameRound.update({
        where: { id: round.id },
        data: {
          status: GameRoundStatus.COMPLETED,
          resultTime: new Date(),
          winningNumber,
          winningColor,
          isWinningOdd,
          totalBetAmount,
          totalPayout,
          houseProfitLoss,
        },
      });

      this.emit('round_completed', completedRound, winningNumber);
      
      // Process daily cashback for losing players
      await this.processDailyCashback();
      
      // Clear timers for this round
      this.clearTimer('betting', round.id);
      this.clearTimer('spinning', round.id);
      this.clearTimer('result', round.id);
      
      // Start result display phase
      this.setTimer('result', round.id, this.gameConfig.resultDuration * 1000, () => {
        if (this.isRunning) {
          this.startNewRound();
        }
      });

      // Start timer updates for result phase
      this.startTimerUpdates(round.id, 'result', this.gameConfig.resultDuration);
      
      logger.info(`Completed round ${round.roundNumber}, winning number: ${winningNumber}, house P/L: ${houseProfitLoss}`);
    } catch (error) {
      logger.error(`Failed to complete round ${round.id}:`, error);
    }
  }

  async placeBet(userId: string, roundId: string, betType: string, betValue: any, amount: number): Promise<Bet> {
    try {
      // Validate round is in betting phase
      const round = await this.prisma.gameRound.findUnique({
        where: { id: roundId },
      });

      if (!round || round.status !== GameRoundStatus.BETTING) {
        throw new Error('Betting is not available for this round');
      }

      // Check if betting time has expired
      if (new Date() > round.bettingEndTime!) {
        throw new Error('Betting time has expired');
      }

      // Validate bet amount
      if (amount < this.gameConfig.minBetAmount || amount > this.gameConfig.maxBetAmount) {
        throw new Error(`Bet amount must be between ${this.gameConfig.minBetAmount} and ${this.gameConfig.maxBetAmount}`);
      }

      // Check user balance
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Calculate potential payout
      const potentialPayout = amount * this.gameConfig.payoutMultiplier;

      // Create bet
      const bet = await this.prisma.bet.create({
        data: {
          userId,
          roundId,
          betType: betType.toUpperCase() as any,
          betValue: JSON.stringify(betValue),
          amount,
          potentialPayout,
          status: BetStatus.PENDING,
        },
      });

      // Deduct amount from user balance
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount,
          },
        },
      });

      // Create transaction record
      await this.prisma.transaction.create({
        data: {
          userId,
          type: 'BET_PLACED',
          amount: -amount,
          status: 'COMPLETED',
          description: `Placed bet on round ${round.roundNumber}`,
        },
      });

      // Update bet distribution
      await this.updateBetDistribution(roundId);
      
      logger.info(`Bet placed: ${userId} bet ${amount} on ${betType}:${betValue} for round ${round.roundNumber}`);
      
      return bet;
    } catch (error) {
      logger.error('Failed to place bet:', error);
      throw error;
    }
  }

  async updateBetDistribution(roundId: string): Promise<void> {
    try {
      const bets = await this.prisma.bet.findMany({
        where: { roundId, status: BetStatus.PENDING },
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

      // Cache the distribution
      await this.redis.set(`${CACHE_KEYS.BET_DISTRIBUTION}_${roundId}`, distribution, 300);
      
      this.emit('bet_distribution_updated', roundId, distribution);
    } catch (error) {
      logger.error(`Failed to update bet distribution for round ${roundId}:`, error);
    }
  }

  async processDailyCashback(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get users who lost money today
      const dailyLosers = await this.prisma.transaction.groupBy({
        by: ['userId'],
        where: {
          type: 'BET_PLACED',
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
        _sum: {
          amount: true,
        },
        having: {
          amount: {
            _sum: {
              lt: 0, // Net loss (bet_placed transactions are negative)
            },
          },
        },
      });

      for (const loser of dailyLosers) {
        const dailyLoss = Math.abs(loser._sum.amount || 0);
        const cashbackAmount = dailyLoss * (this.gameConfig.cashbackPercentage / 100);

        if (cashbackAmount > 0) {
          // Add cashback as game credit
          await this.prisma.user.update({
            where: { id: loser.userId },
            data: {
              gameCredit: {
                increment: cashbackAmount,
              },
            },
          });

          // Create transaction record
          await this.prisma.transaction.create({
            data: {
              userId: loser.userId,
              type: 'CASHBACK',
              amount: cashbackAmount,
              status: 'COMPLETED',
              description: `Daily cashback (${this.gameConfig.cashbackPercentage}% of daily loss)`,
            },
          });
        }
      }
    } catch (error) {
      logger.error('Failed to process daily cashback:', error);
    }
  }

  private setTimer(type: string, roundId: string, delay: number, callback: () => void): void {
    const key = `${type}_${roundId}`;
    
    // Clear existing timer
    this.clearTimer(type, roundId);
    
    const timer = setTimeout(callback, delay);
    this.timers.set(key, timer);
  }

  private clearTimer(type: string, roundId: string): void {
    const key = `${type}_${roundId}`;
    const timer = this.timers.get(key);
    
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  private startTimerUpdates(roundId: string, phase: string, durationSeconds: number): void {
    const startTime = Date.now();
    const endTime = startTime + (durationSeconds * 1000);
    
    const updateInterval = setInterval(() => {
      const now = Date.now();
      const timeRemaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      this.emit('timer_updated', roundId, phase, timeRemaining);
      
      if (timeRemaining <= 0) {
        clearInterval(updateInterval);
      }
    }, 1000);
  }

  // Getters
  getCurrentRound(): GameRound | null {
    return this.currentRound;
  }

  getGameConfig(): any {
    return this.gameConfig;
  }

  isGameRunning(): boolean {
    return this.isRunning;
  }

  // Admin controls
  async emergencyStop(): Promise<void> {
    try {
      this.stop();
      
      // Cancel current round if exists
      if (this.currentRound) {
        await this.prisma.gameRound.update({
          where: { id: this.currentRound.id },
          data: { status: GameRoundStatus.CANCELLED },
        });

        // Refund all pending bets
        const pendingBets = await this.prisma.bet.findMany({
          where: { roundId: this.currentRound.id, status: BetStatus.PENDING },
        });

        for (const bet of pendingBets) {
          await this.prisma.bet.update({
            where: { id: bet.id },
            data: { status: BetStatus.REFUNDED },
          });

          await this.prisma.user.update({
            where: { id: bet.userId },
            data: { balance: { increment: bet.amount } },
          });

          await this.prisma.transaction.create({
            data: {
              userId: bet.userId,
              type: 'BET_PLACED',
              amount: bet.amount,
              status: 'COMPLETED',
              description: `Refund for cancelled round ${this.currentRound.roundNumber}`,
            },
          });
        }
      }
      
      logger.warn('Emergency stop executed');
    } catch (error) {
      logger.error('Failed to execute emergency stop:', error);
      throw error;
    }
  }

  async updateGameConfig(newConfig: any): Promise<void> {
    try {
      // Update database
      await this.prisma.gameConfig.create({
        data: {
          ...newConfig,
          isActive: true,
        },
      });

      // Deactivate old configs
      await this.prisma.gameConfig.updateMany({
        where: { isActive: true, id: { not: newConfig.id } },
        data: { isActive: false },
      });

      // Update in-memory config
      this.gameConfig = newConfig;
      
      // Update cache
      await this.redis.set(CACHE_KEYS.GAME_CONFIG, newConfig, 300);
      
      logger.info('Game configuration updated');
    } catch (error) {
      logger.error('Failed to update game configuration:', error);
      throw error;
    }
  }
}