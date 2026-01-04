/**
 * Call Detection Service
 * Detects phone calls during active trips and notifies admin/owner
 */

// API Base URL
const getApiBase = () => {
  const NETWORK_IP = '10.104.193.222';
  const getHost = () => {
    if (window.Capacitor?.isNativePlatform()) return NETWORK_IP;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return window.location.hostname;
    }
    return 'localhost';
  };
  const apiBase = `http://${getHost()}:3001/api`;
  console.log('Call Detection Service - API Base URL:', apiBase);
  return apiBase;
};

async function fetchApi(endpoint, options = {}) {
  const apiBase = getApiBase();
  const url = `${apiBase}${endpoint}`;
  console.log('Call Detection API Request:', url, options);
  
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    
    console.log('Call Detection API Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Call Detection API Error:', response.status, errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Call Detection API Response Data:', data);
    return data;
  } catch (error) {
    console.error('Call Detection API Request Failed:', error);
    throw error;
  }
}

// Store for call alerts
let callAlerts = [];
let listeners = [];

/**
 * Report a phone call event during an active trip
 */
export async function reportCallEvent(tripData) {
  const callEvent = {
    id: `CALL_${Date.now()}`,
    tripId: tripData.tripId,
    busId: tripData.busId,
    busNumber: tripData.busNumber,
    driverId: tripData.driverId,
    driverName: tripData.driverName,
    driverPhone: tripData.driverPhone,
    routeId: tripData.routeId,
    routeName: tripData.routeName,
    ownerId: tripData.ownerId,
    callType: tripData.callType || 'incoming',
    callStatus: tripData.callStatus || 'ringing',
    timestamp: new Date().toISOString(),
    location: tripData.currentGps || null,
    status: 'active',
    acknowledged: false,
    acknowledgedBy: null,
    acknowledgedAt: null
  };

  try {
    const saved = await fetchApi('/callAlerts', {
      method: 'POST',
      body: JSON.stringify(callEvent)
    });
    callAlerts.push(saved);
    notifyListeners();
    return saved;
  } catch (error) {
    console.error('Failed to report call event:', error);
    callAlerts.push(callEvent);
    notifyListeners();
    return callEvent;
  }
}

/**
 * Get all call alerts
 */
export async function getCallAlerts() {
  try {
    const alerts = await fetchApi('/callAlerts');
    callAlerts = alerts || [];
    return callAlerts;
  } catch (error) {
    console.error('Failed to fetch call alerts:', error);
    return callAlerts;
  }
}

/**
 * Get active (unacknowledged) call alerts
 */
export async function getActiveCallAlerts() {
  const alerts = await getCallAlerts();
  return alerts.filter(a => !a.acknowledged && a.status === 'active');
}

/**
 * Get call alerts for a specific owner
 */
export async function getCallAlertsForOwner(ownerId) {
  const alerts = await getCallAlerts();
  return alerts.filter(a => a.ownerId === ownerId);
}

/**
 * Acknowledge a call alert
 */
export async function acknowledgeCallAlert(alertId, acknowledgedBy) {
  try {
    const updated = await fetchApi(`/callAlerts/${alertId}`, {
      method: 'PUT',
      body: JSON.stringify({
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date().toISOString(),
        status: 'acknowledged'
      })
    });
    
    const index = callAlerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      callAlerts[index] = updated;
    }
    notifyListeners();
    return updated;
  } catch (error) {
    console.error('Failed to acknowledge call alert:', error);
    throw error;
  }
}

/**
 * Update call status (when call ends)
 */
export async function updateCallStatus(alertId, status) {
  try {
    const updated = await fetchApi(`/callAlerts/${alertId}`, {
      method: 'PUT',
      body: JSON.stringify({
        callStatus: status,
        endedAt: status === 'ended' ? new Date().toISOString() : null
      })
    });
    
    const index = callAlerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      callAlerts[index] = updated;
    }
    notifyListeners();
    return updated;
  } catch (error) {
    console.error('Failed to update call status:', error);
    throw error;
  }
}

/**
 * Subscribe to call alert updates
 */
export function subscribeToCallAlerts(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(l => l !== callback);
  };
}

/**
 * Notify all listeners of updates
 */
function notifyListeners() {
  listeners.forEach(callback => callback(callAlerts));
}

/**
 * Get recent call alerts (last 24 hours)
 */
export async function getRecentCallAlerts() {
  const alerts = await getCallAlerts();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return alerts.filter(a => new Date(a.timestamp).getTime() > oneDayAgo);
}

/**
 * Get call statistics
 */
export async function getCallStats() {
  const alerts = await getCallAlerts();
  const today = new Date().toDateString();
  const todayAlerts = alerts.filter(a => new Date(a.timestamp).toDateString() === today);
  
  return {
    total: alerts.length,
    today: todayAlerts.length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    byDriver: alerts.reduce((acc, a) => {
      acc[a.driverId] = (acc[a.driverId] || 0) + 1;
      return acc;
    }, {})
  };
}
