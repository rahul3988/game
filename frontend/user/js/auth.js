// Authentication module for Win5x user panel

// Auth state management
let authState = {
    isAuthenticated: false,
    user: null,
    token: null
};

// Login function
async function login(username, password) {
    try {
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store tokens
            localStorage.setItem('win5x_token', data.data.accessToken);
            localStorage.setItem('win5x_refresh_token', data.data.refreshToken);
            
            // Update auth state
            authState.isAuthenticated = true;
            authState.user = data.data.user;
            authState.token = data.data.accessToken;
            
            return { success: true, user: data.data.user };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Network error' };
    }
}

// Register function
async function register(username, email, password) {
    try {
        const response = await fetch('http://localhost:3001/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            // Store tokens
            localStorage.setItem('win5x_token', data.data.accessToken);
            localStorage.setItem('win5x_refresh_token', data.data.refreshToken);
            
            // Update auth state
            authState.isAuthenticated = true;
            authState.user = data.data.user;
            authState.token = data.data.accessToken;
            
            return { success: true, user: data.data.user };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: 'Network error' };
    }
}

// Verify token
async function verifyToken(token) {
    try {
        const response = await fetch('http://localhost:3001/api/auth/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success && data.data.type === 'user') {
            authState.isAuthenticated = true;
            authState.user = data.data.user;
            authState.token = token;
            return data.data.user;
        }
        
        return null;
    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// Logout function
function logout() {
    // Clear tokens
    localStorage.removeItem('win5x_token');
    localStorage.removeItem('win5x_refresh_token');
    
    // Reset auth state
    authState.isAuthenticated = false;
    authState.user = null;
    authState.token = null;
    
    // Disconnect socket
    if (window.gameSocket) {
        window.gameSocket.disconnect();
        window.gameSocket = null;
    }
    
    return true;
}

// Get current user
function getCurrentUser() {
    return authState.user;
}

// Check if authenticated
function isAuthenticated() {
    return authState.isAuthenticated && authState.token;
}

// Get auth token
function getAuthToken() {
    return authState.token || localStorage.getItem('win5x_token');
}

// Refresh token
async function refreshAuthToken() {
    const refreshToken = localStorage.getItem('win5x_refresh_token');
    if (!refreshToken) return false;

    try {
        const response = await fetch('http://localhost:3001/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('win5x_token', data.data.accessToken);
            localStorage.setItem('win5x_refresh_token', data.data.refreshToken);
            authState.token = data.data.accessToken;
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}

// API call with automatic token refresh
async function authenticatedApiCall(endpoint, options = {}) {
    let token = getAuthToken();
    
    const makeRequest = async (authToken) => {
        return fetch(`http://localhost:3001${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
                ...options.headers
            }
        });
    };

    try {
        let response = await makeRequest(token);
        
        // If unauthorized, try to refresh token
        if (response.status === 401) {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
                token = getAuthToken();
                response = await makeRequest(token);
            } else {
                // Refresh failed, redirect to login
                logout();
                window.location.reload();
                return null;
            }
        }
        
        return response.json();
    } catch (error) {
        console.error('Authenticated API call failed:', error);
        throw error;
    }
}

// Export auth functions to global scope
window.Win5xAuth = {
    login,
    register,
    logout,
    verifyToken,
    getCurrentUser,
    isAuthenticated,
    getAuthToken,
    refreshAuthToken,
    authenticatedApiCall
};