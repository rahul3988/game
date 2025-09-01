# Win5x - Vanilla HTML/CSS/JS Roulette Casino Game

A complete roulette casino game built with vanilla HTML, CSS, and JavaScript - no frameworks, no build tools, no package managers like PNPM.

## 🎯 Project Overview

**Win5x** is a real-time roulette casino game featuring:
- **Least-chosen-number wins** algorithm for fair gameplay
- **QR code payment system** with UTR verification (PhonePe, Google Pay, Paytm, USDT)
- **Real-time multiplayer** experience with WebSocket
- **Advanced fake activity system** with 200+ simulated users
- **Professional admin panel** for complete game management
- **5x payout multiplier** on all winning bets
- **Daily 10% cashback** system

## 🏗️ Simple Architecture

```
win5x/
├── backend/                 # Node.js + Express API
│   ├── server.js           # Main server file
│   ├── package.json        # Dependencies only
│   └── .env               # Configuration
├── frontend/
│   ├── user/              # User game interface
│   │   ├── index.html     # Main game page
│   │   ├── styles.css     # Game styling
│   │   └── js/           # JavaScript modules
│   └── admin/            # Admin control panel
│       ├── index.html    # Admin dashboard
│       ├── styles.css    # Admin styling
│       └── js/          # Admin JavaScript
├── database/
│   └── schema.sql        # PostgreSQL schema
└── setup.sh             # Automated setup script
```

## 🚀 Quick Setup

### Prerequisites
- **Node.js** 16+
- **PostgreSQL** 13+
- **Redis** 6+

### Automated Setup
```bash
# Run the setup script
./setup.sh

# Manual database setup (if needed)
psql -U postgres -c "CREATE DATABASE win5x;"
psql -U postgres -c "CREATE USER win5x_user WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE win5x TO win5x_user;"
psql -U win5x_user -d win5x -f database/schema.sql
```

### Configuration
```bash
# Edit backend configuration
nano backend/.env

# Required settings:
DATABASE_URL=postgresql://win5x_user:password@localhost:5432/win5x
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### Start Application
```bash
# Start backend server
cd backend
npm install
npm run dev

# Open applications in browser:
# User Panel: frontend/user/index.html
# Admin Panel: frontend/admin/index.html
```

## 🎮 Game Features

### **🎰 Roulette Gameplay**
- **Professional wheel design** with red/black alternating segments
- **Numbers 0-9** with realistic spinning animation
- **Multiple bet types**: Numbers, Colors (Red/Black), Parity (Odd/Even)
- **Casino chips**: ₹10, ₹20, ₹50, ₹100, ₹200, ₹500
- **Custom betting** with ₹10 minimum amount
- **Real-time timer** with 30s betting, 10s spinning, 15s results

### **💰 Payment System**
- **QR Code Integration**: PhonePe, Google Pay, Paytm, USDT
- **UTR Verification**: Manual admin approval with transaction codes
- **No Third-party Gateways**: Direct payment processing
- **Instant Balance Updates**: Automatic crediting upon approval
- **Withdrawal Management**: Admin-controlled payout system

### **👥 Live Activity System**
- **200+ Fake Users**: Realistic player simulation
- **Dynamic Activity**: Live betting, wins, player movements
- **Viewer Fluctuation**: 150-900 concurrent players
- **Activity Bursts**: Enhanced engagement during exciting moments
- **Social Proof**: FOMO creation through live activity feed

### **🔐 Security Features**
- **JWT Authentication** with refresh tokens
- **Rate limiting** and fraud detection
- **Input validation** and sanitization
- **Admin audit trails** for all actions
- **Session management** and security logging

## 📱 User Interface

### **User Panel Features**
- **Casino-style Design**: Professional dark theme with gold accents
- **Mobile Responsive**: Optimized for all screen sizes
- **Real-time Updates**: Live betting and results via WebSocket
- **Smooth Animations**: Professional wheel spinning and transitions
- **Intuitive Controls**: Easy chip selection and bet placement

### **Admin Panel Features**
- **Live Dashboard**: Real-time game monitoring and analytics
- **Payment Management**: QR code updates and UTR verification
- **User Control**: Account management and balance adjustments
- **Game Controls**: Emergency stops and configuration
- **Comprehensive Reporting**: Revenue and user analytics

## 🔧 Technical Stack

**Backend:**
- **Node.js** with Express.js
- **PostgreSQL** for data storage
- **Redis** for caching and sessions
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **Bcrypt** for password security

**Frontend:**
- **Vanilla HTML5** - No frameworks
- **Pure CSS3** - Advanced animations and responsive design
- **Vanilla JavaScript** - ES6+ features, modular architecture
- **Socket.IO Client** for real-time updates
- **Font Awesome** icons
- **Google Fonts** (Inter) for typography

## 🎯 Game Logic

### **Winning Algorithm**
- **Least-chosen number wins**: Number with lowest total bets wins
- **Fair distribution**: Transparent bet distribution display
- **5x multiplier**: All winning bets pay 5x the bet amount
- **Real-time calculation**: Instant payout processing

### **Cashback System**
- **10% daily cashback** on net losses
- **Non-withdrawable credit** for continued gameplay
- **Automatic processing** at end of each day
- **Transparent tracking** in user account

## 🚀 Deployment

### Development
```bash
# Start backend
cd backend && npm run dev

