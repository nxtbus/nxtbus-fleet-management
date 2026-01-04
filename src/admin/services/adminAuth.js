/**
 * Admin Authentication Service
 * Manages admin login with username and password
 */

const HOST = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
const API_BASE = `http://${HOST}:3001/api`;

// Store current admin in localStorage
const ADMIN_KEY = 'nxtbus_current_admin';
const ADMIN_SESSION_KEY = 'nxtbus_admin_session';

// Login admin with username and password
export async function loginAdmin(username, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Save session
      localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        timestamp: Date.now(),
        adminId: data.admin.id
      }));
      return { success: true, admin: data.admin };
    } else {
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, message: 'Server error. Please try again.' };
  }
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
}

// Check if admin is logged in
export function isAdminLoggedIn() {
  return getCurrentAdmin() !== null;
}
