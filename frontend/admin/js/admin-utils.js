// Admin utility functions

function formatCurrency(amount) {
    return `₹${parseFloat(amount).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}:${remainingSeconds.toString().padStart(2, '0')}` : `${remainingSeconds}s`;
}

function getStatusBadgeClass(status) {
    const statusClasses = {
        'pending': 'status-badge pending',
        'approved': 'status-badge approved', 
        'rejected': 'status-badge rejected',
        'completed': 'status-badge completed',
        'cancelled': 'status-badge cancelled',
        'active': 'status-badge active',
        'inactive': 'status-badge inactive'
    };
    return statusClasses[status.toLowerCase()] || 'status-badge';
}

async function adminApiCall(endpoint, options = {}) {
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
            window.location.reload();
            return null;
        }
        
        return response.json();
    } catch (error) {
        console.error('Admin API call failed:', error);
        throw error;
    }
}

// Export to global scope
window.AdminUtils = {
    formatCurrency,
    formatDate,
    formatTime,
    getStatusBadgeClass,
    adminApiCall
};