# Win5x - Vanilla HTML/CSS/JS Casino Roulette Game

A complete roulette casino game built with **pure vanilla HTML, CSS, and JavaScript** - no frameworks, no build tools, no complex dependencies.

## 🎯 Project Overview

**Win5x** is a professional roulette casino game featuring:
- **Scripted 4-phase game flow** (Betting → Countdown → Spinning → Result)
- **Least-chosen-number wins** algorithm for strategic gameplay
- **QR code payment system** with UTR verification (PhonePe, Google Pay, Paytm, USDT)
- **Real-time multiplayer** experience with WebSocket
- **Advanced fake activity system** with 200+ simulated users
- **Professional admin panel** for complete game management
- **5x payout multiplier** on all winning bets
- **Instant balance updates** and payout processing

## 🏗️ **Simple File Structure**

```
win5x/
├── backend/
│   ├── server.js           # Complete Node.js + Express API
│   ├── package.json        # Simple npm dependencies
│   └── .env               # Configuration
├── frontend/
│   ├── user/              # Roulette game interface
│   │   ├── index.html     # Main game page
│   │   ├── styles.css     # Professional casino styling
│   │   └── js/           # Modular vanilla JavaScript
│   │       ├── app.js    # Main application logic
│   │       ├── game.js   # Roulette game mechanics
│   │       ├── auth.js   # Authentication handling
│   │       ├── payment.js # Payment system
│   │       ├── utils.js  # Utility functions
│   │       ├── notifications.js # Toast notifications
│   │       └── fakeActivity.js # Activity simulation
│   └── admin/            # Admin control panel
│       ├── index.html    # Admin dashboard
│       ├── styles.css    # Admin panel styling
│       └── js/          # Admin JavaScript modules
│           ├── admin-app.js # Main admin logic
│           ├── admin-auth.js # Admin authentication
│           ├── admin-payments.js # Payment management
│           ├── admin-dashboard.js # Dashboard functionality
│           └── admin-utils.js # Admin utilities
├── database/
│   └── schema.sql        # Complete PostgreSQL schema
├── setup.sh             # Automated setup script
└── GAME_FLOW.md         # Detailed game flow documentation
```

## 🚀 **Quick Setup**

### **Prerequisites**
- **Node.js** 16+
- **PostgreSQL** 13+
- **Redis** 6+

### **One-Command Setup**
```bash
./setup.sh
```

### **Manual Setup**
```bash
# 1. Install backend dependencies
cd backend
npm install

# 2. Configure environment
cp .env.example .env
nano .env  # Set your database and Redis URLs

# 3. Setup database
psql -U postgres -c "CREATE DATABASE win5x;"
psql -U postgres -c "CREATE USER win5x_user WITH PASSWORD 'your_password';"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE win5x TO win5x_user;"
psql -U win5x_user -d win5x -f ../database/schema.sql

# 4. Start backend
npm run dev

# 5. Open frontend in browser
# User Panel: frontend/user/index.html
# Admin Panel: frontend/admin/index.html
```

## 🎮 **Game Features**

### **🎰 4-Phase Scripted Flow**
1. **BETTING (30s)**: Players place bets with visible countdown timer
2. **COUNTDOWN (10s)**: Backend calculates winner secretly, shows reverse countdown 10→0
3. **SPINNING (10s)**: Wheel animates to predetermined winner, **no timer visible**
4. **RESULT (10s)**: Winner revealed, instant payouts processed, balances updated

### **🎯 Roulette Gameplay**
- **Professional wheel design** with CSS animations
- **Numbers 0-9** in alternating red/black segments
- **Casino chips**: ₹10, ₹20, ₹50, ₹100, ₹200, ₹500
- **Custom betting** with ₹10 minimum
- **Multiple bet types**: Numbers, Colors (Red/Black), Parity (Odd/Even)
- **Least-chosen-number algorithm** for fair strategic gameplay

### **💰 QR Payment System**
- **4 Payment Methods**: PhonePe, Google Pay, Paytm, USDT
- **QR Code Integration**: Dynamic QR display for payments
- **UTR Verification**: Manual admin approval with transaction codes
- **No Third-party APIs**: Direct payment processing
- **Instant Balance Updates**: Real-time crediting upon approval

### **👥 Advanced Fake Activity**
- **200+ Simulated Users**: Realistic casino player behavior
- **Live Viewer Counts**: 150-900 concurrent players with natural fluctuations
- **Activity Bursts**: Enhanced engagement during spins and big wins
- **Social Proof**: FOMO creation through live betting and win notifications

### **🛡️ Admin Control Panel**
- **Real-time Dashboard**: Live game monitoring and analytics
- **Payment Management**: QR code updates and UTR approval interface
- **User Management**: Account control and balance adjustments
- **Game Controls**: Emergency stops and system monitoring
- **Audit Logging**: Complete admin action tracking

## 🔒 **Security Features**

