// Utility functions for Win5x

// Format currency
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

// Format time
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${remainingSeconds}s`;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// Generate random ID
function generateId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Get number color for roulette
function getNumberColor(number) {
    const colors = {
        0: 'black', 1: 'red', 2: 'black', 3: 'red', 4: 'black',
        5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red'
    };
    return colors[number] || 'black';
}

// Check if number is odd
function isNumberOdd(number) {
    return number % 2 === 1;
}

// Calculate payout
function calculatePayout(betType, betValue, amount, winningNumber) {
    const multiplier = 5;
    
    switch (betType) {
        case 'number':
            return parseInt(betValue) === winningNumber ? amount * multiplier : 0;
        case 'odd_even':
            const isWinningOdd = isNumberOdd(winningNumber);
            const betIsOdd = betValue === 'odd';
            return isWinningOdd === betIsOdd ? amount * multiplier : 0;
        case 'color':
            const winningColor = getNumberColor(winningNumber);
            return betValue === winningColor ? amount * multiplier : 0;
        default:
            return 0;
    }
}

// Determine least chosen number
function determineLeastChosenNumber(betDistribution) {
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
}

// Local storage helpers
const storage = {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    },
    
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Handle storage quota exceeded
        }
    },
    
    remove: (key) => {
        localStorage.removeItem(key);
    },
    
    clear: () => {
        localStorage.clear();
    }
};

// API helper
async function apiCall(endpoint, options = {}) {
    const token = localStorage.getItem('win5x_token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const response = await fetch(`http://localhost:3001${endpoint}`, {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    });
    
    if (response.status === 401) {
        // Token expired, try to refresh or redirect to login
        localStorage.removeItem('win5x_token');
        window.location.reload();
        return null;
    }
    
    return response.json();
}

// Validation helpers
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    return username.length >= 3 && username.length <= 20 && usernameRegex.test(username);
}

function validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one digit');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Animation helpers
function animateElement(element, animation, duration = 1000) {
    element.style.animation = `${animation} ${duration}ms ease`;
    
    setTimeout(() => {
        element.style.animation = '';
    }, duration);
}

// Sound effects (optional)
class SoundManager {
    constructor() {
        this.sounds = {};
        this.enabled = true;
    }
    
    loadSound(name, url) {
        this.sounds[name] = new Audio(url);
    }
    
    play(name, volume = 1) {
        if (!this.enabled || !this.sounds[name]) return;
        
        const sound = this.sounds[name].cloneNode();
        sound.volume = volume;
        sound.play().catch(e => console.log('Sound play failed:', e));
    }
    
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

const soundManager = new SoundManager();

// Initialize sounds (you can add actual sound files)
// soundManager.loadSound('bet', '/sounds/bet.mp3');
// soundManager.loadSound('win', '/sounds/win.mp3');
// soundManager.loadSound('spin', '/sounds/spin.mp3');

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show error notifications for every JS error
    // showNotification('An unexpected error occurred', 'error');
});

// Prevent right-click context menu (optional for casino games)
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Prevent text selection on game elements
document.addEventListener('selectstart', (e) => {
    if (e.target.closest('.roulette-wheel') || e.target.closest('.betting-panel')) {
        e.preventDefault();
    }
});

// Performance monitoring
const performanceMonitor = {
    start: Date.now(),
    
    mark: (label) => {
        if (performance && performance.mark) {
            performance.mark(label);
        }
        console.log(`⏱️ ${label}: ${Date.now() - performanceMonitor.start}ms`);
    },
    
    measure: (name, startMark, endMark) => {
        if (performance && performance.measure) {
            performance.measure(name, startMark, endMark);
        }
    }
};

// Export for use in other files
window.Win5xUtils = {
    formatCurrency,
    formatTime,
    debounce,
    throttle,
    generateId,
    getNumberColor,
    isNumberOdd,
    calculatePayout,
    determineLeastChosenNumber,
    storage,
    apiCall,
    validateEmail,
    validateUsername,
    validatePassword,
    animateElement,
    soundManager,
    performanceMonitor
};