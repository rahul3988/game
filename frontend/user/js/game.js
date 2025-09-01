// Game logic for Win5x roulette

class RouletteGame {
    constructor() {
        this.currentRound = null;
        this.selectedChip = 20;
        this.currentBets = {};
        this.lastBets = {};
        this.betDistribution = null;
        this.gamePhase = 'waiting';
        this.timeRemaining = 0;
        
        this.wheelRotation = 0;
        this.isSpinning = false;
        
        this.init();
    }

    init() {
        this.createWheelNumbers();
        this.createBettingBoard();
        this.selectChip(20); // Default chip selection
    }

    createWheelNumbers() {
        const wheel = document.getElementById('roulette-wheel');
        
        // Create number segments
        for (let i = 0; i <= 9; i++) {
            const numberElement = document.createElement('div');
            numberElement.className = 'wheel-number';
            numberElement.textContent = i;
            
            // Position numbers around the wheel
            const angle = (i * 36) - 18; // 36 degrees per number, offset by -18
            const radius = 160; // Distance from center
            const radian = (angle * Math.PI) / 180;
            
            const x = Math.cos(radian) * radius;
            const y = Math.sin(radian) * radius;
            
            numberElement.style.position = 'absolute';
            numberElement.style.left = `calc(50% + ${x}px)`;
            numberElement.style.top = `calc(50% + ${y}px)`;
            numberElement.style.transform = 'translate(-50%, -50%)';
            numberElement.style.color = this.getNumberColor(i) === 'red' ? '#dc2626' : '#1e293b';
            numberElement.style.fontWeight = '800';
            numberElement.style.fontSize = '20px';
            numberElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
            
            wheel.appendChild(numberElement);
        }
    }

