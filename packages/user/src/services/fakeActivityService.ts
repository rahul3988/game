interface FakeUser {
  username: string;
  level: 'casual' | 'regular' | 'high_roller';
  betPreference: number[];
  winRate: number;
  lastActivity: number;
}

interface ActivityEvent {
  id: string;
  type: 'join' | 'leave' | 'bet' | 'win' | 'big_win';
  username: string;
  amount?: number;
  timestamp: number;
  betType?: 'number' | 'color' | 'odd_even';
  betValue?: string | number;
}

class FakeActivityService {
  private users: FakeUser[] = [];
  private activeUsers: Set<string> = new Set();
  private activityCallbacks: ((event: ActivityEvent) => void)[] = [];
  private viewerCallbacks: ((count: number, trend: 'up' | 'down') => void)[] = [];
  private isRunning = false;

  private readonly USERNAME_PREFIXES = [
    'Lucky', 'Win', 'Spin', 'Gold', 'Bet', 'Casino', 'Roulette', 'Big', 'Chip', 'Vegas',
    'Jackpot', 'Ace', 'King', 'Queen', 'Diamond', 'Royal', 'Master', 'Pro', 'Legend', 'Elite'
  ];

  private readonly USERNAME_SUFFIXES = [
    'Player', 'Winner', 'King', 'Master', 'Pro', 'Ace', 'Hunter', 'Wizard', 'Beast', 'Charm',
    'Streak', 'Eagle', 'Hot', 'Jack', 'Face', 'Machine', 'Shark', 'Big', 'Fast', 'Strike',
    '007', '21', '777', 'VIP', 'Star', 'Boss', 'Chief', 'Lord', 'Duke', 'Baron'
  ];

  private readonly BET_AMOUNTS = [10, 20, 50, 100, 200, 500, 1000, 2000];

  constructor() {
    this.initializeFakeUsers();
  }

  private initializeFakeUsers(): void {
    // Generate 200 fake users with different characteristics
    for (let i = 0; i < 200; i++) {
      const prefix = this.USERNAME_PREFIXES[Math.floor(Math.random() * this.USERNAME_PREFIXES.length)];
      const suffix = this.USERNAME_SUFFIXES[Math.floor(Math.random() * this.USERNAME_SUFFIXES.length)];
      const number = Math.floor(Math.random() * 999) + 1;
      
      const username = `${prefix}${suffix}${number}`;
      
      // Determine user level and characteristics
      const levelRand = Math.random();
      let level: FakeUser['level'];
      let betPreference: number[];
      let winRate: number;

      if (levelRand < 0.6) {
        // 60% casual players
        level = 'casual';
        betPreference = [10, 20, 50];
        winRate = 0.15; // 15% win rate
      } else if (levelRand < 0.9) {
        // 30% regular players
        level = 'regular';
        betPreference = [20, 50, 100, 200];
        winRate = 0.18; // 18% win rate
      } else {
        // 10% high rollers
        level = 'high_roller';
        betPreference = [100, 200, 500, 1000, 2000];
        winRate = 0.22; // 22% win rate
      }

      this.users.push({
        username,
        level,
        betPreference,
        winRate,
        lastActivity: 0,
      });
    }
  }

  private getRandomUser(): FakeUser {
    return this.users[Math.floor(Math.random() * this.users.length)];
  }

  private generateBetActivity(): ActivityEvent | null {
    const user = this.getRandomUser();
    const betAmount = user.betPreference[Math.floor(Math.random() * user.betPreference.length)];
    
    // Determine bet type
    const betTypes = ['number', 'color', 'odd_even'] as const;
    const betType = betTypes[Math.floor(Math.random() * betTypes.length)];
    
    let betValue: string | number;
    switch (betType) {
      case 'number':
        betValue = Math.floor(Math.random() * 10);
        break;
      case 'color':
        betValue = Math.random() > 0.5 ? 'red' : 'black';
        break;
      case 'odd_even':
        betValue = Math.random() > 0.5 ? 'odd' : 'even';
        break;
    }

    return {
      id: `bet_${Date.now()}_${Math.random()}`,
      type: 'bet',
      username: user.username,
      amount: betAmount,
      timestamp: Date.now(),
      betType,
      betValue,
    };
  }

  private generateWinActivity(): ActivityEvent | null {
    const user = this.getRandomUser();
    
    // Simulate win based on user's win rate
    if (Math.random() > user.winRate) {
      return null;
    }

    const baseBet = user.betPreference[Math.floor(Math.random() * user.betPreference.length)];
    const winAmount = baseBet * 5; // 5x multiplier
    
    const isBigWin = winAmount >= 1000;

    return {
      id: `win_${Date.now()}_${Math.random()}`,
      type: isBigWin ? 'big_win' : 'win',
      username: user.username,
      amount: winAmount,
      timestamp: Date.now(),
    };
  }

