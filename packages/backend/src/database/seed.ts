import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seeding...');

  try {
    // Create default admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.admin.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@win5x.com',
        password: hashedAdminPassword,
        role: 'SUPER_ADMIN',
        permissions: [
          'MANAGE_BETS',
          'MANAGE_USERS',
          'MANAGE_WITHDRAWALS',
          'MANAGE_DEPOSITS',
          'VIEW_ANALYTICS',
          'EMERGENCY_CONTROLS',
          'MANAGE_TIMERS',
        ],
      },
    });

    logger.info(`Admin user created/updated: ${admin.username}`);

    // Create default game configuration
    const gameConfig = await prisma.gameConfig.upsert({
      where: { id: 'default' },
      update: {},
      create: {
        id: 'default',
        bettingDuration: parseInt(process.env.DEFAULT_BETTING_DURATION || '30'),
        spinDuration: parseInt(process.env.DEFAULT_SPIN_DURATION || '10'),
        resultDuration: parseInt(process.env.DEFAULT_RESULT_DURATION || '15'),
        minBetAmount: parseFloat(process.env.MIN_BET_AMOUNT || '10'),
        maxBetAmount: parseFloat(process.env.MAX_BET_AMOUNT || '10000'),
        payoutMultiplier: parseFloat(process.env.PAYOUT_MULTIPLIER || '5'),
        cashbackPercentage: parseFloat(process.env.CASHBACK_PERCENTAGE || '10'),
        maxExposure: 1000000,
        isActive: true,
      },
    });

    logger.info('Game configuration created/updated');

    // Create default payment methods
    const paymentMethods = [
      {
        name: 'phonepe',
        displayName: 'PhonePe',
        instructions: 'Scan the QR code with PhonePe app and complete the payment. Enter the UTR code from your payment confirmation.',
        minAmount: 10.00,
        maxAmount: 50000.00,
        qrCodeUrl: 'https://example.com/phonepe-qr.png', // Replace with actual QR code URL
      },
      {
        name: 'googlepay',
        displayName: 'Google Pay',
        instructions: 'Scan the QR code with Google Pay app and complete the payment. Enter the UTR code from your payment confirmation.',
        minAmount: 10.00,
        maxAmount: 50000.00,
        qrCodeUrl: 'https://example.com/googlepay-qr.png', // Replace with actual QR code URL
      },
      {
        name: 'paytm',
        displayName: 'Paytm',
        instructions: 'Scan the QR code with Paytm app and complete the payment. Enter the UTR code from your payment confirmation.',
        minAmount: 10.00,
        maxAmount: 50000.00,
        qrCodeUrl: 'https://example.com/paytm-qr.png', // Replace with actual QR code URL
      },
      {
        name: 'usdt',
        displayName: 'USDT (TRC-20)',
        instructions: 'Send USDT to the wallet address shown. Enter the transaction hash as UTR code.',
        minAmount: 50.00,
        maxAmount: 100000.00,
        walletAddress: 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXx', // Replace with actual USDT wallet
      },
    ];

    for (const methodData of paymentMethods) {
      const method = await prisma.paymentMethod.upsert({
        where: { name: methodData.name },
        update: {},
        create: methodData,
      });
      logger.info(`Payment method created/updated: ${method.displayName}`);
    }

    // Create sample users for testing (only in development)
    if (process.env.NODE_ENV === 'development') {
      const testUsers = [
        {
          username: 'testuser1',
          email: 'test1@example.com',
          password: await bcrypt.hash('Test123!', 12),
          balance: 1000,
        },
        {
          username: 'testuser2',
          email: 'test2@example.com',
          password: await bcrypt.hash('Test123!', 12),
          balance: 500,
        },
        {
          username: 'testuser3',
          email: 'test3@example.com',
          password: await bcrypt.hash('Test123!', 12),
          balance: 2000,
        },
      ];

      for (const userData of testUsers) {
        const user = await prisma.user.upsert({
          where: { username: userData.username },
          update: {},
          create: userData,
        });
        logger.info(`Test user created/updated: ${user.username}`);
      }

      // Create sample game rounds and bets for testing
      const sampleRounds = [
        {
          roundNumber: 1,
          status: 'COMPLETED' as const,
          bettingStartTime: new Date(Date.now() - 5 * 60 * 1000),
          bettingEndTime: new Date(Date.now() - 4 * 60 * 1000),
          spinStartTime: new Date(Date.now() - 4 * 60 * 1000),
          resultTime: new Date(Date.now() - 3 * 60 * 1000),
          winningNumber: 7,
          winningColor: 'red',
          isWinningOdd: true,
          totalBetAmount: 150,
          totalPayout: 250,
          houseProfitLoss: -100,
        },
        {
          roundNumber: 2,
          status: 'COMPLETED' as const,
          bettingStartTime: new Date(Date.now() - 3 * 60 * 1000),
          bettingEndTime: new Date(Date.now() - 2 * 60 * 1000),
          spinStartTime: new Date(Date.now() - 2 * 60 * 1000),
          resultTime: new Date(Date.now() - 1 * 60 * 1000),
          winningNumber: 2,
          winningColor: 'black',
          isWinningOdd: false,
          totalBetAmount: 200,
          totalPayout: 100,
          houseProfitLoss: 100,
        },
      ];

      for (const roundData of sampleRounds) {
        const round = await prisma.gameRound.upsert({
          where: { roundNumber: roundData.roundNumber },
          update: {},
          create: roundData,
        });
        logger.info(`Sample round created/updated: ${round.roundNumber}`);
      }

      logger.info('Sample data created for development environment');
    }

    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Error during database seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });