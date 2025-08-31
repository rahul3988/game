# Win5x - Wheel Spin Game

A comprehensive web-based wheel spinning game with separate admin and user modules built as a monorepo.

## 🎯 Project Overview

Win5x is a real-time multiplayer wheel spinning game where:
- Players bet on numbers 0-9, odd/even, or colors (red/black)
- The winning number is determined by the "least chosen number wins" logic
- Winners receive 5x their bet amount
- Daily cashback system provides 10% of losses as game credit
- Real-time updates via WebSocket connections

## 🏗️ Architecture

### Monorepo Structure
```
win5x-monorepo/
├── packages/
│   ├── admin/          # Admin panel (React + Vite)
│   ├── user/           # User panel (React + Vite)
│   ├── common/         # Shared utilities and types
│   └── backend/        # Node.js/Express API + Game Engine
├── package.json        # Root workspace configuration
└── pnpm-workspace.yaml # PNPM workspace config
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- React Query for data fetching
- React Hook Form + Zod for forms
- Socket.IO for real-time communication
- Framer Motion for animations (user panel)

**Backend:**
- Node.js with Express.js
- TypeScript
- Prisma ORM with PostgreSQL
- Socket.IO for WebSocket communication
- Redis for caching
- JWT authentication
- Winston for logging
- Bcrypt for password hashing

**Database:**
- PostgreSQL for primary data storage
- Redis for caching and session management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- PNPM 8+
- PostgreSQL 13+
- Redis 6+

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd win5x-monorepo
pnpm install
```

2. **Set up environment variables:**
```bash
# Backend environment
cp packages/backend/.env.example packages/backend/.env
# Edit the .env file with your database and Redis URLs
```

3. **Set up the database:**
```bash
cd packages/backend
pnpm db:migrate
pnpm db:generate
pnpm db:seed
```

4. **Start development servers:**
```bash
# From root directory - starts all services
pnpm dev

# Or start individually:
pnpm dev:backend   # Backend API + Game Engine (port 3001)
pnpm dev:admin     # Admin panel (port 3000)
pnpm dev:user      # User panel (port 3002)
```

### Default Credentials

**Admin Panel:**
- Username: `admin`
- Password: `Admin123!`

**Test Users (development only):**
- Username: `testuser1`, Password: `Test123!`
- Username: `testuser2`, Password: `Test123!`
- Username: `testuser3`, Password: `Test123!`

## 🎮 Game Features

### User Panel Features
- **Account Management:** Registration, login, profile management
- **Wallet System:** Deposits, withdrawals, balance tracking
- **Game Interface:** Interactive wheel, betting interface, live results
- **Betting Options:** Numbers (0-9), odd/even, colors (red/black)
- **Real-time Updates:** Live bet distribution, timers, results
- **History:** Bet history, transaction history
- **Leaderboard:** Daily/weekly/monthly rankings
- **Cashback System:** 10% daily loss recovery as game credit

### Admin Panel Features
- **Dashboard:** Real-time analytics, system status, alerts
- **User Management:** User accounts, balance adjustments, status control
- **Game Management:** Round history, bet monitoring, game configuration
- **Financial Controls:** Transaction approvals, withdrawal management
- **Analytics:** Revenue tracking, user behavior, profit/loss analysis
- **System Controls:** Emergency stop, timer configuration, audit logs
- **Real-time Monitoring:** Live game state, connected users

## 🔧 Game Engine

### Core Logic
- **Least Chosen Number Wins:** The number with the lowest total bet amount wins
- **Payout System:** 5x multiplier for all winning bets
- **Round Phases:** 
  - Betting (30s default)
  - Spinning (10s default) 
  - Results (15s default)

### Real-time Features
- WebSocket connections for live updates
- Bet distribution visualization
- Live timer synchronization
- Instant result broadcasting

## 🔐 Security Features

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting and request validation
- Password hashing with bcrypt
- Input sanitization and validation
- Audit logging for admin actions
- CORS protection
- Helmet.js security headers

## 📊 Database Schema

### Key Tables
- **Users:** User accounts and balances
- **Admins:** Admin accounts with permissions
- **GameRounds:** Game round data and results
- **Bets:** Individual bet records
- **Transactions:** Financial transaction history
- **GameConfig:** Configurable game parameters
- **AuditLogs:** Admin action tracking

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/admin/login` - Admin login
- `POST /api/auth/refresh` - Token refresh

### Game
- `GET /api/game/current-round` - Current game state
- `POST /api/game/bet` - Place a bet
- `GET /api/game/leaderboard` - Rankings
- `GET /api/game/stats` - Game statistics

### Admin
- `GET /api/admin/analytics` - Dashboard analytics
- `GET /api/admin/users` - User management
- `PUT /api/admin/game-config` - Update game settings
- `POST /api/admin/emergency-stop` - Emergency controls

## 🚀 Deployment

### Production Build
```bash
# Build all packages
pnpm build

# Build specific packages
pnpm --filter backend build
pnpm --filter admin build
pnpm --filter user build
```

### Environment Variables

**Backend (.env):**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/win5x"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
NODE_ENV="production"
PORT=3001
```

### Docker Deployment
(Docker configuration files would be added for production deployment)

## 🧪 Testing

```bash
# Run tests for all packages
pnpm test

# Run tests for specific package
pnpm --filter backend test
pnpm --filter admin test
pnpm --filter user test
```

## 📈 Monitoring & Analytics

- Real-time game metrics
- User behavior tracking
- Financial transaction monitoring
- System performance metrics
- Error logging and alerting

## 🔧 Development

### Code Structure
- **Shared Types:** All TypeScript interfaces in `common` package
- **API Services:** Centralized API calls with error handling
- **Real-time:** Socket.IO integration across all modules
- **State Management:** React Query + Context API
- **Form Handling:** React Hook Form with Zod validation

### Development Scripts
```bash
pnpm dev          # Start all services
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm clean        # Clean build artifacts
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database with test data
```

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Win5x** - Where every spin is a chance to win big! 🎰✨