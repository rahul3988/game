// Win5x Admin Panel Main Application

class Win5xAdmin {
    constructor() {
        this.currentAdmin = null;
        this.socket = null;
        this.currentPage = 'dashboard';
        
        this.init();
    }

    async init() {
        console.log('🛡️ Initializing Win5x Admin Panel...');
        
        // Check authentication
        const token = localStorage.getItem('win5x_admin_token');
        if (token) {
            try {
                const admin = await this.verifyToken(token);
                if (admin) {
                    this.currentAdmin = admin;
                    this.showAdminScreen();
                    this.initializeSocket();
                    this.loadDashboardData();
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

        this.initializeEventListeners();
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 1000);
    }

    initializeEventListeners() {
        // Admin login form
        document.getElementById('admin-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Auto-refresh data every 30 seconds
        setInterval(() => {
            if (this.currentAdmin) {
                this.refreshCurrentPageData();
            }
        }, 30000);
    }

    showLoginScreen() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('admin-screen').classList.add('hidden');
    }

    showAdminScreen() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('admin-screen').classList.remove('hidden');
        
        if (this.currentAdmin) {
            this.updateAdminInterface();
        }
    }

    updateAdminInterface() {
        if (!this.currentAdmin) return;

        document.getElementById('admin-initial').textContent = this.currentAdmin.username.charAt(0).toUpperCase();
        document.getElementById('admin-username').textContent = this.currentAdmin.username;
        document.getElementById('admin-role').textContent = this.currentAdmin.role;
    }

    async handleAdminLogin() {
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;

        try {
            const response = await fetch('http://localhost:3001/api/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('win5x_admin_token', data.data.accessToken);
                localStorage.setItem('win5x_admin_refresh_token', data.data.refreshToken);
                this.currentAdmin = data.data.admin;
                
                showAdminNotification('Login successful', 'success');
                this.showAdminScreen();
                this.initializeSocket();
                this.loadDashboardData();
            } else {
                showAdminNotification(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            showAdminNotification('Login failed. Please try again.', 'error');
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch('http://localhost:3001/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();
            return data.success && data.data.type === 'admin' ? data.data.admin : null;
        } catch (error) {
            return null;
        }
    }

    initializeSocket() {
        const token = localStorage.getItem('win5x_admin_token');
        if (!token) return;

        this.socket = io('http://localhost:3001', {
            auth: { token }
        });

        this.socket.on('connect', () => {
            console.log('✅ Admin connected to game server');
            document.getElementById('admin-connection-indicator').classList.add('connected');
            document.getElementById('admin-connection-text').textContent = 'Connected';
            this.socket.emit('join_room', { room: 'admin' });
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Admin disconnected from game server');
            document.getElementById('admin-connection-indicator').classList.remove('connected');
            document.getElementById('admin-connection-text').textContent = 'Disconnected';
        });

        this.socket.on('round_update', (round) => {
            this.updateGameStatus(round);
        });

        this.socket.on('admin_notification', (notification) => {
            this.handleAdminNotification(notification);
        });

        this.socket.on('bet_distribution', (distribution) => {
            this.updateBetDistribution(distribution);
        });

        this.socket.on('timer_update', (timer) => {
            this.updateGameTimer(timer);
        });
    }

    updateGameStatus(round) {
        document.getElementById('current-round-number').textContent = `#${round.round_number || round.roundNumber}`;
        document.getElementById('current-phase').textContent = round.status;
        
        // Update total pool if available
        if (round.total_bet_amount) {
            document.getElementById('total-pool').textContent = formatCurrency(round.total_bet_amount);
        }
    }

    updateGameTimer(timer) {
        document.getElementById('time-remaining').textContent = `${timer.timeRemaining}s`;
    }

    handleAdminNotification(notification) {
        showAdminNotification(notification.message, notification.type);
        
        // Update badges for pending items
        if (notification.type === 'deposit_request') {
            this.updatePendingBadges();
        }
    }

    async loadDashboardData() {
        try {
            // Load analytics data
            const analyticsResponse = await this.adminApiCall('/api/admin/analytics');
            if (analyticsResponse && analyticsResponse.success) {
                this.updateDashboardStats(analyticsResponse.data);
            }

            // Load current round
            const roundResponse = await this.adminApiCall('/api/game/current-round');
            if (roundResponse && roundResponse.success && roundResponse.data) {
                this.updateGameStatus(roundResponse.data.round);
            }

            // Update pending badges
            this.updatePendingBadges();

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    updateDashboardStats(analytics) {
        if (analytics.summary) {
            document.getElementById('total-users').textContent = analytics.summary.totalUsers || 0;
            document.getElementById('total-revenue').textContent = formatCurrency(analytics.summary.revenue || 0);
            document.getElementById('total-bets').textContent = analytics.summary.totalBets || 0;
            document.getElementById('house-profit').textContent = formatCurrency(analytics.summary.houseProfitLoss || 0);
        }
    }

    async updatePendingBadges() {
        try {
            const depositsResponse = await this.adminApiCall('/api/payment/admin/deposits?status=pending');
            const withdrawalsResponse = await this.adminApiCall('/api/payment/admin/withdrawals?status=pending');

            if (depositsResponse && depositsResponse.success) {
                const count = depositsResponse.data.total || 0;
                this.updateBadge('deposits-badge', count);
                this.updateBadge('pending-payments-badge', count);
            }

            if (withdrawalsResponse && withdrawalsResponse.success) {
                const count = withdrawalsResponse.data.total || 0;
                this.updateBadge('withdrawals-badge', count);
            }

        } catch (error) {
            console.error('Failed to update pending badges:', error);
        }
    }

    updateBadge(badgeId, count) {
        const badge = document.getElementById(badgeId);
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    async adminApiCall(endpoint, options = {}) {
        const token = localStorage.getItem('win5x_admin_token');
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };
        
        try {
            const response = await fetch(`http://localhost:3001${endpoint}`, {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...options.headers
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('win5x_admin_token');
                this.showLoginScreen();
                return null;
            }
            
            return response.json();
        } catch (error) {
            console.error('Admin API call failed:', error);
            return null;
        }
    }

    refreshCurrentPageData() {
        switch (this.currentPage) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'payments':
                if (window.adminPayments) {
                    window.adminPayments.refreshData();
                }
                break;
        }
    }

    logout() {
        localStorage.removeItem('win5x_admin_token');
        localStorage.removeItem('win5x_admin_refresh_token');
        this.currentAdmin = null;
        
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        showAdminNotification('Logged out successfully', 'success');
        this.showLoginScreen();
    }
}

// Global functions for HTML onclick handlers
function showPage(pageName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(`${pageName}-page`).classList.add('active');
    
    // Update header
    document.getElementById('page-title').textContent = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    document.getElementById('breadcrumb-current').textContent = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    
    adminApp.currentPage = pageName;
    
    // Load page-specific data
    if (pageName === 'payments' && window.adminPayments) {
        window.adminPayments.loadData();
    }
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

function adminLogout() {
    adminApp.logout();
}

async function emergencyStop() {
    if (!confirm('Are you sure you want to emergency stop the game? This will cancel the current round and refund all bets.')) {
        return;
    }

    try {
        const response = await adminApp.adminApiCall('/api/admin/emergency-stop', {
            method: 'POST',
            body: JSON.stringify({ reason: 'Emergency stop by admin' })
        });

        if (response && response.success) {
            showAdminNotification('Emergency stop executed successfully', 'warning');
        } else {
            showAdminNotification('Failed to execute emergency stop', 'error');
        }
    } catch (error) {
        console.error('Emergency stop error:', error);
        showAdminNotification('Emergency stop failed', 'error');
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

// Utility functions
function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function showAdminNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('admin-notifications');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = getNotificationIcon(type);
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">${icon}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="closeNotification(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                container.removeChild(notification);
            }, 300);
        }
    }, duration);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success':
            return '<i class="fas fa-check-circle" style="color: #22c55e;"></i>';
        case 'error':
            return '<i class="fas fa-exclamation-circle" style="color: #ef4444;"></i>';
        case 'warning':
            return '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>';
        case 'info':
        default:
            return '<i class="fas fa-info-circle" style="color: #3b82f6;"></i>';
    }
}

function closeNotification(button) {
    const notification = button.parentNode;
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 300);
}

// Initialize admin app when DOM is loaded
let adminApp;
document.addEventListener('DOMContentLoaded', () => {
    adminApp = new Win5xAdmin();
});

// Global click handler for closing dropdowns
document.addEventListener('click', (e) => {
    // Close any open dropdowns when clicking outside
});