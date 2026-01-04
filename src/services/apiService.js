/**
 * API Service for NxtBus
 * Communicates with backend server to store data in JSON files
 */

// For mobile app: use your computer's IP when on same network
// Change this IP to your computer's IP address
const NETWORK_IP = '10.77.155.222';

// Auto-detect: use localhost for web browser, network IP for mobile app
const getHost = () => {
  // If running in Capacitor (mobile app), use network IP
  if (window.Capacitor?.isNativePlatform()) {
    return NETWORK_IP;
  }
  // If accessing from browser on same network
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.hostname;
  }
  // Default to localhost for local development
  return 'localhost';
};

// Production API configuration
const getAPIBase = () => {
  // Production: use Render backend URL
  if (process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost') {
    return 'https://nxtbus-backend.onrender.com/api';
  }
  
  // Development: use localhost with auto-detection
  const HOST = getHost();
  return `http://${HOST}:3001/api`;
};

const API_BASE = getAPIBase();

console.log('🔧 API Configuration:', {
  isCapacitor: window.Capacitor?.isNativePlatform(),
  hostname: window.location.hostname,
  API_BASE
});

// ============ GENERIC API HELPERS ============

async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  console.log('🌐 API Call:', url, options);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });
    
    console.log('📡 API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      // Try to get error details from response
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map(err => err.msg).join(', ');
        }
      } catch (e) {
        // If we can't parse the error response, use the default message
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    console.log('✅ API Success:', endpoint, data);
    return data;
  } catch (error) {
    console.error('❌ API Error:', endpoint, error);
    
    // Provide user-friendly error messages
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error('Backend server is not available. Please check if the server is running.');
    } else if (error.message.includes('CORS')) {
      throw new Error('CORS error: The server is not configured to accept requests from this domain.');
    } else {
      throw error;
    }
  }
}

async function getAll(collection) {
  return fetchApi(`/${collection}`);
}

async function getById(collection, id) {
  return fetchApi(`/${collection}/${id}`);
}

