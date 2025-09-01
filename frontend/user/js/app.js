// Win5x Main Application Logic

class Win5xApp {
    constructor() {
        this.currentUser = null;
        this.socket = null;
        this.currentRound = null;
        this.selectedChip = 20;
        this.currentBets = {};
        this.lastBets = {};
        this.gameConfig = {};
        
        this.init();
    }

    async init() {
        console.log('🎰 Initializing Win5x...');
        
        // Check authentication
        const token = localStorage.getItem('win5x_token');
        if (token) {
            try {
                const user = await this.verifyToken(token);
                if (user) {
                    this.currentUser = user;
                    this.showGameScreen();
                    this.initializeSocket();
                } else {
                    this.showLoginScreen();
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                this.showLoginScreen();
            }
        } else {
            this.showLoginScreen();
        }

        // Initialize event listeners
        this.initializeEventListeners();
        
        // Initialize fake activity
        fakeActivity.start();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 1500);
    }

    initializeEventListeners() {
        // Auth forms
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Game initialization
        this.initializeWheel();
        this.initializeBettingBoard();
        
        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });
    }

    showLoginScreen() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('game-screen').classList.add('hidden');
    }

    showGameScreen() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        
        if (this.currentUser) {
            this.updateUserInterface();
            this.loadCurrentRound();
        }
    }

    updateUserInterface() {
        if (!this.currentUser) return;

        document.getElementById('user-initial').textContent = this.currentUser.username.charAt(0).toUpperCase();
        document.getElementById('user-balance').textContent = `₹${this.currentUser.balance.toLocaleString()}`;
        
        if (this.currentUser.gameCredit > 0) {
            document.getElementById('game-credit-container').style.display = 'block';
            document.getElementById('game-credit').textContent = `₹${this.currentUser.gameCredit.toLocaleString()}`;
        }
    }

    async handleLogin() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('win5x_token', data.data.accessToken);
                localStorage.setItem('win5x_refresh_token', data.data.refreshToken);
                this.currentUser = data.data.user;
                
                showNotification('Welcome back!', 'success');
                this.showGameScreen();
                this.initializeSocket();
            } else {
                showNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Login failed. Please try again.', 'error');
        }
    }

    async handleRegister() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('win5x_token', data.data.accessToken);
                localStorage.setItem('win5x_refresh_token', data.data.refreshToken);
                this.currentUser = data.data.user;
                
                showNotification('Welcome to Win5x!', 'success');
                this.showGameScreen();
                this.initializeSocket();
            } else {
                showNotification(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('Registration failed. Please try again.', 'error');
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return data.success ? data.data.user : null;
        } catch (error) {
            return null;
        }
    }

    initializeSocket() {
        const token = localStorage.getItem('win5x_token');
        if (!token) return;

        this.socket = io('http://localhost:3001', {
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('✅ Connected to game server');
            document.getElementById('connection-indicator').classList.add('connected');
            document.getElementById('connection-text').textContent = 'Live';
            this.socket.emit('join_room', { room: 'game' });
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from game server');
            document.getElementById('connection-indicator').classList.remove('connected');
            document.getElementById('connection-text').textContent = 'Offline';
        });

        this.socket.on('round_update', (round) => {
            console.log('Round update:', round);
            this.currentRound = round;
            this.updateGameState(round);
        });

        this.socket.on('timer_update', (timer) => {
            this.updateTimer(timer);
        });

        this.socket.on('bet_distribution', (distribution) => {
            this.updateBetDistribution(distribution);
        });

        this.socket.on('balance_update', (balance) => {
            this.currentUser.balance = balance.balance;
            this.currentUser.gameCredit = balance.gameCredit;
            this.updateUserInterface();
        });

        this.socket.on('bet_placed', (bet) => {
            showNotification(`Bet placed: ₹${bet.amount}`, 'success');
        });

        this.socket.on('round_result', (result) => {
            this.handleRoundResult(result);
        });

        this.socket.on('error', (error) => {
            showNotification(error.message, 'error');
        });
    }

    async loadCurrentRound() {
        try {
            const response = await fetch('/api/game/current-round');
            const data = await response.json();
            
            if (data.success && data.data) {
                this.currentRound = data.data.round;
                this.updateGameState(data.data.round);
                this.updateBetDistribution(data.data.distribution);
            }
        } catch (error) {
            console.error('Failed to load current round:', error);
        }
    }

    updateGameState(round) {
        if (!round) return;

        document.getElementById('round-number').textContent = round.round_number || round.roundNumber;
        
        const phaseElement = document.getElementById('game-phase');
        const timerCard = document.getElementById('timer-card');
        
        // Remove all phase classes
        timerCard.className = 'timer-card';
        
        switch (round.status) {
            case 'betting':
                phaseElement.textContent = 'Betting Open';
                timerCard.classList.add('betting');
                document.getElementById('timer-title').textContent = 'Place Your Bets';
                document.getElementById('timer-icon').className = 'fas fa-clock';
                break;
            case 'betting_closed':
                phaseElement.textContent = 'Betting Closed';
                timerCard.classList.add('spinning');
                break;
            case 'spinning':
                phaseElement.textContent = 'Spinning...';
                timerCard.classList.add('spinning');
                document.getElementById('timer-title').textContent = 'Spinning...';
                document.getElementById('timer-icon').className = 'fas fa-sync fa-spin';
                this.spinWheel();
                break;
            case 'completed':
                phaseElement.textContent = 'Round Complete';
                timerCard.classList.add('result');
                document.getElementById('timer-title').textContent = 'Results';
                document.getElementById('timer-icon').className = 'fas fa-trophy';
                break;
        }
    }

    updateTimer(timer) {
        const timerValue = document.getElementById('timer-value');
        const progressBar = document.getElementById('timer-progress-bar');
        
        timerValue.textContent = timer.timeRemaining;
        
        // Calculate progress percentage
        let totalTime;
        switch (timer.phase) {
            case 'betting': totalTime = 30; break;
            case 'spinning': totalTime = 10; break;
            case 'result': totalTime = 15; break;
            default: totalTime = 30;
        }
        
        const progress = ((totalTime - timer.timeRemaining) / totalTime) * 100;
        progressBar.style.width = `${progress}%`;
        
        // Add urgency for low time
        if (timer.timeRemaining <= 5 && timer.phase === 'betting') {
            timerValue.style.color = '#ef4444';
            timerValue.style.animation = 'pulse 0.5s infinite';
        } else {
            timerValue.style.color = '#f59e0b';
            timerValue.style.animation = 'none';
        }
    }

    initializeWheel() {
        const wheel = document.getElementById('roulette-wheel');
        
        // Create wheel segments with numbers
        for (let i = 0; i <= 9; i++) {
            const segment = document.createElement('div');
            segment.className = 'wheel-segment';
            
            const number = document.createElement('div');
            number.className = 'wheel-number';
            number.textContent = i;
            number.style.position = 'absolute';
            number.style.top = '20px';
            number.style.left = '50%';
            number.style.transform = `translateX(-50%) rotate(${i * 36}deg)`;
            number.style.transformOrigin = '0 180px';
            
            wheel.appendChild(number);
        }
    }

    initializeBettingBoard() {
        const numbersGrid = document.querySelector('.numbers-grid');
        
        // Create number betting buttons
        for (let i = 0; i <= 9; i++) {
            const button = document.createElement('button');
            button.className = `number-btn ${i % 2 === 1 ? 'red' : 'black'}`;
            button.textContent = i;
            button.onclick = () => this.placeBet('number', i);
            
            // Add bet amount indicator
            const betAmount = document.createElement('span');
            betAmount.className = 'bet-amount';
            betAmount.id = `bet-number-${i}`;
            betAmount.textContent = '₹0';
            button.appendChild(betAmount);
            
            numbersGrid.appendChild(button);
        }
    }

    placeBet(betType, betValue) {
        if (!this.currentRound || this.currentRound.status !== 'betting') {
            showNotification('Betting is not available right now', 'warning');
            return;
        }

        if (!this.currentUser || this.currentUser.balance < this.selectedChip) {
            showNotification('Insufficient balance', 'error');
            return;
        }

        if (this.selectedChip <= 0) {
            showNotification('Please select a chip value', 'warning');
            return;
        }

        // Update local bet tracking
        const betKey = `${betType}-${betValue}`;
        this.currentBets[betKey] = (this.currentBets[betKey] || 0) + this.selectedChip;
        
        // Update UI
        this.updateBetAmounts();
        
        // Send bet to server via socket
        this.socket.emit('place_bet', {
            roundId: this.currentRound.id,
            betType,
            betValue,
            amount: this.selectedChip
        });

        console.log(`Placed bet: ${betType} ${betValue} for ₹${this.selectedChip}`);
    }

    updateBetAmounts() {
        let totalBet = 0;
        
        Object.entries(this.currentBets).forEach(([betKey, amount]) => {
            totalBet += amount;
            const element = document.getElementById(`bet-${betKey}`);
            if (element) {
                element.textContent = `₹${amount}`;
                element.classList.add('active');
            }
        });
        
        document.getElementById('total-bet-amount').textContent = `₹${totalBet}`;
        document.getElementById('potential-payout').textContent = `₹${totalBet * 5}`;
    }

    updateBetDistribution(distribution) {
        // Update total bet amounts shown on buttons
        if (distribution.numbers) {
            Object.entries(distribution.numbers).forEach(([number, data]) => {
                const button = document.querySelector(`[data-type="number"][data-value="${number}"]`);
                if (button && data.amount > 0) {
                    // Show total pool amount as small indicator
                    let poolIndicator = button.querySelector('.pool-amount');
                    if (!poolIndicator) {
                        poolIndicator = document.createElement('div');
                        poolIndicator.className = 'pool-amount';
                        button.appendChild(poolIndicator);
                    }
                    poolIndicator.textContent = `₹${data.amount}`;
                }
            });
        }
    }

    spinWheel() {
        const wheel = document.getElementById('roulette-wheel');
        const spins = 5 + Math.random() * 3; // 5-8 full rotations
        const finalRotation = spins * 360;
        
        wheel.style.transform = `rotate(${finalRotation}deg)`;
        
        setTimeout(() => {
            // Wheel spin complete
        }, 4000);
    }

    handleRoundResult(result) {
        console.log('Round result:', result);
        
        // Show winning number
        document.getElementById('winning-display').classList.remove('hidden');
        document.getElementById('winning-number').textContent = result.winningNumber;
        document.getElementById('winning-color').textContent = result.winningColor;
        document.getElementById('winning-parity').textContent = result.isWinningOdd ? 'Odd' : 'Even';
        
        // Check if user won any bets
        let userWon = false;
        let totalWinnings = 0;
        
        Object.entries(this.currentBets).forEach(([betKey, amount]) => {
            const [betType, betValue] = betKey.split('-');
            const payout = this.calculatePayout(betType, betValue, amount, result.winningNumber);
            if (payout > 0) {
                userWon = true;
                totalWinnings += payout;
            }
        });

        if (userWon) {
            showNotification(`🎉 You won ₹${totalWinnings}!`, 'success');
        }

        // Save bets for rebet functionality
        if (Object.keys(this.currentBets).length > 0) {
            this.lastBets = { ...this.currentBets };
        }

        // Clear current bets after 5 seconds
        setTimeout(() => {
            this.currentBets = {};
            this.updateBetAmounts();
            document.getElementById('winning-display').classList.add('hidden');
        }, 5000);
    }

    calculatePayout(betType, betValue, amount, winningNumber) {
        const multiplier = 5;
        
        switch (betType) {
            case 'number':
                return parseInt(betValue) === winningNumber ? amount * multiplier : 0;
            case 'odd_even':
                const isWinningOdd = winningNumber % 2 === 1;
                const betIsOdd = betValue === 'odd';
                return isWinningOdd === betIsOdd ? amount * multiplier : 0;
            case 'color':
                const winningColor = this.getNumberColor(winningNumber);
                return betValue === winningColor ? amount * multiplier : 0;
            default:
                return 0;
        }
    }

    getNumberColor(number) {
        const colors = {0: 'black', 1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red'};
        return colors[number] || 'black';
    }

    logout() {
        localStorage.removeItem('win5x_token');
        localStorage.removeItem('win5x_refresh_token');
        this.currentUser = null;
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        showNotification('Logged out successfully', 'success');
        this.showLoginScreen();
    }
}

