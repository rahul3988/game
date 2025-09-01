const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:8080", "http://localhost:8081"],
    credentials: true
  }
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.connect().catch(console.error);

// Middleware
app.use(helmet());
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:8080", "http://localhost:8081"],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Global variables
let currentRound = null;
let gameRunning = false;
let gameConfig = {
  bettingDuration: 30,
  countdownDuration: 10,
  spinDuration: 10,
  resultDuration: 10,
  minBetAmount: 10,
  maxBetAmount: 10000,
  payoutMultiplier: 5,
  cashbackPercentage: 10
};

// Store pre-calculated winners securely
let roundWinners = new Map(); // roundId -> winningNumber

// Utility functions
const generateId = () => {
  return require('uuid').v4();
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN });
};

const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.type !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
};

// Game Engine Functions
const getNumberColor = (number) => {
  const colors = {0: 'black', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red'};
  return colors[number] || 'black';
};

const determineLeastChosenNumber = (betDistribution) => {
  let leastNumber = 0;
  let leastAmount = Infinity;
  
  for (let i = 0; i <= 9; i++) {
    const amount = betDistribution[i.toString()] || 0;
    if (amount < leastAmount) {
      leastAmount = amount;
      leastNumber = i;
    }
  }
  
  return leastNumber;
};

const calculatePayout = (betType, betValue, amount, winningNumber) => {
  const multiplier = gameConfig.payoutMultiplier;
  
  switch (betType) {
    case 'number':
      return parseInt(betValue) === winningNumber ? amount * multiplier : 0;
    case 'odd_even':
      const isWinningOdd = winningNumber % 2 === 1;
      const betIsOdd = betValue === 'odd';
      return isWinningOdd === betIsOdd ? amount * multiplier : 0;
    case 'color':
      const winningColor = getNumberColor(winningNumber);
      return betValue === winningColor ? amount * multiplier : 0;
    default:
      return 0;
  }
};

// Game Engine
class GameEngine {
  constructor() {
    this.roundCounter = 0;
    this.timers = new Map();
  }

  async initialize() {
    try {
      // Get last round number
      const result = await pool.query('SELECT MAX(round_number) as max_round FROM game_rounds');
      this.roundCounter = result.rows[0].max_round || 0;
      
      // Load game config
      const configResult = await pool.query('SELECT * FROM game_config WHERE is_active = true ORDER BY created_at DESC LIMIT 1');
      if (configResult.rows.length > 0) {
        const config = configResult.rows[0];
        gameConfig = {
          bettingDuration: config.betting_duration,
          spinDuration: config.spin_duration,
          resultDuration: config.result_duration,
          minBetAmount: parseFloat(config.min_bet_amount),
          maxBetAmount: parseFloat(config.max_bet_amount),
          payoutMultiplier: parseFloat(config.payout_multiplier),
          cashbackPercentage: parseFloat(config.cashback_percentage)
        };
      }
      
      console.log('Game Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Game Engine:', error);
    }
  }

  async startNewRound() {
    try {
      this.roundCounter++;
      
      const result = await pool.query(`
        INSERT INTO game_rounds (round_number, status, betting_start_time, betting_end_time)
        VALUES ($1, 'betting', NOW(), NOW() + INTERVAL '${gameConfig.bettingDuration} seconds')
        RETURNING *
      `, [this.roundCounter]);
      
      currentRound = result.rows[0];
      
      // Cache current round
      await redisClient.setEx('current_round', gameConfig.bettingDuration + 60, JSON.stringify(currentRound));
      
      // Emit to all clients
      io.emit('round_update', currentRound);
      
      // Set timer for betting phase (30s)
      setTimeout(() => {
        this.startCountdown(currentRound.id);
      }, gameConfig.bettingDuration * 1000);

      // Timer updates for betting phase
      this.startTimerUpdates(currentRound.id, 'betting', gameConfig.bettingDuration);
      
      console.log(`Started new round ${this.roundCounter} - BETTING phase`);
      
    } catch (error) {
      console.error('Failed to start new round:', error);
    }
  }

  async startCountdown(roundId) {
    try {
      // BETTING -> COUNTDOWN: Stop accepting bets and calculate winner
      const result = await pool.query(`
        UPDATE game_rounds SET status = 'countdown', betting_end_time = NOW()
        WHERE id = $1 RETURNING *
      `, [roundId]);

      const round = result.rows[0];
      
      // Secretly calculate winner based on least chosen number
      const winningNumber = await this.calculateSecretWinner(roundId);
      
      // Store winner securely (not in database yet)
      roundWinners.set(roundId, winningNumber);
      
      // Emit countdown phase to clients (no winner revealed)
      io.emit('round_update', { ...round, status: 'countdown' });
      
      // Start countdown timer (10s reverse countdown)
      this.startCountdownTimer(roundId, gameConfig.countdownDuration);
      
      // After countdown, start spinning
      setTimeout(() => {
        this.startSpinning(roundId);
      }, gameConfig.countdownDuration * 1000);

      console.log(`Round ${round.round_number} - COUNTDOWN phase (winner: ${winningNumber} - SECRET)`);

    } catch (error) {
      console.error('Failed to start countdown:', error);
    }
  }

  async calculateSecretWinner(roundId) {
    try {
      // Get all bets for this round
      const betsResult = await pool.query('SELECT * FROM bets WHERE round_id = $1 AND status = $2', [roundId, 'pending']);
      const bets = betsResult.rows;

      // Calculate bet distribution by number
      const numberDistribution = {};
      for (let i = 0; i <= 9; i++) {
        numberDistribution[i.toString()] = 0;
      }

      bets.forEach(bet => {
        if (bet.bet_type === 'number') {
          const betValue = parseInt(bet.bet_value);
          if (betValue >= 0 && betValue <= 9) {
            numberDistribution[betValue.toString()] += parseFloat(bet.amount);
          }
        }
      });

      // Determine least chosen number (winner)
      const winningNumber = determineLeastChosenNumber(numberDistribution);
      
      console.log(`Secret winner calculated for round ${roundId}: ${winningNumber}`);
      console.log('Bet distribution:', numberDistribution);
      
      return winningNumber;

    } catch (error) {
      console.error('Failed to calculate secret winner:', error);
      return Math.floor(Math.random() * 10); // Fallback random
    }
  }

  startCountdownTimer(roundId, duration) {
    let timeRemaining = duration;
    
    const countdownInterval = setInterval(() => {
      io.emit('countdown_update', {
        roundId,
        timeRemaining,
        phase: 'countdown'
      });
      
      timeRemaining--;
      
      if (timeRemaining < 0) {
        clearInterval(countdownInterval);
      }
    }, 1000);
  }

  async startSpinning(roundId) {
    try {
      // COUNTDOWN -> SPINNING: Start wheel animation
      const result = await pool.query(`
        UPDATE game_rounds SET status = 'spinning', spin_start_time = NOW()
        WHERE id = $1 RETURNING *
      `, [roundId]);

      const round = result.rows[0];
      
      // Get the pre-calculated winner
      const winningNumber = roundWinners.get(roundId);
      
      // Emit spinning phase with winner number (for animation targeting)
      io.emit('round_update', { ...round, status: 'spinning' });
      io.emit('spin_start', { 
        roundId, 
        winningNumber, // Frontend needs this to animate wheel to correct position
        duration: gameConfig.spinDuration 
      });
      
      // After spinning animation, reveal results
      setTimeout(() => {
        this.revealResults(roundId);
      }, gameConfig.spinDuration * 1000);

      console.log(`Round ${round.round_number} - SPINNING phase (targeting: ${winningNumber})`);

    } catch (error) {
      console.error('Failed to start spinning:', error);
    }
  }

  async revealResults(roundId) {
    try {
      // SPINNING -> RESULT: Reveal winner and process payouts
      const winningNumber = roundWinners.get(roundId);
      const winningColor = getNumberColor(winningNumber);
      const isWinningOdd = winningNumber % 2 === 1;
      
      // Get all bets for this round
      const betsResult = await pool.query('SELECT * FROM bets WHERE round_id = $1 AND status = $2', [roundId, 'pending']);
      const bets = betsResult.rows;

      let totalBetAmount = 0;
      let totalPayout = 0;
      const winningUsers = new Set();

      // Process each bet and calculate payouts
      for (const bet of bets) {
        totalBetAmount += parseFloat(bet.amount);
        
        const payout = calculatePayout(bet.bet_type, bet.bet_value, parseFloat(bet.amount), winningNumber);
        const isWinner = payout > 0;
        totalPayout += payout;

        // Update bet status
        await pool.query(`
          UPDATE bets SET is_winner = $1, actual_payout = $2, status = $3, settled_at = NOW()
          WHERE id = $4
        `, [isWinner, payout, isWinner ? 'won' : 'lost', bet.id]);

        // INSTANTLY credit winner's balance
        if (isWinner) {
          await pool.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [payout, bet.user_id]);
          
          // Create transaction record
          await pool.query(`
            INSERT INTO transactions (user_id, type, amount, status, description)
            VALUES ($1, 'bet_won', $2, 'completed', $3)
          `, [bet.user_id, payout, `Won bet on round ${this.roundCounter}`]);

          winningUsers.add(bet.user_id);
          
          // Emit balance update to specific user
          io.emit('balance_update', { 
            userId: bet.user_id, 
            payout: payout,
            betAmount: parseFloat(bet.amount)
          });
        }
      }

      const houseProfitLoss = totalBetAmount - totalPayout;

      // Update round with final results
      const completedResult = await pool.query(`
        UPDATE game_rounds SET 
          status = 'result',
          result_time = NOW(),
          winning_number = $1,
          winning_color = $2,
          is_winning_odd = $3,
          total_bet_amount = $4,
          total_payout = $5,
          house_profit_loss = $6
        WHERE id = $7 RETURNING *
      `, [winningNumber, winningColor, isWinningOdd, totalBetAmount, totalPayout, houseProfitLoss, roundId]);

      const completedRound = completedResult.rows[0];
      
      // Emit results to all clients
      io.emit('round_update', completedRound);
      io.emit('round_result', {
        roundId,
        winningNumber,
        winningColor,
        isWinningOdd,
        totalPayout,
        houseProfitLoss
      });

      // Notify winning users
      winningUsers.forEach(userId => {
        io.emit('user_won', { userId, roundNumber: this.roundCounter });
      });

      // Clean up stored winner
      roundWinners.delete(roundId);
      
      // Start result display phase (10s)
      setTimeout(() => {
        this.completeRound(roundId);
      }, gameConfig.resultDuration * 1000);

      this.startTimerUpdates(roundId, 'result', gameConfig.resultDuration);
      
      console.log(`Round ${this.roundCounter} - RESULT phase: Winner ${winningNumber}, Payout ₹${totalPayout}, House P/L ₹${houseProfitLoss}`);

    } catch (error) {
      console.error('Failed to reveal results:', error);
    }
  }

  async completeRound(roundId) {
    try {
      // Mark round as completed and start new round
      await pool.query(`
        UPDATE game_rounds SET status = 'completed' WHERE id = $1
      `, [roundId]);
      
      console.log(`Round completed: ${roundId}`);
      
      // Start next round immediately
      if (gameRunning) {
        setTimeout(() => {
          this.startNewRound();
        }, 2000); // 2 second gap between rounds
      }
      
    } catch (error) {
      console.error('Failed to complete round:', error);
    }
  }



  startTimerUpdates(roundId, phase, duration) {
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    const interval = setInterval(() => {
      const now = Date.now();
      const timeRemaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      
      io.emit('timer_update', {
        roundId,
        phase,
        timeRemaining
      });
      
      if (timeRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }

  async placeBet(userId, roundId, betType, betValue, amount) {
    try {
      // Validate round
      const roundResult = await pool.query('SELECT * FROM game_rounds WHERE id = $1', [roundId]);
      const round = roundResult.rows[0];

      if (!round || round.status !== 'betting') {
        if (round && round.status === 'countdown') {
          throw new Error('Betting is closed! Results are being calculated.');
        } else if (round && round.status === 'spinning') {
          throw new Error('Wheel is spinning! Wait for the next round.');
        } else if (round && round.status === 'result') {
          throw new Error('Round completed! Next round starting soon.');
        } else {
          throw new Error('Betting is not available for this round');
        }
      }

      if (new Date() > new Date(round.betting_end_time)) {
        throw new Error('Betting time has expired');
      }

      // Validate amount
      if (amount < gameConfig.minBetAmount || amount > gameConfig.maxBetAmount) {
        throw new Error(`Bet amount must be between ₹${gameConfig.minBetAmount} and ₹${gameConfig.maxBetAmount}`);
      }

      // Check user balance
      const userResult = await pool.query('SELECT balance FROM users WHERE id = $1', [userId]);
      const user = userResult.rows[0];

      if (!user || user.balance < amount) {
        throw new Error('Insufficient balance');
      }

      // Calculate potential payout
      const potentialPayout = amount * gameConfig.payoutMultiplier;

      // Create bet
      const betResult = await pool.query(`
        INSERT INTO bets (user_id, round_id, bet_type, bet_value, amount, potential_payout, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *
      `, [userId, roundId, betType, betValue.toString(), amount, potentialPayout]);

      // Deduct amount from user balance
      await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [amount, userId]);

      // Create transaction record
      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, status, description)
        VALUES ($1, 'bet_placed', $2, 'completed', $3)
      `, [userId, -amount, `Placed bet on round ${round.round_number}`]);

      const bet = betResult.rows[0];
      
      // Update bet distribution
      await this.updateBetDistribution(roundId);
      
      return bet;

    } catch (error) {
      console.error('Failed to place bet:', error);
      throw error;
    }
  }

  async updateBetDistribution(roundId) {
    try {
      const betsResult = await pool.query('SELECT * FROM bets WHERE round_id = $1 AND status = $2', [roundId, 'pending']);
      const bets = betsResult.rows;

      const distribution = {
        numbers: {},
        oddEven: { odd: { count: 0, amount: 0 }, even: { count: 0, amount: 0 } },
        colors: { red: { count: 0, amount: 0 }, black: { count: 0, amount: 0 } }
      };

      // Initialize numbers
      for (let i = 0; i <= 9; i++) {
        distribution.numbers[i.toString()] = { count: 0, amount: 0 };
      }

      bets.forEach(bet => {
        const amount = parseFloat(bet.amount);
        
        switch (bet.bet_type) {
          case 'number':
            const num = parseInt(bet.bet_value);
            if (num >= 0 && num <= 9) {
              distribution.numbers[num.toString()].count++;
              distribution.numbers[num.toString()].amount += amount;
            }
            break;
          case 'odd_even':
            distribution.oddEven[bet.bet_value].count++;
            distribution.oddEven[bet.bet_value].amount += amount;
            break;
          case 'color':
            distribution.colors[bet.bet_value].count++;
            distribution.colors[bet.bet_value].amount += amount;
            break;
        }
      });

      // Cache distribution
      await redisClient.setEx(`bet_distribution_${roundId}`, 300, JSON.stringify(distribution));
      
      io.emit('bet_distribution', { roundId, ...distribution });

    } catch (error) {
      console.error('Failed to update bet distribution:', error);
    }
  }

  start() {
    if (gameRunning) return;
    gameRunning = true;
    console.log('Game Engine started');
    this.startNewRound();
  }

  stop() {
    gameRunning = false;
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    console.log('Game Engine stopped');
  }
}

// Initialize game engine
const gameEngine = new GameEngine();

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await pool.query(`
      INSERT INTO users (username, email, password)
      VALUES ($1, $2, $3) RETURNING id, username, email, balance, game_credit, created_at
    `, [username, email, hashedPassword]);

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateToken({ userId: user.id, username: user.username, type: 'user' });
    const refreshToken = generateRefreshToken({ userId: user.id, type: 'user' });

    res.status(201).json({
      success: true,
      data: { user, accessToken, refreshToken },
      message: 'User registered successfully'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true', [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateToken({ userId: user.id, username: user.username, type: 'user' });
    const refreshToken = generateRefreshToken({ userId: user.id, type: 'user' });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          balance: user.balance,
          gameCredit: user.game_credit
        },
        accessToken,
        refreshToken
      },
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Admin login
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query('SELECT * FROM admins WHERE (username = $1 OR email = $1) AND is_active = true', [username]);
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    const isValidPassword = await comparePassword(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    const accessToken = generateToken({ 
      userId: admin.id, 
      username: admin.username, 
      type: 'admin',
      role: admin.role,
      permissions: admin.permissions 
    });
    const refreshToken = generateRefreshToken({ userId: admin.id, type: 'admin' });

    res.json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        },
        accessToken,
        refreshToken
      },
      message: 'Admin login successful'
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, error: 'Admin login failed' });
  }
});

// Game routes
app.get('/api/game/current-round', async (req, res) => {
  try {
    let round = currentRound;
    
    if (!round) {
      const result = await pool.query('SELECT * FROM game_rounds WHERE status IN ($1, $2, $3) ORDER BY created_at DESC LIMIT 1', ['betting', 'betting_closed', 'spinning']);
      round = result.rows[0];
    }

    if (!round) {
      return res.json({ success: true, data: null, message: 'No active round' });
    }

    // Get bet distribution
    const betsResult = await pool.query('SELECT * FROM bets WHERE round_id = $1 AND status = $2', [round.id, 'pending']);
    const bets = betsResult.rows;

    const distribution = {
      numbers: {},
      oddEven: { odd: { count: 0, amount: 0 }, even: { count: 0, amount: 0 } },
      colors: { red: { count: 0, amount: 0 }, black: { count: 0, amount: 0 } }
    };

    for (let i = 0; i <= 9; i++) {
      distribution.numbers[i.toString()] = { count: 0, amount: 0 };
    }

    bets.forEach(bet => {
      const amount = parseFloat(bet.amount);
      switch (bet.bet_type) {
        case 'number':
          const num = parseInt(bet.bet_value);
          if (num >= 0 && num <= 9) {
            distribution.numbers[num.toString()].count++;
            distribution.numbers[num.toString()].amount += amount;
          }
          break;
        case 'odd_even':
          distribution.oddEven[bet.bet_value].count++;
          distribution.oddEven[bet.bet_value].amount += amount;
          break;
        case 'color':
          distribution.colors[bet.bet_value].count++;
          distribution.colors[bet.bet_value].amount += amount;
          break;
      }
    });

    res.json({
      success: true,
      data: {
        round,
        distribution,
        totalBets: bets.length,
        totalAmount: bets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0)
      }
    });

  } catch (error) {
    console.error('Error getting current round:', error);
    res.status(500).json({ success: false, error: 'Failed to get current round' });
  }
});

app.post('/api/game/bet', authenticateToken, async (req, res) => {
  try {
    if (req.user.type !== 'user') {
      return res.status(403).json({ success: false, error: 'Only users can place bets' });
    }

    const { roundId, betType, betValue, amount } = req.body;

    const bet = await gameEngine.placeBet(req.user.userId, roundId, betType, betValue, amount);
    
    res.status(201).json({
      success: true,
      data: bet,
      message: 'Bet placed successfully'
    });

  } catch (error) {
    console.error('Bet placement error:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// Payment routes
app.get('/api/payment/methods', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM payment_methods WHERE is_active = true ORDER BY name');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error getting payment methods:', error);
    res.status(500).json({ success: false, error: 'Failed to get payment methods' });
  }
});

app.post('/api/payment/deposit', authenticateToken, async (req, res) => {
  try {
    const { paymentMethodId, amount, utrCode } = req.body;

    // Validate UTR code
    if (!utrCode || utrCode.length < 5) {
      return res.status(400).json({ success: false, error: 'Valid UTR code is required' });
    }

    // Check for duplicate UTR
    const existingDeposit = await pool.query('SELECT id FROM deposit_requests WHERE utr_code = $1 AND status IN ($2, $3)', [utrCode.toUpperCase(), 'pending', 'approved']);
    if (existingDeposit.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'UTR code already used' });
    }

    // Validate payment method
    const methodResult = await pool.query('SELECT * FROM payment_methods WHERE id = $1 AND is_active = true', [paymentMethodId]);
    const paymentMethod = methodResult.rows[0];

    if (!paymentMethod) {
      return res.status(400).json({ success: false, error: 'Invalid payment method' });
    }

    if (amount < paymentMethod.min_amount || amount > paymentMethod.max_amount) {
      return res.status(400).json({ success: false, error: `Amount must be between ₹${paymentMethod.min_amount} and ₹${paymentMethod.max_amount}` });
    }

    // Create deposit request
    const depositResult = await pool.query(`
      INSERT INTO deposit_requests (user_id, payment_method_id, amount, utr_code, status)
      VALUES ($1, $2, $3, $4, 'pending') RETURNING *
    `, [req.user.userId, paymentMethodId, amount, utrCode.toUpperCase()]);

    const deposit = depositResult.rows[0];

    // Notify admins
    io.to('admin').emit('admin_notification', {
      type: 'deposit_request',
      message: `New deposit request: ₹${amount} with UTR ${utrCode}`,
      data: deposit
    });

    res.status(201).json({
      success: true,
      data: deposit,
      message: 'Deposit request submitted successfully'
    });

  } catch (error) {
    console.error('Deposit request error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit deposit request' });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (data) => {
    socket.join(data.room);
    console.log(`Socket ${socket.id} joined room ${data.room}`);
  });

  socket.on('place_bet', async (data) => {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }

      const bet = await gameEngine.placeBet(socket.userId, data.roundId, data.betType, data.betValue, data.amount);
      socket.emit('bet_placed', bet);

      // Update user balance
      const userResult = await pool.query('SELECT balance, game_credit FROM users WHERE id = $1', [socket.userId]);
      if (userResult.rows.length > 0) {
        socket.emit('balance_update', {
          balance: userResult.rows[0].balance,
          gameCredit: userResult.rows[0].game_credit
        });
      }

    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');

    // Test Redis connection
    await redisClient.ping();
    console.log('✅ Redis connected successfully');

    // Initialize game engine
    await gameEngine.initialize();
    
    // Create admin user if not exists
    const adminExists = await pool.query('SELECT id FROM admins WHERE username = $1', [process.env.ADMIN_USERNAME || 'admin']);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await hashPassword(process.env.ADMIN_PASSWORD || 'Admin123!');
      await pool.query(`
        INSERT INTO admins (username, email, password, role, permissions)
        VALUES ($1, $2, $3, 'super_admin', $4)
      `, [
        process.env.ADMIN_USERNAME || 'admin',
        process.env.ADMIN_EMAIL || 'admin@win5x.com',
        hashedPassword,
        ['manage_bets', 'manage_users', 'manage_withdrawals', 'manage_deposits', 'view_analytics', 'emergency_controls', 'manage_timers']
      ]);
      console.log('✅ Admin user created');
    }

    // Start game engine
    gameEngine.start();

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`🚀 Win5x Backend running on port ${PORT}`);
      console.log(`🎮 Game Engine: Active`);
      console.log(`🔌 WebSocket: Active`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  gameEngine.stop();
  await pool.end();
  await redisClient.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  gameEngine.stop();
  await pool.end();
  await redisClient.disconnect();
  process.exit(0);
});

startServer();