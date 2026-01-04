/**
 * Delay Detection Service
 * Automatically detects bus delays and sends notifications to passengers and admins
 */

import { dataStore } from './sharedDataService';

// Delay detection configuration
const DELAY_CONFIG = {
  SCHEDULE_TOLERANCE: 5,        // minutes - grace period before marking as delayed
  SIGNIFICANT_DELAY: 10,        // minutes - threshold for sending notifications
  CHECK_INTERVAL: 60000,        // ms - how often to check for delays (1 minute)
  SPEED_DELAY_THRESHOLD: 5,     // km/h - if avg speed below this, likely delayed
  ETA_DELAY_THRESHOLD: 10       // minutes - if ETA exceeds schedule by this much
};

// Track notified delays to avoid duplicate notifications
const notifiedDelays = new Map();

// Delay listeners (for real-time UI updates)
const delayListeners = new Set();

/**
 * Calculate expected position based on schedule
 */
function calculateExpectedProgress(schedule, route) {
  if (!schedule || !route) return null;
  
  const now = new Date();
  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);
  
  const scheduleStart = new Date();
  scheduleStart.setHours(startHour, startMin, 0, 0);
  
  const scheduleEnd = new Date();
  scheduleEnd.setHours(endHour, endMin, 0, 0);
  
  // If before start time, no delay yet
  if (now < scheduleStart) return { status: 'not_started', progress: 0 };
  
  // If after end time, should be completed
  if (now > scheduleEnd) return { status: 'should_be_complete', progress: 100 };
  
  // Calculate expected progress percentage
  const totalDuration = scheduleEnd - scheduleStart;
  const elapsed = now - scheduleStart;
  const expectedProgress = (elapsed / totalDuration) * 100;
  
  return {
    status: 'in_progress',
    progress: Math.min(expectedProgress, 100),
    elapsedMinutes: Math.floor(elapsed / 60000),
    remainingMinutes: Math.floor((scheduleEnd - now) / 60000)
  };
}

/**
 * Calculate actual bus progress along route
 */
function calculateActualProgress(trip, route) {
  if (!trip?.currentGps || !route) return 0;
  
  const totalDistance = calculateRouteDistance(route);
  if (totalDistance === 0) return 0;
  
  // Distance from start to current position
  const distanceFromStart = haversineDistance(
    route.startLat, route.startLon,
    trip.currentGps.lat, trip.currentGps.lon
  );
  
  return Math.min((distanceFromStart / totalDistance) * 100, 100);
}

/**
 * Calculate total route distance
 */
function calculateRouteDistance(route) {
  if (!route) return 0;
  
  let total = 0;
  const points = [
    { lat: route.startLat, lon: route.startLon },
    ...(route.stops || []).sort((a, b) => a.order - b.order),
    { lat: route.endLat, lon: route.endLon }
  ];
  
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(
      points[i-1].lat, points[i-1].lon,
      points[i].lat, points[i].lon
    );
  }
  
  return total;
}

/**
 * Haversine distance calculation
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}


/**
 * Detect delay for a specific trip
 */
export function detectTripDelay(trip, schedule, route) {
  if (!trip || !schedule || !route) return null;
  
  const expected = calculateExpectedProgress(schedule, route);
  if (!expected || expected.status === 'not_started') return null;
  
  const actualProgress = calculateActualProgress(trip, route);
  const progressDiff = expected.progress - actualProgress;
  
  // Calculate delay in minutes based on progress difference
  const totalDuration = route.estimatedDuration || 60;
  const delayMinutes = Math.round((progressDiff / 100) * totalDuration);
  
  // Check if delay exceeds threshold
  if (delayMinutes >= DELAY_CONFIG.SCHEDULE_TOLERANCE) {
    return {
      tripId: trip.tripId,
      busId: trip.busId,
      busNumber: trip.busNumber,
      routeId: route.id,
      routeName: route.name,
      scheduleId: schedule.id,
      delayMinutes,
      expectedProgress: Math.round(expected.progress),
      actualProgress: Math.round(actualProgress),
      severity: delayMinutes >= DELAY_CONFIG.SIGNIFICANT_DELAY ? 'HIGH' : 'LOW',
      detectedAt: new Date().toISOString(),
      reason: 'Schedule deviation detected'
    };
  }
  
  return null;
}

/**
 * Process GPS update for delay detection
 * Called from tripService when GPS updates
 */