// Global functions for HTML onclick handlers
function switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    
    document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = input.nextElementSibling.querySelector('i');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function selectChip(value) {
    app.selectedChip = value;
    
    // Update UI
    document.querySelectorAll('.chip').forEach(chip => {
        chip.classList.remove('selected');
    });
    document.querySelector(`[data-value="${value}"]`).classList.add('selected');
    
    console.log(`Selected chip: ₹${value}`);
}

function placeBet(betType, betValue) {
    app.placeBet(betType, betValue);
}

function clearAllBets() {
    app.currentBets = {};
    app.updateBetAmounts();
    
    // Reset all bet amount displays
    document.querySelectorAll('.bet-amount').forEach(element => {
        element.textContent = '₹0';
        element.classList.remove('active');
    });
    
    showNotification('All bets cleared', 'success');
}

function undoLastBet() {
    const betKeys = Object.keys(app.currentBets);
    if (betKeys.length === 0) {
        showNotification('No bets to undo', 'warning');
        return;
    }

    const lastBetKey = betKeys[betKeys.length - 1];
    if (app.currentBets[lastBetKey] > app.selectedChip) {
        app.currentBets[lastBetKey] -= app.selectedChip;
    } else {
        delete app.currentBets[lastBetKey];
    }
    
    app.updateBetAmounts();
    showNotification('Last bet undone', 'success');
}