# Serve frontend (using any HTTP server)
python3 -m http.server 8080 --directory frontend/user    # User panel
python3 -m http.server 8081 --directory frontend/admin   # Admin panel

# Or use Node.js serve
npx serve frontend/user -l 8080
npx serve frontend/admin -l 8081
```

### Production
```bash
# Use PM2 for process management
npm install -g pm2
pm2 start backend/server.js --name win5x-backend

# Serve static files with Nginx
# Configure Nginx to serve frontend files and proxy API calls
```

## 🔒 Security Configuration

### Environment Variables
```env
# Backend (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/win5x
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-256-bit-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password
```

### Database Security
- Use strong passwords for database users
- Enable SSL connections in production
- Regular backups with encryption
- Network firewall for database access

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login  
- `POST /api/auth/admin/login` - Admin login

### Game
- `GET /api/game/current-round` - Current game state
- `POST /api/game/bet` - Place bet
- `GET /api/game/rounds` - Round history

### Payments
- `GET /api/payment/methods` - Available payment methods
- `POST /api/payment/deposit` - Submit deposit with UTR
- `PUT /api/payment/admin/deposits/:id` - Approve/reject deposits

### Admin
- `GET /api/admin/analytics` - Dashboard statistics
- `POST /api/admin/emergency-stop` - Emergency game stop
- `PUT /api/payment/admin/methods/:id` - Update QR codes

## 🎭 Fake Activity System

### Realistic User Simulation
- **200 unique usernames** with casino-style names
- **3 user types**: Casual (60%), Regular (30%), High Roller (10%)
- **Realistic betting patterns** based on user type
- **Smart activity timing** with burst events during spins

### Engagement Features
- **Live viewer counts** with natural fluctuations
- **Activity feed** showing real-time betting and wins
- **Social proof** through simulated player activity
- **FOMO creation** with big win announcements

## 🔧 Development

### File Structure
```
backend/
├── server.js              # Main server with all logic
├── package.json           # Simple dependencies
└── .env                   # Configuration

frontend/user/
├── index.html             # Main game interface
├── styles.css             # All game styling
└── js/
    ├── app.js            # Main application logic
    ├── game.js           # Game mechanics
    ├── payment.js        # Payment handling
    ├── fakeActivity.js   # Activity simulation
    └── utils.js          # Utility functions

frontend/admin/
├── index.html            # Admin dashboard
├── styles.css            # Admin panel styling  
└── js/
    ├── admin-app.js      # Main admin logic
    ├── admin-payments.js # Payment management
    └── admin-utils.js    # Admin utilities
```

### No Build Process
- **Direct file serving** - No compilation needed
- **Instant changes** - Refresh browser to see updates
- **Simple debugging** - Standard browser developer tools
- **Easy deployment** - Copy files to web server

## 🎯 Production Checklist

### Before Launch
- [ ] Configure production database with SSL
- [ ] Set up Redis with persistence
- [ ] Add real QR codes for payment methods
- [ ] Configure domain and SSL certificates
- [ ] Set strong JWT secrets and admin passwords
- [ ] Test complete user flow: register → deposit → bet → win
- [ ] Verify admin controls and payment approvals

### Security
- [ ] Enable HTTPS for all connections
- [ ] Configure CORS for production domains
- [ ] Set up rate limiting and DDoS protection
- [ ] Regular security updates and monitoring
- [ ] Database backup and recovery procedures

## 🎉 Features Summary

**✅ Complete Roulette Game** - Professional casino experience
**✅ QR Payment System** - PhonePe, Google Pay, Paytm, USDT
**✅ UTR Verification** - Manual admin approval workflow
**✅ Real-time Gaming** - WebSocket-based live updates
**✅ Fake Activity System** - 200+ simulated users for engagement
**✅ Admin Management** - Complete control and monitoring
**✅ Mobile Responsive** - Works on all devices
**✅ No Dependencies** - Pure HTML/CSS/JS frontend

## 📞 Support

For setup help or issues:
1. Check the browser console for error messages
2. Verify database and Redis connections
3. Ensure all services are running on correct ports
4. Check network connectivity between components

---

**Win5x** - Pure vanilla implementation of a professional casino roulette game! 🎰✨