export async function processGpsForDelay(busId, tripId, currentGps, previousGps, route, schedule) {
  if (!currentGps || !route) return null;
  
  // Calculate current speed
  let currentSpeed = null;
  if (currentGps.speed !== null && currentGps.speed !== undefined) {
    currentSpeed = currentGps.speed * 3.6; // m/s to km/h
  } else if (previousGps) {
    const timeDiff = (currentGps.timestamp - previousGps.timestamp) / 1000;
    if (timeDiff > 0) {
      const distance = haversineDistance(
        previousGps.lat, previousGps.lon,
        currentGps.lat, currentGps.lon
      );
      currentSpeed = (distance / timeDiff) * 3600;
    }
  }
  
  // Check for speed-based delay (very slow movement)
  if (currentSpeed !== null && currentSpeed < DELAY_CONFIG.SPEED_DELAY_THRESHOLD) {
    // Bus is moving very slowly - potential delay
    // This will be combined with schedule-based detection
  }
  
  // Get trip and schedule info for full delay detection
  try {
    const trips = await dataStore.getActiveTrips();
    const trip = trips.find(t => t.tripId === tripId);
    
    if (trip && schedule) {
      const delay = detectTripDelay(trip, schedule, route);
      if (delay && delay.severity === 'HIGH') {
        await handleDelayDetected(delay);
        return delay;
      }
    }
  } catch (error) {
    console.error('Error in delay detection:', error);
  }
  
  return null;
}

/**
 * Handle detected delay - create notification
 */
async function handleDelayDetected(delay) {
  const delayKey = `${delay.busId}_${delay.scheduleId}`;
  const lastNotified = notifiedDelays.get(delayKey);
  
  // Don't send duplicate notifications within 5 minutes
  if (lastNotified && (Date.now() - lastNotified) < 5 * 60 * 1000) {
    return;
  }
  
  try {
    // Create delay record
    await dataStore.addDelay({
      busId: delay.busId,
      busNumber: delay.busNumber,
      routeId: delay.routeId,
      reason: `Running ${delay.delayMinutes} minutes behind schedule`,
      delayMinutes: delay.delayMinutes,
      status: 'active',
      autoDetected: true
    });
    
    // Create notification for passengers and admin
    await dataStore.addNotification({
      type: 'delay',
      title: `🚌 Bus ${delay.busNumber} Delayed`,
      message: `Bus ${delay.busNumber} on route "${delay.routeName}" is running approximately ${delay.delayMinutes} minutes behind schedule.`,
      targetRoutes: [delay.routeId],
      busId: delay.busId,
      delayMinutes: delay.delayMinutes,
      severity: delay.severity,
      autoGenerated: true,
      sentBy: 'System'
    });
    
    // Mark as notified
    notifiedDelays.set(delayKey, Date.now());
    
    // Notify listeners
    notifyDelayListeners({
      type: 'DELAY_DETECTED',
      delay
    });
    
    console.log('Delay notification sent:', delay);
  } catch (error) {
    console.error('Error handling delay:', error);
  }
}

/**
 * Check all active trips for delays
 * Can be called periodically
 */
export async function checkAllTripsForDelays() {
  try {
    const [trips, schedules, routes] = await Promise.all([
      dataStore.getActiveTrips(),
      dataStore.getSchedules(),
      dataStore.getRoutes()
    ]);
    
    const delays = [];
    
    for (const trip of trips) {
      // Find matching schedule
      const schedule = schedules.find(s => 
        s.busId === trip.busId && 
        s.routeId === trip.routeId &&
        s.status === 'active'
      );
      
      if (!schedule) continue;
      
      // Find route
      const route = routes.find(r => r.id === trip.routeId);
      if (!route) continue;
      
      const delay = detectTripDelay(trip, schedule, route);
      if (delay) {
        delays.push(delay);
        if (delay.severity === 'HIGH') {
          await handleDelayDetected(delay);
        }
      }
    }
    
    return delays;
  } catch (error) {
    console.error('Error checking trips for delays:', error);
    return [];
  }
}

/**
 * Get current delays for a specific route
 */
export async function getDelaysForRoute(routeId) {
  try {
    const delays = await dataStore.getActiveDelays();
    return delays.filter(d => d.routeId === routeId);
  } catch (error) {
    console.error('Error getting delays for route:', error);
    return [];
  }
}

/**
 * Get current delays for a specific bus
 */
export async function getDelaysForBus(busId) {
  try {
    const delays = await dataStore.getActiveDelays();
    return delays.filter(d => d.busId === busId);
  } catch (error) {
    console.error('Error getting delays for bus:', error);
    return [];
  }
}

/**
 * Subscribe to delay events
 */
export function subscribeToDelays(callback) {
  delayListeners.add(callback);
  return () => delayListeners.delete(callback);
}

/**
 * Notify all delay listeners
 */
function notifyDelayListeners(event) {
  delayListeners.forEach(cb => {
    try {
      cb(event);
    } catch (error) {
      console.error('Error in delay listener:', error);
    }
  });
}

/**
 * Clear notified delays cache (for testing)
 */
export function clearNotifiedDelays() {
  notifiedDelays.clear();
}

export default {
  detectTripDelay,
  processGpsForDelay,
  checkAllTripsForDelays,
  getDelaysForRoute,
  getDelaysForBus,
  subscribeToDelays,
  clearNotifiedDelays,
  DELAY_CONFIG
};