function rebetLast() {
    if (Object.keys(app.lastBets).length === 0) {
        showNotification('No previous bets to repeat', 'warning');
        return;
    }

    const totalAmount = Object.values(app.lastBets).reduce((sum, amount) => sum + amount, 0);
    
    if (!app.currentUser || app.currentUser.balance < totalAmount) {
        showNotification('Insufficient balance for rebet', 'error');
        return;
    }

    app.currentBets = { ...app.lastBets };
    app.updateBetAmounts();
    showNotification('Previous bets repeated', 'success');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.classList.toggle('hidden');
}

function showCustomBet() {
    document.getElementById('custom-bet-btn').classList.add('hidden');
    document.getElementById('custom-bet-input').classList.remove('hidden');
    document.getElementById('custom-amount').focus();
}

function setCustomAmount() {
    const amount = parseInt(document.getElementById('custom-amount').value);
    
    if (isNaN(amount) || amount < 10 || amount > 10000) {
        showNotification('Please enter amount between ₹10 and ₹10,000', 'error');
        return;
    }
    
    selectChip(amount);
    cancelCustomAmount();
}

function cancelCustomAmount() {
    document.getElementById('custom-bet-btn').classList.remove('hidden');
    document.getElementById('custom-bet-input').classList.add('hidden');
    document.getElementById('custom-amount').value = '';
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new Win5xApp();
});

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('user-dropdown').classList.add('hidden');
    }
});