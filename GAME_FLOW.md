# Win5x Game Flow Documentation

## 🎰 **SCRIPTED GAME FLOW IMPLEMENTATION**

The Win5x roulette game follows a precise 4-phase cycle with backend-controlled timing and winner calculation.

---

## 📋 **PHASE BREAKDOWN**

### **Phase 1: BETTING (30 seconds)**
```
⏰ Duration: 30 seconds
🎯 Purpose: Players place bets on numbers, colors, or parity
🔒 Security: All bets validated and stored in database
```

**Backend Actions:**
- Create new game round with `status = 'betting'`
- Accept and validate all incoming bets
- Update real-time bet distribution via WebSocket
- Emit timer updates every second (30 → 1)

**Frontend Display:**
- Green timer card with countdown (30 → 1)
- "Place Your Bets" message
- Active betting interface (chips, numbers, colors)
- Real-time bet distribution updates
- Live activity feed with fake users

**Player Actions:**
- Select chip values (₹10, ₹20, ₹50, ₹100, ₹200, ₹500)
- Place bets on numbers (0-9), colors (Red/Black), parity (Odd/Even)
- View real-time bet pools and distributions
- Clear, undo, or rebet previous bets

---

### **Phase 2: COUNTDOWN (10 seconds)**
```
⏰ Duration: 10 seconds  
🎯 Purpose: Backend calculates winner, frontend shows countdown
🔒 Security: Winner calculated secretly, not revealed to frontend
```

**Backend Actions:**
- Set `status = 'countdown'` and stop accepting bets
- **SECRETLY calculate least-chosen number as winner**
- Store winner in memory (NOT in database yet)
- Emit reverse countdown timer (10 → 0)
- **NO winner information sent to frontend**

**Frontend Display:**
- Orange timer card with reverse countdown (10 → 0)
- "Preparing to Spin" message
- **No timer visible during actual calculation**
- Betting interface disabled
- Pulsing animation to build suspense

**Security Features:**
- Winner stored only in backend memory (`roundWinners` Map)
- Frontend cannot access or predict winner
- Calculation based on real bet distribution
- No network traffic reveals winner information

---

### **Phase 3: SPINNING (10 seconds)**
```
⏰ Duration: 10 seconds
🎯 Purpose: Wheel animation lands on predetermined winner
🔒 Security: Animation targets backend-calculated number
```

**Backend Actions:**
- Set `status = 'spinning'`
- Send `spin_start` event with `winningNumber` for animation
- **NO timer updates sent** (no countdown visible)
- Prepare for instant payout processing

**Frontend Display:**
- Purple timer card with spinning glow effect
- "Wheel is Spinning" message
- **NO TIMER VISIBLE** - pure animation focus
- Wheel animates smoothly to land on winner number
- Spinning icon animation
- Activity feed shows excitement burst

**Animation Details:**
- Wheel rotates 5-8 full turns for drama
- Precise targeting to land on winner number
- Smooth CSS transition with easing
- 10-second duration for perfect timing

---

### **Phase 4: RESULT (10 seconds)**
```
⏰ Duration: 10 seconds
🎯 Purpose: Reveal winner, process payouts, show results
🔒 Security: Instant balance updates, transaction logging
```

**Backend Actions:**
- Set `status = 'result'` and reveal winner in database
- **INSTANTLY process all payouts** and update user balances
- Create transaction records for all winnings
- Emit balance updates to specific winning users
- Send complete result data to all clients
- Clean up stored winner from memory

**Frontend Display:**
- Blue timer card with result countdown (10 → 0)
- "Round Results" message
- **Winning number card** with number, color, parity
- **Instant balance updates** for winners
- Win celebration animations for successful players
- Activity burst showing big wins and excitement

**Payout Processing:**
- Winners receive **5x their bet amount** instantly
- Balance updates happen in real-time
- Transaction history updated immediately
- Win notifications sent to specific users
- Celebration effects triggered for winners

---

## 🔒 **SECURITY IMPLEMENTATION**

