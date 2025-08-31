# Win5x - Wheel Spin Game Monorepo

## Overview
Win5x is a web-based wheel spin game featuring two separate workflows:

- **Admin Panel:** Manage betting rounds, financial transactions, timers, and analytics.
- **User Panel:** Engage in betting, view results, manage deposits/withdrawals, and participate in leaderboards.

The game operates on a unique logic where the **least chosen number wins** each round. Winning bets pay 5x the bet amount, and losing bets earn 10% daily cashback credit usable only in the game.

## Monorepo Structure

win5x-monorepo/
└── packages/
├── admin/ # Admin React app
├── user/ # User React app
├── common/ # Shared utilities/components
└── backend/ # Node.js backend API & game engine

text

## Technologies

- React.js for frontend (Admin & User)
- Node.js + Express for backend API and game engine
- WebSocket (Socket.IO) for real-time communication
- PostgreSQL or MongoDB for data persistence
- PNPM/Yarn Workspaces or Nx for monorepo management
- JWT based authentication

## Setup & Run

### Prerequisites
- Node.js (v16+)
- Database: PostgreSQL or MongoDB running locally or remotely
- PNPM/Yarn installed globally (depending on workspace management used)

### Installation

git clone <repo-url>
cd win5x-monorepo
pnpm install

text

### Development

Start backend server:

pnpm --filter backend dev

text

Start admin frontend:

pnpm --filter admin dev

text

Start user frontend:

pnpm --filter user dev

text

### Building for Production

pnpm run build

text

Deploy backend and frontend separately as needed.

## Features

- Strategic win logic: least chosen number wins.
- Real-time betting distribution and timers.
- Admin controls over bets, finances, and withdrawal approvals.
- User-friendly UI with betting options (numbers, odd/even, color).
- Cashback system and no deduction on winnings.
- Leaderboard with daily/weekly rankings.
- Secure authentication and role-based access.

## Contribution

- Follow standard Git workflow with feature branching.
- Write unit and integration tests.
- Maintain consistent coding style and documentation.

## License

Specify license here.

---

For any questions or support, please contact the development team.
