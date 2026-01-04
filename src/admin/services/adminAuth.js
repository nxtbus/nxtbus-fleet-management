/**
 * Admin Authentication Service
 * Manages admin login with username and password
 */

// Get API base URL - use production backend for deployed apps
function getAPIBase() {
  // Local development
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';
  }
  
  // Production: use Render backend URL
  return 'https://nxtbus-backend.onrender.com/api';
}

const API_BASE = getAPIBase();

console.log('Admin Auth Service - API Base URL:', API_BASE);
console.log('Admin Auth Service - Detected Host:', window.location.hostname);

// Store current admin in localStorage
const ADMIN_KEY = 'nxtbus_current_admin';
const ADMIN_SESSION_KEY = 'nxtbus_admin_session';
const ADMIN_TOKEN_KEY = 'nxtbus_admin_token';

// Login admin with username and password
export async function loginAdmin(username, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      // Save session with token
      localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        timestamp: Date.now(),
        adminId: data.admin.id
      }));
      return { success: true, admin: data.admin, token: data.token };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, message: 'Server error. Please try again.' };
  }
}

// Get current admin token
export function getAdminToken() {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  const session = localStorage.getItem(ADMIN_SESSION_KEY);
  
  if (token && session) {
    try {
      const sessionData = JSON.parse(session);
      // Session valid for 8 hours
      if (Date.now() - sessionData.timestamp < 8 * 60 * 60 * 1000) {
        return token;
      } else {
        // Session expired
        logoutAdmin();
        return null;
      }
    } catch {
      return null;
    }
  }
  return null;
}

// Get current logged-in admin
export function getCurrentAdmin() {
  const stored = localStorage.getItem(ADMIN_KEY);
  const session = localStorage.getItem(ADMIN_SESSION_KEY);
  
  if (stored && session) {
    try {
      const sessionData = JSON.parse(session);
      // Session valid for 8 hours
      if (Date.now() - sessionData.timestamp < 8 * 60 * 60 * 1000) {
        return JSON.parse(stored);
      } else {
        // Session expired
        logoutAdmin();
        return null;
      }
    } catch {
      return null;
    }
  }
  return null;
}

// Logout current admin
export function logoutAdmin() {
  localStorage.removeItem(ADMIN_KEY);
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

// Check if admin is logged in
export function isAdminLoggedIn() {
  return getCurrentAdmin() !== null;
}