  private generateJoinLeaveActivity(): ActivityEvent | null {
    const user = this.getRandomUser();
    const isJoin = Math.random() > 0.3; // 70% join, 30% leave
    
    if (isJoin) {
      if (!this.activeUsers.has(user.username)) {
        this.activeUsers.add(user.username);
        return {
          id: `join_${Date.now()}_${Math.random()}`,
          type: 'join',
          username: user.username,
          timestamp: Date.now(),
        };
      }
    } else {
      if (this.activeUsers.has(user.username)) {
        this.activeUsers.delete(user.username);
        return {
          id: `leave_${Date.now()}_${Math.random()}`,
          type: 'leave',
          username: user.username,
          timestamp: Date.now(),
        };
      }
    }
    
    return null;
  }

  private simulateViewerFluctuation(): void {
    const baseViewers = 150;
    const maxFluctuation = 800;
    const currentHour = new Date().getHours();
    
    // Simulate daily patterns (more active during evening hours)
    let timeMultiplier = 1;
    if (currentHour >= 18 && currentHour <= 23) {
      timeMultiplier = 1.8; // Peak hours
    } else if (currentHour >= 12 && currentHour <= 17) {
      timeMultiplier = 1.4; // Afternoon
    } else if (currentHour >= 6 && currentHour <= 11) {
      timeMultiplier = 1.1; // Morning
    } else {
      timeMultiplier = 0.7; // Night
    }

    const targetViewers = Math.floor((baseViewers + Math.random() * maxFluctuation) * timeMultiplier);
    const currentViewers = this.activeUsers.size;
    const trend = targetViewers > currentViewers ? 'up' : 'down';
    
    // Notify viewer count callbacks
    this.viewerCallbacks.forEach(callback => {
      callback(targetViewers, trend);
    });
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Activity generation intervals
    setInterval(() => {
      if (!this.isRunning) return;
      
      // Generate different types of activities
      const activities = [];
      
      // Betting activity (most common)
      if (Math.random() < 0.7) {
        const betActivity = this.generateBetActivity();
        if (betActivity) activities.push(betActivity);
      }
      
      // Win activity
      if (Math.random() < 0.3) {
        const winActivity = this.generateWinActivity();
        if (winActivity) activities.push(winActivity);
      }
      
      // Join/leave activity
      if (Math.random() < 0.2) {
        const joinLeaveActivity = this.generateJoinLeaveActivity();
        if (joinLeaveActivity) activities.push(joinLeaveActivity);
      }
      
      // Emit activities
      activities.forEach(activity => {
        this.activityCallbacks.forEach(callback => {
          callback(activity);
        });
      });
      
    }, 1000 + Math.random() * 4000); // Every 1-5 seconds

    // Viewer count fluctuation
    setInterval(() => {
      if (!this.isRunning) return;
      this.simulateViewerFluctuation();
    }, 5000 + Math.random() * 10000); // Every 5-15 seconds
  }

  stop(): void {
    this.isRunning = false;
  }

  onActivity(callback: (event: ActivityEvent) => void): () => void {
    this.activityCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.activityCallbacks.indexOf(callback);
      if (index > -1) {
        this.activityCallbacks.splice(index, 1);
      }
    };
  }

  onViewerUpdate(callback: (count: number, trend: 'up' | 'down') => void): () => void {
    this.viewerCallbacks.push(callback);
    
    return () => {
      const index = this.viewerCallbacks.indexOf(callback);
      if (index > -1) {
        this.viewerCallbacks.splice(index, 1);
      }
    };
  }

  getActiveUserCount(): number {
    return this.activeUsers.size;
  }

  // Simulate burst activities during special events
  triggerBurstActivity(duration: number = 30000): void {
    const burstInterval = setInterval(() => {
      // Generate multiple activities rapidly
      for (let i = 0; i < Math.floor(Math.random() * 5) + 2; i++) {
        const activityType = Math.random();
        let activity: ActivityEvent | null = null;
        
        if (activityType < 0.5) {
          activity = this.generateBetActivity();
        } else if (activityType < 0.8) {
          activity = this.generateWinActivity();
        } else {
          activity = this.generateJoinLeaveActivity();
        }
        
        if (activity) {
          this.activityCallbacks.forEach(callback => {
            callback(activity!);
          });
        }
      }
    }, 500); // Every 500ms during burst

    setTimeout(() => {
      clearInterval(burstInterval);
    }, duration);
  }
}

// Singleton instance
export const fakeActivityService = new FakeActivityService();