    createBettingBoard() {
        const numbersGrid = document.querySelector('.numbers-grid');
        
        // Create number betting buttons
        for (let i = 0; i <= 9; i++) {
            const button = document.createElement('button');
            button.className = `number-btn ${this.getNumberColor(i)}`;
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

    getNumberColor(number) {
        const colors = {
            0: 'black', 1: 'red', 2: 'black', 3: 'red', 4: 'black',
            5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red'
        };
        return colors[number] || 'black';
    }

    selectChip(value) {
        this.selectedChip = value;
        
        // Update chip UI
        document.querySelectorAll('.chip').forEach(chip => {
            chip.classList.remove('selected');
        });
        
        const selectedChip = document.querySelector(`[data-value="${value}"]`);
        if (selectedChip) {
            selectedChip.classList.add('selected');
        }
        
        console.log(`Selected chip: ₹${value}`);
    }

    placeBet(betType, betValue) {
        // Validate game state
        if (!this.currentRound || this.currentRound.status !== 'betting') {
            showNotification('Betting is not available right now', 'warning');
            return false;
        }

        // Validate balance
        const user = Win5xAuth.getCurrentUser();
        if (!user || user.balance < this.selectedChip) {
            showNotification('Insufficient balance', 'error');
            return false;
        }

        if (this.selectedChip <= 0) {
            showNotification('Please select a chip value', 'warning');
            return false;
        }

        // Update local bet tracking
        const betKey = `${betType}-${betValue}`;
        this.currentBets[betKey] = (this.currentBets[betKey] || 0) + this.selectedChip;
        
        // Update UI immediately for better UX
        this.updateBetUI();
        
        // Send bet to server
        if (window.gameSocket && window.gameSocket.connected) {
            window.gameSocket.emit('place_bet', {
                roundId: this.currentRound.id,
                betType,
                betValue,
                amount: this.selectedChip
            });
        }

        console.log(`Placed bet: ${betType} ${betValue} for ₹${this.selectedChip}`);
        return true;
    }

    updateBetUI() {
        let totalBet = 0;
        
        // Reset all bet displays
        document.querySelectorAll('.bet-amount').forEach(element => {
            element.textContent = '₹0';
            element.classList.remove('active');
        });
        
        // Update current bets
        Object.entries(this.currentBets).forEach(([betKey, amount]) => {
            totalBet += amount;
            
            const element = document.getElementById(`bet-${betKey}`);
            if (element) {
                element.textContent = `₹${amount}`;
                element.classList.add('active');
            }
        });
        
        // Update summary
        document.getElementById('total-bet-amount').textContent = `₹${totalBet}`;
        document.getElementById('potential-payout').textContent = `₹${totalBet * 5}`;
    }

    clearAllBets() {
        this.currentBets = {};
        this.updateBetUI();
        showNotification('All bets cleared', 'success');
    }

    undoLastBet() {
        const betKeys = Object.keys(this.currentBets);
        if (betKeys.length === 0) {
            showNotification('No bets to undo', 'warning');
            return;
        }

        const lastBetKey = betKeys[betKeys.length - 1];
        if (this.currentBets[lastBetKey] > this.selectedChip) {
            this.currentBets[lastBetKey] -= this.selectedChip;
        } else {
            delete this.currentBets[lastBetKey];
        }
        
        this.updateBetUI();
        showNotification('Last bet undone', 'success');
    }

    rebetLast() {
        if (Object.keys(this.lastBets).length === 0) {
            showNotification('No previous bets to repeat', 'warning');
            return;
        }

        const totalAmount = Object.values(this.lastBets).reduce((sum, amount) => sum + amount, 0);
        const user = Win5xAuth.getCurrentUser();
        
        if (!user || user.balance < totalAmount) {
            showNotification('Insufficient balance for rebet', 'error');
            return;
        }

        this.currentBets = { ...this.lastBets };
        this.updateBetUI();
        showNotification('Previous bets repeated', 'success');
    }

    updateGameState(round) {
        this.currentRound = round;
        
        // Update round display
        if (round) {
            document.getElementById('round-number').textContent = round.round_number || round.roundNumber;
            
            // Update game phase
            this.gamePhase = round.status;
            this.updatePhaseDisplay(round.status);
        }
    }

    updatePhaseDisplay(phase) {
        const phaseElement = document.getElementById('game-phase');
        const timerCard = document.getElementById('timer-card');
        const timerTitle = document.getElementById('timer-title');
        const timerIcon = document.getElementById('timer-icon');
        const timerDescription = document.getElementById('timer-description');
        
        // Reset classes
        timerCard.className = 'timer-card';
        
        switch (phase) {
            case 'betting':
                phaseElement.textContent = 'Betting Open';
                timerCard.classList.add('betting');
                timerTitle.textContent = 'Place Your Bets';
                timerIcon.className = 'fas fa-clock';
                timerDescription.textContent = 'Select chips and place your bets';
                break;
                
            case 'betting_closed':
                phaseElement.textContent = 'Betting Closed';
                timerCard.classList.add('spinning');
                timerTitle.textContent = 'Preparing to Spin';
                timerIcon.className = 'fas fa-hourglass-half';
                timerDescription.textContent = 'Get ready for the spin!';
                break;
                
            case 'spinning':
                phaseElement.textContent = 'Spinning...';
                timerCard.classList.add('spinning');
                timerTitle.textContent = 'Spinning...';
                timerIcon.className = 'fas fa-sync fa-spin';
                timerDescription.textContent = 'The wheel is spinning...';
                this.spinWheel();
                break;
                
            case 'completed':
                phaseElement.textContent = 'Round Complete';
                timerCard.classList.add('result');
                timerTitle.textContent = 'Results';
                timerIcon.className = 'fas fa-trophy';
                timerDescription.textContent = 'Check your winnings!';
                break;
                
            default:
                phaseElement.textContent = 'Waiting...';
                timerTitle.textContent = 'Waiting for Next Round';
                timerIcon.className = 'fas fa-clock';
                timerDescription.textContent = 'Next round starting soon...';
        }
    }

    updateTimer(timerData) {
        this.timeRemaining = timerData.timeRemaining;
        
        const timerValue = document.getElementById('timer-value');
        const progressBar = document.getElementById('timer-progress-bar');
        
        timerValue.textContent = timerData.timeRemaining;
        
        // Calculate progress
        let totalTime;
        switch (timerData.phase) {
            case 'betting': totalTime = 30; break;
            case 'spinning': totalTime = 10; break;
            case 'result': totalTime = 15; break;
            default: totalTime = 30;
        }
        
        const progress = ((totalTime - timerData.timeRemaining) / totalTime) * 100;
        progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        
        // Add urgency styling for low time
        if (timerData.timeRemaining <= 5 && timerData.phase === 'betting') {
            timerValue.style.color = '#ef4444';
            timerValue.style.animation = 'pulse 0.5s infinite';
        } else {
            timerValue.style.color = '#f59e0b';
            timerValue.style.animation = 'none';
        }
    }

    spinWheel() {
        if (this.isSpinning) return;
        
        this.isSpinning = true;
        const wheel = document.getElementById('roulette-wheel');
        
        // Calculate spin rotation
        const spins = 5 + Math.random() * 3; // 5-8 full rotations
        const extraRotation = Math.random() * 360; // Random final position
        const finalRotation = this.wheelRotation + (spins * 360) + extraRotation;
        
        // Apply rotation
        wheel.style.transition = 'transform 4s cubic-bezier(0.23, 1, 0.32, 1)';
        wheel.style.transform = `rotate(${finalRotation}deg)`;
        
        this.wheelRotation = finalRotation % 360; // Normalize rotation
        
        // Reset spinning state after animation
        setTimeout(() => {
            this.isSpinning = false;
            wheel.style.transition = 'none';
        }, 4000);
    }

    handleRoundResult(result) {
        console.log('Round result received:', result);
        
        // Show winning number display
        const winningDisplay = document.getElementById('winning-display');
        const winningNumber = document.getElementById('winning-number');
        const winningColor = document.getElementById('winning-color');
        const winningParity = document.getElementById('winning-parity');
        
        winningNumber.textContent = result.winningNumber;
        winningColor.textContent = result.winningColor;
        winningColor.style.color = result.winningColor === 'red' ? '#dc2626' : '#1e293b';
        winningParity.textContent = result.isWinningOdd ? 'Odd' : 'Even';
        
        winningDisplay.classList.remove('hidden');
        
        // Check user winnings
        this.checkUserWinnings(result.winningNumber);
        
        // Save current bets for rebet
        if (Object.keys(this.currentBets).length > 0) {
            this.lastBets = { ...this.currentBets };
        }
        
        // Clear current bets after delay
        setTimeout(() => {
            this.currentBets = {};
            this.updateBetUI();
            winningDisplay.classList.add('hidden');
        }, 8000);
    }

    checkUserWinnings(winningNumber) {
        let totalWinnings = 0;
        let wonBets = [];
        
        Object.entries(this.currentBets).forEach(([betKey, amount]) => {
            const [betType, betValue] = betKey.split('-');
            const payout = this.calculatePayout(betType, betValue, amount, winningNumber);
            
            if (payout > 0) {
                totalWinnings += payout;
                wonBets.push({ betType, betValue, amount, payout });
            }
        });

        if (totalWinnings > 0) {
            showNotification(`🎉 You won ₹${totalWinnings.toLocaleString()}!`, 'success', 6000);
            
            // Trigger celebration effect
            this.triggerWinCelebration();
            
            // Trigger fake activity burst
            if (window.fakeActivity) {
                fakeActivity.triggerBurst(15000);
            }
        } else if (Object.keys(this.currentBets).length > 0) {
            showNotification('Better luck next time!', 'info', 3000);
        }
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

    triggerWinCelebration() {
        // Add celebration animation to winning display
        const winningDisplay = document.getElementById('winning-display');
        winningDisplay.style.animation = 'celebration 1s ease-in-out';
        
        setTimeout(() => {
            winningDisplay.style.animation = '';
        }, 1000);
    }

    updateBetDistribution(distribution) {
        if (!distribution) return;
        
        // Update pool amounts on betting buttons
        if (distribution.numbers) {
            Object.entries(distribution.numbers).forEach(([number, data]) => {
                if (data.amount > 0) {
                    const button = document.querySelector(`.number-btn:nth-child(${parseInt(number) + 1})`);
                    if (button) {
                        let poolIndicator = button.querySelector('.pool-indicator');
                        if (!poolIndicator) {
                            poolIndicator = document.createElement('div');
                            poolIndicator.className = 'pool-indicator';
                            button.appendChild(poolIndicator);
                        }
                        poolIndicator.textContent = `₹${data.amount}`;
                        poolIndicator.style.display = 'block';
                    }
                }
            });
        }

        // Update color bets
        if (distribution.colors) {
            Object.entries(distribution.colors).forEach(([color, data]) => {
                if (data.amount > 0) {
                    const element = document.getElementById(`pool-${color}`);
                    if (element) {
                        element.textContent = `₹${data.amount}`;
                        element.style.display = 'block';
                    }
                }
            });
        }

        // Update odd/even bets
        if (distribution.oddEven) {
            Object.entries(distribution.oddEven).forEach(([parity, data]) => {
                if (data.amount > 0) {
                    const element = document.getElementById(`pool-${parity}`);
                    if (element) {
                        element.textContent = `₹${data.amount}`;
                        element.style.display = 'block';
                    }
                }
            });
        }
    }

    async loadCurrentRound() {
        try {
            const response = await fetch('http://localhost:3001/api/game/current-round');
            const data = await response.json();
            
            if (data.success && data.data) {
                this.updateGameState(data.data.round);
                this.updateBetDistribution(data.data.distribution);
            }
        } catch (error) {
            console.error('Failed to load current round:', error);
        }
    }

    // Socket event handlers
    onRoundUpdate(round) {
        this.updateGameState(round);
    }

    onTimerUpdate(timer) {
        this.updateTimer(timer);
    }

    onBetDistribution(distribution) {
        this.updateBetDistribution(distribution);
    }

    onRoundResult(result) {
        this.handleRoundResult(result);
    }

    onBalanceUpdate(balance) {
        const user = Win5xAuth.getCurrentUser();
        if (user) {
            user.balance = balance.balance;
            user.gameCredit = balance.gameCredit;
            
            // Update UI
            document.getElementById('user-balance').textContent = `₹${balance.balance.toLocaleString()}`;
            
            if (balance.gameCredit > 0) {
                document.getElementById('game-credit-container').style.display = 'block';
                document.getElementById('game-credit').textContent = `₹${balance.gameCredit.toLocaleString()}`;
            }
        }
    }
}

// Global game instance
let rouletteGame;

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    rouletteGame = new RouletteGame();
});

// Export to global scope for HTML handlers
window.rouletteGame = rouletteGame;