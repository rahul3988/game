// Fake Activity System for Win5x

class FakeActivity {
    constructor() {
        this.viewerCount = 0;
        this.isRunning = false;
        this.activities = [];
        this.users = this.generateFakeUsers();
        this.activeUsers = new Set();
    }

    generateFakeUsers() {
        const prefixes = [
            'Lucky', 'Win', 'Spin', 'Gold', 'Bet', 'Casino', 'Roulette', 'Big', 'Chip', 'Vegas',
            'Jackpot', 'Ace', 'King', 'Queen', 'Diamond', 'Royal', 'Master', 'Pro', 'Legend', 'Elite'
        ];
        
        const suffixes = [
            'Player', 'Winner', 'King', 'Master', 'Pro', 'Ace', 'Hunter', 'Wizard', 'Beast', 'Charm',
            'Streak', 'Eagle', 'Hot', 'Jack', 'Face', 'Machine', 'Shark', 'Big', 'Fast', 'Strike',
            '007', '21', '777', 'VIP', 'Star', 'Boss', 'Chief', 'Lord', 'Duke', 'Baron'
        ];

        const users = [];
        for (let i = 0; i < 200; i++) {
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
            const number = Math.floor(Math.random() * 999) + 1;
            
            users.push({
                username: `${prefix}${suffix}${number}`,
                level: Math.random() < 0.6 ? 'casual' : Math.random() < 0.9 ? 'regular' : 'high_roller',
                lastActivity: 0
            });
        }
        
        return users;
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.viewerCount = Math.floor(Math.random() * 400) + 200;
        this.updateViewerCount();
        
        // Start activity generation
        this.generateActivity();
        this.fluctuateViewers();
        
        console.log('🎭 Fake activity system started');
    }

    stop() {
        this.isRunning = false;
    }

    generateActivity() {
        if (!this.isRunning) return;

        // Generate different types of activities
        const activityTypes = ['join', 'bet', 'win', 'big_win'];
        const weights = [0.2, 0.5, 0.25, 0.05]; // Probabilities
        
        const randomType = this.weightedRandom(activityTypes, weights);
        const user = this.users[Math.floor(Math.random() * this.users.length)];
        
        let activity = null;

        switch (randomType) {
            case 'join':
                if (!this.activeUsers.has(user.username)) {
                    this.activeUsers.add(user.username);
                    activity = {
                        id: Date.now() + Math.random(),
                        type: 'join',
                        username: user.username,
                        message: `${user.username} joined the game`,
                        icon: '👋'
                    };
                }
                break;
                
            case 'bet':
                const betAmounts = user.level === 'casual' ? [10, 20, 50] : 
                                 user.level === 'regular' ? [20, 50, 100, 200] : 
                                 [100, 200, 500, 1000, 2000];
                const betAmount = betAmounts[Math.floor(Math.random() * betAmounts.length)];
                
                activity = {
                    id: Date.now() + Math.random(),
                    type: 'bet',
                    username: user.username,
                    amount: betAmount,
                    message: `${user.username} bet ₹${betAmount}`,
                    icon: '🎰'
                };
                break;
                
            case 'win':
                const winAmount = Math.floor(Math.random() * 2500) + 50;
                activity = {
                    id: Date.now() + Math.random(),
                    type: 'win',
                    username: user.username,
                    amount: winAmount,
                    message: `${user.username} won ₹${winAmount}!`,
                    icon: '🎉'
                };
                break;
                
            case 'big_win':
                const bigWinAmount = Math.floor(Math.random() * 10000) + 5000;
                activity = {
                    id: Date.now() + Math.random(),
                    type: 'big_win',
                    username: user.username,
                    amount: bigWinAmount,
                    message: `${user.username} won BIG ₹${bigWinAmount}! 🔥`,
                    icon: '💰'
                };
                break;
        }

        if (activity) {
            this.addActivity(activity);
        }

        // Schedule next activity
        const delay = 1000 + Math.random() * 4000; // 1-5 seconds
        setTimeout(() => this.generateActivity(), delay);
    }

    weightedRandom(items, weights) {
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            if (random < weights[i]) {
                return items[i];
            }
            random -= weights[i];
        }
        