### **Backend-Only Winner Calculation**
- Winner determined **only on backend** during countdown phase
- **Stored securely in memory** until result revelation
- Frontend **cannot predict or access** winner calculation
- **Least-chosen-number algorithm** applied to real bet data

### **Secure Game Flow**
- **Betting restricted** to betting phase only
- **Timer-controlled phases** prevent manipulation
- **Real-time validation** of all bet placements
- **Instant payout processing** with transaction logging

### **Authentication & Authorization**
- **JWT token security** for users and admins
- **Role-based access control** with permission checking
- **Rate limiting** and input validation
- **Session management** and security logging

## 📱 **User Interface**

### **Casino-Style Design**
- **Dark theme** with gold accents for premium feel
- **Smooth animations** and professional transitions
- **Mobile responsive** design for all screen sizes
- **Real-time updates** via WebSocket connections

### **Intuitive Controls**
- **Visual chip selection** with hover effects
- **Clear betting board** with live pool displays
- **Game controls**: Clear, Undo, Rebet functionality
- **Balance management** with deposit/withdraw buttons

## 🔧 **Technical Stack**

**Backend:**
- **Node.js** with Express.js (single server.js file)
- **PostgreSQL** for data persistence
- **Redis** for caching and sessions
- **Socket.IO** for real-time communication
- **Simple npm dependencies** only

**Frontend:**
- **Pure HTML5** - No frameworks or libraries
- **Vanilla CSS3** - Advanced animations and responsive design
- **Vanilla JavaScript** - ES6+ modular architecture
- **Socket.IO Client** for real-time updates
- **Font Awesome** for icons
- **Google Fonts** for typography

## 🎯 **Game Logic**

### **Winning Algorithm**
```javascript
// Backend calculates winner during countdown phase
async calculateSecretWinner(roundId) {
  const bets = await getBetsForRound(roundId);
  const distribution = calculateBetDistribution(bets);
  const winner = determineLeastChosenNumber(distribution);
  
  // Store securely - NOT sent to frontend
  roundWinners.set(roundId, winner);
  return winner;
}
```

### **Payout System**
- **5x multiplier** for all winning bets
- **Instant crediting** upon result revelation
- **Real-time balance updates** via WebSocket
- **Transaction logging** for audit trails

## 🚀 **Production Deployment**

### **Development**
```bash
# Start backend
cd backend && npm run dev

# Serve frontend (any HTTP server)
python3 -m http.server 8080 --directory frontend/user
python3 -m http.server 8081 --directory frontend/admin
```

### **Production**
```bash
# Use PM2 for backend
npm install -g pm2
pm2 start backend/server.js --name win5x

# Serve with Nginx
# Configure Nginx to serve static files and proxy API
```

## 📊 **Default Access**

### **Applications**
- **User Game**: `frontend/user/index.html`
- **Admin Panel**: `frontend/admin/index.html`
- **Backend API**: `http://localhost:3001`

### **Credentials**
- **Admin**: `admin / Admin123!`
- **Users**: Register new accounts in-game

## 🎭 **Engagement Features**

### **Fake Activity System**
- **200 unique usernames** with realistic betting patterns
- **Activity types**: Joining, betting, winning, big wins
- **Smart timing**: Burst activity during spins and results
- **Viewer fluctuation**: Natural up/down patterns

### **Visual Effects**
- **Phase-specific styling**: Different colors for each game phase
- **Celebration animations** for winners
- **Smooth wheel targeting** to exact winning numbers
- **Real-time notifications** with professional styling

## 🔧 **No Build Process**

### **Development Benefits**
- **Edit and refresh** - No compilation needed
- **Standard debugging** - Browser developer tools
- **Simple deployment** - Copy files to any web server
- **Zero dependencies** - Pure web standards

### **File Organization**
- **Modular JavaScript** - Separate concerns in different files
- **Component-based CSS** - Organized styling sections
- **Clean HTML** - Semantic structure with accessibility

## 📈 **Performance**

### **Optimized for Speed**
- **Minimal file sizes** - No framework bloat
- **Efficient animations** - CSS-based with GPU acceleration
- **Smart caching** - Redis for game state and bet distributions
- **Real-time updates** - WebSocket for instant communication

### **Scalability**
- **Horizontal scaling** ready with Redis
- **Database optimization** with proper indexes
- **CDN ready** - Static file serving
- **Load balancing** compatible

---

## 🎉 **READY TO LAUNCH**

**Win5x** is a **complete, professional casino roulette game** built entirely with vanilla web technologies:

✅ **No frameworks** - Pure HTML/CSS/JS
✅ **No build tools** - Direct browser execution  
✅ **Simple setup** - One command deployment
✅ **Professional features** - Complete casino experience
✅ **Secure backend** - Proper game logic and payments
✅ **Engaging frontend** - Smooth animations and real-time updates

**🎰 Ready for immediate deployment and real user gameplay! 🎰**