### **Backend Security:**
```javascript
// Winner calculation is completely server-side
async calculateSecretWinner(roundId) {
  // Get all bets and calculate distribution
  const bets = await getBetsForRound(roundId);
  const distribution = calculateBetDistribution(bets);
  
  // Determine least chosen number
  const winner = determineLeastChosenNumber(distribution);
  
  // Store securely in memory only
  roundWinners.set(roundId, winner);
  
  return winner; // NOT sent to frontend
}
```

### **Frontend Limitations:**
- Frontend only receives animation targets during spinning
- Cannot predict or calculate winners
- No access to bet distribution calculations
- Timer updates control betting availability
- All game logic controlled by backend events

### **Data Flow Security:**
1. **Betting Phase**: Frontend → Backend (bet placement only)
2. **Countdown Phase**: Backend calculation (no frontend communication)
3. **Spinning Phase**: Backend → Frontend (animation target only)
4. **Result Phase**: Backend → Frontend (final results and payouts)

---

## ⏱️ **PRECISE TIMING CONTROL**

### **Phase Transitions:**
```
BETTING (30s) → COUNTDOWN (10s) → SPINNING (10s) → RESULT (10s) → [2s gap] → NEW BETTING
```

### **Timer Visibility:**
- **BETTING**: ✅ Timer visible (30 → 1)
- **COUNTDOWN**: ✅ Timer visible (10 → 0) 
- **SPINNING**: ❌ **NO TIMER** - pure animation
- **RESULT**: ✅ Timer visible (10 → 0)

### **Backend Timer Management:**
```javascript
// Betting phase
setTimeout(() => this.startCountdown(roundId), 30000);

// Countdown phase  
setTimeout(() => this.startSpinning(roundId), 10000);

// Spinning phase
setTimeout(() => this.revealResults(roundId), 10000);

// Result phase
setTimeout(() => this.completeRound(roundId), 10000);
```

---

## 🎯 **PLAYER EXPERIENCE**

### **Visual Feedback:**
1. **Green betting timer** creates urgency to place bets
2. **Orange countdown** builds suspense before spin
3. **Purple spinning glow** focuses attention on wheel
4. **Blue result timer** shows remaining time to view results

### **Engagement Elements:**
- **Fake activity bursts** during spinning and results
- **Win celebrations** with animations and notifications
- **Real-time balance updates** for immediate gratification
- **Social proof** through simulated player activity

### **User Interface States:**
```css
.timer-card.betting    /* Green - Active betting */
.timer-card.countdown  /* Orange - Suspense building */
.timer-card.spinning   /* Purple - Animation focus */
.timer-card.result     /* Blue - Results display */
```

---

## 🔄 **COMPLETE CYCLE**

### **60-Second Round Cycle:**
- **0-30s**: BETTING - Players place bets with countdown
- **30-40s**: COUNTDOWN - Backend calculates, reverse countdown
- **40-50s**: SPINNING - Wheel animation, no timer shown
- **50-60s**: RESULT - Winner revealed, payouts processed
- **60-62s**: Brief gap before next round starts

### **Backend State Management:**
```javascript
// Round states in database
'betting'   → Accept bets, show timer
'countdown' → Calculate winner secretly, show countdown  
'spinning'  → Animate wheel, no timer
'result'    → Reveal winner, process payouts
'completed' → Round finished, prepare next
```

### **Frontend Synchronization:**
- All phase changes driven by backend WebSocket events
- Timer updates synchronized across all connected players
- Bet placement only allowed during 'betting' phase
- Animation triggers based on backend spin events
- Balance updates happen instantly upon result revelation

---

## 🎉 **IMPLEMENTATION COMPLETE**

The Win5x game now follows the **exact scripted flow** with:

✅ **30s BETTING** with visible countdown timer
✅ **10s COUNTDOWN** with reverse countdown (10→0), secret winner calculation  
✅ **10s SPINNING** with precise wheel animation, **no timer visible**
✅ **10s RESULT** with instant payouts and balance updates
✅ **Backend-only winner calculation** - completely secure
✅ **Real-time payout processing** - instant balance crediting
✅ **Smooth phase transitions** with proper visual feedback

The game maintains **complete security** while providing an **engaging, professional casino experience** with precise timing and dramatic visual effects.