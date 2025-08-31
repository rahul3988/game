import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Import routes and services
import { authRoutes } from './controllers/auth';
import { userRoutes } from './controllers/user';
import { gameRoutes } from './controllers/game';
import { adminRoutes } from './controllers/admin';
import { paymentRoutes } from './controllers/payment';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { GameEngine } from './services/GameEngine';
import { SocketService } from './websocket/SocketService';
import { RedisService } from './services/RedisService';

// Initialize Prisma client
export const prisma = new PrismaClient();

// Create Express app
const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://admin.win5x.com', 'https://play.win5x.com']
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
    credentials: true,
  },
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://admin.win5x.com', 'https://play.win5x.com']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Initialize services
let gameEngine: GameEngine;
let socketService: SocketService;
let redisService: RedisService;

async function initializeServices() {
  try {
    // Initialize Redis
    redisService = new RedisService();
    await redisService.connect();
    logger.info('Redis connected successfully');

    // Initialize Game Engine
    gameEngine = new GameEngine(prisma, redisService);
    await gameEngine.initialize();
    logger.info('Game Engine initialized successfully');

    // Initialize Socket Service
    socketService = new SocketService(io, gameEngine, prisma);
    socketService.initialize();
    logger.info('Socket Service initialized successfully');

    // Start the game engine
    gameEngine.start();
    logger.info('Game Engine started successfully');

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Starting graceful shutdown...');
  
  try {
    if (gameEngine) {
      gameEngine.stop();
      logger.info('Game Engine stopped');
    }
    
    if (redisService) {
      await redisService.disconnect();
      logger.info('Redis disconnected');
    }
    
    await prisma.$disconnect();
    logger.info('Database disconnected');
    
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start server
const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Initialize services
    await initializeServices();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🎮 Game Engine: Active`);
      logger.info(`🔌 WebSocket: Active`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Export for testing
export { app, io, gameEngine, socketService, redisService };

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}