/**
 * Owner Authentication Service
 * Manages owner login with phone and PIN
 */

// Get API base URL - use production backend for deployed apps
function getAPIBase() {
  // If running in Capacitor (mobile app), use network IP
  if (window.Capacitor?.isNativePlatform()) {
    return 'http://10.77.155.222:3001/api';
  }
  
  // Local development
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';
  }
  
  // Production: use Render backend URL
  return 'https://nxtbus-backend.onrender.com/api';
}

const API_BASE = getAPIBase();

// Debug logging
console.log('Owner Auth Service - API Base URL:', API_BASE);
console.log('Owner Auth Service - Detected Host:', window.location.hostname);
console.log('Owner Auth Service - Window Location:', window.location.hostname);

// Store current owner in localStorage
const OWNER_KEY = 'nxtbus_current_owner';
const OWNER_SESSION_KEY = 'nxtbus_owner_session';

// Login owner with phone and PIN
export async function loginOwner(phone, pin) {
  console.log('Owner Login Attempt:', { phone, apiBase: API_BASE });
  
  try {
    const response = await fetch(`${API_BASE}/auth/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin })
    });
    
    console.log('Owner Login Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Owner Login HTTP Error:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Owner Login Response Data:', data);
    
    if (data.success) {
      // Save session
      localStorage.setItem(OWNER_KEY, JSON.stringify(data.owner));
      localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify({
        timestamp: Date.now(),
        ownerId: data.owner.id
      }));
      console.log('Owner Login Success - Session Saved');
      return { success: true, owner: data.owner };
    } else {
      console.error('Owner Login Failed:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.error('Owner login error:', error);
    return { success: false, message: `Connection error: ${error.message}` };
  }
}

// Get all owners from API (for display purposes only, no auth)
export async function getAllOwners() {
  try {
    const response = await fetch(`${API_BASE}/owners`);
    if (!response.ok) throw new Error('Failed to fetch owners');
    const owners = await response.json();
    // Return owners without PIN for security
    return owners.map(({ pin, ...owner }) => owner);
  } catch (error) {
    console.error('Error fetching owners:', error);
    return [];
  }
}

// Get current logged-in owner
export function getCurrentOwner() {
  const stored = localStorage.getItem(OWNER_KEY);
  const session = localStorage.getItem(OWNER_SESSION_KEY);
  
  if (stored && session) {
    try {
      const sessionData = JSON.parse(session);
      // Session valid for 24 hours
      if (Date.now() - sessionData.timestamp < 24 * 60 * 60 * 1000) {
        return JSON.parse(stored);
      } else {
        // Session expired
        logoutOwner();
        return null;
      }
    } catch {
      return null;
    }
  }
  return null;
}

// Set current owner (for backward compatibility)
export function setCurrentOwner(owner) {
  if (owner) {
    localStorage.setItem(OWNER_KEY, JSON.stringify(owner));
    localStorage.setItem(OWNER_SESSION_KEY, JSON.stringify({
      timestamp: Date.now(),
      ownerId: owner.id
    }));
  } else {
    localStorage.removeItem(OWNER_KEY);
    localStorage.removeItem(OWNER_SESSION_KEY);
  }
}

// Logout current owner
export function logoutOwner() {
  localStorage.removeItem(OWNER_KEY);
  localStorage.removeItem(OWNER_SESSION_KEY);
}

// Get current owner ID
export function getCurrentOwnerId() {
  const owner = getCurrentOwner();
  return owner?.id || null;
}

// Check if owner is logged in
export function isOwnerLoggedIn() {
  return getCurrentOwner() !== null;
}