async function create(collection, data) {
  return fetchApi(`/${collection}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function update(collection, id, data) {
  return fetchApi(`/${collection}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

async function remove(collection, id) {
  return fetchApi(`/${collection}/${id}`, {
    method: 'DELETE',
  });
}

// ============ BUSES ============

export async function getBuses() {
  return getAll('buses');
}

export async function getBusById(id) {
  return getById('buses', id);
}

export async function addBus(busData) {
  return create('buses', {
    ...busData,
    createdAt: new Date().toISOString().split('T')[0],
    assignedDrivers: busData.assignedDrivers || [],
    assignedRoutes: busData.assignedRoutes || []
  });
}

export async function updateBus(id, updates) {
  return update('buses', id, updates);
}

export async function deleteBus(id) {
  return remove('buses', id);
}

// ============ ROUTES ============

export async function getRoutes() {
  return getAll('routes');
}

export async function getRouteById(id) {
  return getById('routes', id);
}

export async function addRoute(routeData) {
  return create('routes', {
    ...routeData,
    status: 'active',
    stops: routeData.stops || []
  });
}

export async function updateRoute(id, updates) {
  return update('routes', id, updates);
}

export async function deleteRoute(id) {
  return remove('routes', id);
}

// ============ DRIVERS ============

export async function getDrivers() {
  return getAll('drivers');
}

export async function getDriverById(id) {
  return getById('drivers', id);
}

export async function getDriverByPhone(phone) {
  const drivers = await getAll('drivers');
  return drivers.find(d => d.phone === phone);
}

export async function authenticateDriver(phone, pin) {
  try {
    const response = await fetchApi('/auth/driver/login', {
      method: 'POST',
      body: JSON.stringify({ phone, pin })
    });
    
    if (response.success) {
      return response.driver;
    }
    return null;
  } catch (error) {
    console.error('Driver authentication error:', error);
    return null;
  }
}

export async function addDriver(driverData) {
  return create('drivers', {
    ...driverData,
    status: 'active',
    assignedBuses: driverData.assignedBuses || []
  });
}

export async function updateDriver(id, updates) {
  return update('drivers', id, updates);
}

export async function deleteDriver(id) {
  return remove('drivers', id);
}

// ============ SCHEDULES ============

export async function getSchedules() {
  return getAll('schedules');
}

export async function addSchedule(scheduleData) {
  return create('schedules', {
    ...scheduleData,
    createdAt: new Date().toISOString()
  });
}

export async function updateSchedule(id, updates) {
  return update('schedules', id, updates);
}

export async function deleteSchedule(id) {
  return remove('schedules', id);
}

export async function getActiveSchedules() {
  const schedules = await getAll('schedules');
  const now = new Date();
  const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);
  
  return schedules.filter(s => {
    if (s.status !== 'active' || !s.days.includes(currentDay)) return false;
    
    // Handle overnight schedules
    if (s.endTime < s.startTime) {
      return currentTime >= s.startTime || currentTime <= s.endTime;
    }
    return currentTime >= s.startTime && currentTime <= s.endTime;
  });
}

// ============ ACTIVE TRIPS ============

export async function getActiveTrips() {
  const trips = await getAll('activeTrips');
  const now = Date.now();
  // Filter out stale trips (no update in last 10 minutes)
  // This ensures only actively running trips are shown
  const freshTrips = trips.filter(t => {
    const age = now - t.lastUpdate;
    const isFresh = age < 10 * 60 * 1000;
    if (!isFresh) {
      console.log('Stale trip filtered:', t.busNumber, 'age:', Math.round(age/1000), 'seconds');
    }
    return isFresh;
  });
  return freshTrips;
}

export async function startTrip(tripData) {
  const trips = await getAll('activeTrips');
  
  // Check if there's already an active trip for this bus
  const existingTrip = trips.find(t => t.busId === tripData.busId);
  if (existingTrip) {
    // Return existing trip instead of creating duplicate
    return existingTrip;
  }
  
  return create('activeTrips', {
    ...tripData,
    tripId: tripData.tripId || `TRIP_${Date.now()}`,
    startTime: new Date().toISOString(),
    lastUpdate: Date.now()
  });
}

export async function updateTripGps(tripId, gpsData) {
  const trips = await getAll('activeTrips');
  const trip = trips.find(t => t.tripId === tripId);
  if (trip) {
    return update('activeTrips', trip.id, {
      previousGps: trip.currentGps,
      currentGps: gpsData,
      lastUpdate: Date.now()
    });
  }
  return null;
}

export async function endTrip(tripId) {
  const trips = await getAll('activeTrips');
  const trip = trips.find(t => t.tripId === tripId);
  if (trip) {
    await remove('activeTrips', trip.id);
  }
  return trip;
}

// ============ DELAYS ============

export async function getDelays() {
  return getAll('delays');
}

export async function getActiveDelays() {
  const delays = await getAll('delays');
  return delays.filter(d => d.status === 'active');
}

export async function addDelay(delayData) {
  return create('delays', {
    ...delayData,
    status: 'active',
    reportedAt: new Date().toISOString()
  });
}

export async function updateDelayStatus(id, status) {
  return update('delays', id, { status });
}

export async function deleteDelay(id) {
  return remove('delays', id);
}

// ============ NOTIFICATIONS ============

export async function getNotifications() {
  const notifications = await getAll('notifications');
  return notifications.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
}

export async function addNotification(notifData) {
  return create('notifications', {
    ...notifData,
    sentAt: new Date().toISOString(),
    sentBy: 'Admin'
  });
}

export async function deleteNotification(id) {
  return remove('notifications', id);
}

// ============ FEEDBACKS ============

export async function getFeedbacks(filters = {}) {
  let feedbacks = await getAll('feedbacks');
  
  if (filters.category) feedbacks = feedbacks.filter(f => f.category === filters.category);
  if (filters.status) feedbacks = feedbacks.filter(f => f.status === filters.status);
  if (filters.busNumber) feedbacks = feedbacks.filter(f => f.busNumber === filters.busNumber);
  
  return feedbacks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export async function addFeedback(feedbackData) {
  return create('feedbacks', {
    ...feedbackData,
    status: 'pending',
    timestamp: new Date().toISOString()
  });
}

export async function updateFeedbackStatus(id, status) {
  return update('feedbacks', id, { status });
}

// ============ DASHBOARD ============

export async function getDashboardStats() {
  const [buses, routes, delays, feedbacks, drivers, activeTrips] = await Promise.all([
    getAll('buses'),
    getAll('routes'),
    getAll('delays'),
    getAll('feedbacks'),
    getAll('drivers'),
    getActiveTrips()
  ]);
  
  return {
    totalBuses: buses.length,
    activeBuses: buses.filter(b => b.status === 'active').length,
    totalRoutes: routes.length,
    activeDelays: delays.filter(d => d.status === 'active').length,
    pendingFeedback: feedbacks.filter(f => f.status === 'pending').length,
    totalDrivers: drivers.length,
    activeTrips: activeTrips.length
  };
}

// ============ LOCATIONS ============

export async function getLocations() {
  const [routes, schedules] = await Promise.all([
    getAll('routes'),
    getAll('schedules')
  ]);
  
  // Get route IDs that have active schedules
  const scheduledRouteIds = new Set(
    schedules
      .filter(s => s.status === 'active')
      .map(s => s.routeId)
  );
  
  // Only include routes that have schedules assigned
  const scheduledRoutes = routes.filter(r => scheduledRouteIds.has(r.id));
  
  const locationMap = new Map();
  
  scheduledRoutes.forEach(route => {
    // Add start point as a location
    if (route.startPoint && route.startLat && route.startLon) {
      if (!locationMap.has(route.startPoint)) {
        locationMap.set(route.startPoint, { 
          name: route.startPoint, 
          lat: route.startLat, 
          lon: route.startLon,
          isStartPoint: true,
          estimatedTime: 0
        });
      }
    }
    
    // Add intermediate stops
    (route.stops || []).forEach(stop => {
      if (!locationMap.has(stop.name)) {
        locationMap.set(stop.name, { 
          name: stop.name, 
          lat: stop.lat, 
          lon: stop.lon,
          estimatedTime: stop.estimatedTime || 0
        });
      }
    });
    
    // Add end point as a location
    if (route.endPoint && route.endLat && route.endLon) {
      if (!locationMap.has(route.endPoint)) {
        locationMap.set(route.endPoint, { 
          name: route.endPoint, 
          lat: route.endLat, 
          lon: route.endLon,
          isEndPoint: true,
          estimatedTime: route.estimatedDuration || 60
        });
      }
    }
  });
  
  return Array.from(locationMap.values());
}

// ============ RESET ============

export async function resetAllData() {
  return fetchApi('/reset', { method: 'POST' });
}

// ============ CHECK SERVER ============

export async function checkServerHealth() {
  try {
    await fetchApi('');
    return true;
  } catch {
    return false;
  }
}