        return items[items.length - 1];
    }

    addActivity(activity) {
        this.activities.unshift(activity);
        this.activities = this.activities.slice(0, 5); // Keep only last 5
        
        this.updateActivityFeed();
    }

    updateActivityFeed() {
        const feed = document.getElementById('activity-feed');
        if (!feed) return;
        
        feed.innerHTML = '';
        
        this.activities.forEach(activity => {
            const item = document.createElement('div');
            item.className = 'activity-item';
            
            const timeAgo = Math.floor((Date.now() - (activity.timestamp || Date.now())) / 1000);
            
            item.innerHTML = `
                <span class="activity-icon">${activity.icon}</span>
                <span class="activity-message">${activity.message}</span>
                <span class="activity-time">${timeAgo}s</span>
            `;
            
            feed.appendChild(item);
        });
    }

    fluctuateViewers() {
        if (!this.isRunning) return;

        const change = Math.floor(Math.random() * 15) + 1; // 1-15 change
        const shouldIncrease = Math.random() > 0.5;
        
        if (shouldIncrease && this.viewerCount < 900) {
            this.viewerCount = Math.min(this.viewerCount + change, 900);
        } else if (!shouldIncrease && this.viewerCount > 150) {
            this.viewerCount = Math.max(this.viewerCount - change, 150);
        }
        
        this.updateViewerCount();
        
        // Schedule next fluctuation
        const delay = 5000 + Math.random() * 10000; // 5-15 seconds
        setTimeout(() => this.fluctuateViewers(), delay);
    }

    updateViewerCount() {
        const element = document.getElementById('viewer-count');
        const trendElement = document.getElementById('viewer-trend');
        
        if (element) {
            const oldCount = parseInt(element.textContent) || 0;
            element.textContent = this.viewerCount.toLocaleString();
            
            // Update trend indicator
            if (trendElement) {
                if (this.viewerCount > oldCount) {
                    trendElement.className = 'fas fa-arrow-up';
                    trendElement.style.color = '#22c55e';
                } else if (this.viewerCount < oldCount) {
                    trendElement.className = 'fas fa-arrow-down';
                    trendElement.style.color = '#ef4444';
                } else {
                    trendElement.className = 'fas fa-minus';
                    trendElement.style.color = '#9ca3af';
                }
            }
        }
        
        // Update peak viewers
        const peakElement = document.getElementById('peak-viewers');
        if (peakElement) {
            const currentPeak = parseInt(peakElement.textContent) || 0;
            if (this.viewerCount > currentPeak) {
                peakElement.textContent = this.viewerCount.toLocaleString();
            }
        }
        
        // Update total bets (fake)
        const totalBetsElement = document.getElementById('total-bets');
        if (totalBetsElement) {
            const currentTotal = parseInt(totalBetsElement.textContent.replace(/,/g, '')) || 10000;
            const newTotal = currentTotal + Math.floor(Math.random() * 10) + 1;
            totalBetsElement.textContent = newTotal.toLocaleString();
        }
    }

    triggerBurst(duration = 30000) {
        console.log('🔥 Activity burst triggered!');
        
        const burstInterval = setInterval(() => {
            // Generate multiple activities rapidly
            for (let i = 0; i < Math.floor(Math.random() * 3) + 1; i++) {
                const activityTypes = ['bet', 'win', 'big_win'];
                const type = activityTypes[Math.floor(Math.random() * activityTypes.length)];
                const user = this.users[Math.floor(Math.random() * this.users.length)];
                
                let activity = null;
                
                if (type === 'bet') {
                    const amount = [20, 50, 100, 200, 500][Math.floor(Math.random() * 5)];
                    activity = {
                        id: Date.now() + Math.random(),
                        type: 'bet',
                        username: user.username,
                        amount,
                        message: `${user.username} bet ₹${amount}`,
                        icon: '🎰',
                        timestamp: Date.now()
                    };
                } else if (type === 'win') {
                    const amount = Math.floor(Math.random() * 3000) + 100;
                    activity = {
                        id: Date.now() + Math.random(),
                        type: 'win',
                        username: user.username,
                        amount,
                        message: `${user.username} won ₹${amount}!`,
                        icon: '🎉',
                        timestamp: Date.now()
                    };
                } else if (type === 'big_win') {
                    const amount = Math.floor(Math.random() * 15000) + 5000;
                    activity = {
                        id: Date.now() + Math.random(),
                        type: 'big_win',
                        username: user.username,
                        amount,
                        message: `${user.username} won MEGA ₹${amount}! 🔥`,
                        icon: '💰',
                        timestamp: Date.now()
                    };
                }
                
                if (activity) {
                    this.addActivity(activity);
                }
            }
        }, 500);

        setTimeout(() => {
            clearInterval(burstInterval);
            console.log('🎭 Activity burst ended');
        }, duration);
    }
}

// Global instance
const fakeActivity = new FakeActivity();