// Admin dashboard functionality

class AdminDashboard {
    constructor() {
        this.analytics = null;
        this.systemStatus = null;
        this.refreshInterval = null;
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadAnalytics(),
                this.loadSystemStatus()
            ]);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    async loadAnalytics() {
        try {
            const response = await AdminUtils.adminApiCall('/api/admin/analytics?period=daily');
            if (response && response.success) {
                this.analytics = response.data;
                this.updateAnalyticsDisplay();
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    async loadSystemStatus() {
        try {
            const response = await AdminUtils.adminApiCall('/api/admin/system-status');
            if (response && response.success) {
                this.systemStatus = response.data;
                this.updateSystemStatusDisplay();
            }
        } catch (error) {
            console.error('Failed to load system status:', error);
        }
    }

    updateAnalyticsDisplay() {
        if (!this.analytics || !this.analytics.summary) return;

        const summary = this.analytics.summary;
        
        document.getElementById('total-users').textContent = summary.totalUsers || 0;
        document.getElementById('total-revenue').textContent = AdminUtils.formatCurrency(summary.revenue || 0);
        document.getElementById('total-bets').textContent = summary.totalBets || 0;
        document.getElementById('house-profit').textContent = AdminUtils.formatCurrency(summary.houseProfitLoss || 0);

        // Update profit/loss styling
        const houseProfitElement = document.getElementById('house-profit');
        const profitValue = summary.houseProfitLoss || 0;
        
        if (profitValue >= 0) {
            houseProfitElement.style.color = '#22c55e';
        } else {
            houseProfitElement.style.color = '#ef4444';
        }
    }

    updateSystemStatusDisplay() {
        if (!this.systemStatus) return;

        // Update game engine status
        const gameEngineStatus = this.systemStatus.gameEngine;
        if (gameEngineStatus) {
            const statusElement = document.getElementById('current-round-number');
            if (statusElement) {
                statusElement.textContent = gameEngineStatus.currentRound ? `#${gameEngineStatus.currentRound}` : '#-';
            }
        }
    }

    startAutoRefresh() {
        // Refresh data every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async emergencyStop() {
        if (!confirm('Are you sure you want to emergency stop the game? This will cancel the current round and refund all bets.')) {
            return;
        }

        try {
            const response = await AdminUtils.adminApiCall('/api/admin/emergency-stop', {
                method: 'POST',
                body: JSON.stringify({ reason: 'Emergency stop by admin' })
            });

            if (response && response.success) {
                showAdminNotification('Emergency stop executed successfully', 'warning');
                await this.loadDashboardData();
            } else {
                showAdminNotification('Failed to execute emergency stop', 'error');
            }
        } catch (error) {
            console.error('Emergency stop error:', error);
            showAdminNotification('Emergency stop failed', 'error');
        }
    }
}

// Global dashboard instance
window.adminDashboard = new AdminDashboard();