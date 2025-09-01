// Notification System for Win5x

function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notifications');
    
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
    
    // Auto remove after duration
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

// Add CSS for notification animations
const notificationStyles = `
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .notification-icon {
        font-size: 20px;
    }

    .notification-message {
        flex: 1;
        color: white;
        font-weight: 500;
    }

    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;

// Add styles to document
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);