// Admin authentication module

let adminAuthState = {
    isAuthenticated: false,
    admin: null,
    token: null
};

async function adminLogin(username, password) {
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
            
            adminAuthState.isAuthenticated = true;
            adminAuthState.admin = data.data.admin;
            adminAuthState.token = data.data.accessToken;
            
            return { success: true, admin: data.data.admin };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Admin login error:', error);
        return { success: false, error: 'Network error' };
    }
}

async function verifyAdminToken(token) {
    try {
        const response = await fetch('http://localhost:3001/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success && data.data.type === 'admin') {
            adminAuthState.isAuthenticated = true;
            adminAuthState.admin = data.data.admin;
            adminAuthState.token = token;
            return data.data.admin;
        }
        
        return null;
    } catch (error) {
        console.error('Admin token verification error:', error);
        return null;
    }
}

function adminLogout() {
    localStorage.removeItem('win5x_admin_token');
    localStorage.removeItem('win5x_admin_refresh_token');
    
    adminAuthState.isAuthenticated = false;
    adminAuthState.admin = null;
    adminAuthState.token = null;
    
    return true;
}

function getCurrentAdmin() {
    return adminAuthState.admin;
}

function isAdminAuthenticated() {
    return adminAuthState.isAuthenticated && adminAuthState.token;
}

function getAdminToken() {
    return adminAuthState.token || localStorage.getItem('win5x_admin_token');
}

function hasPermission(permission) {
    if (!adminAuthState.admin || !adminAuthState.admin.permissions) return false;
    return adminAuthState.admin.permissions.includes(permission);
}

// Export to global scope
window.AdminAuth = {
    adminLogin,
    verifyAdminToken,
    adminLogout,
    getCurrentAdmin,
    isAdminAuthenticated,
    getAdminToken,
    hasPermission
};