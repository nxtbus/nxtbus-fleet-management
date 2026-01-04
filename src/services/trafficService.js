/**
 * Traffic Detection Service
 * Detects traffic congestion based on bus GPS speed data
 */

// Traffic detection thresholds
const TRAFFIC_CONFIG = {
  LOW_SPEED_THRESHOLD: 10,      // km/h - below this is potential traffic
  MEDIUM_SPEED_THRESHOLD: 5,    // km/h - below this is medium congestion
  HIGH_SPEED_THRESHOLD: 2,      // km/h - below this is severe congestion
  DETECTION_DURATION: 30,       // seconds - how long slow speed must persist
  CLEAR_DURATION: 60,           // seconds - how long normal speed must persist to clear
  NORMAL_SPEED_THRESHOLD: 15,   // km/h - above this is normal traffic
  MIN_SAMPLES: 3,               // minimum GPS samples needed for detection
  BUS_STOP_RADIUS: 0.05         // km (50 meters) - radius to consider "at a bus stop"
};

// Severity levels
export const TrafficSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM', 
  HIGH: 'HIGH'
};

// Active traffic alerts (in-memory store)
const activeAlerts = new Map();

// Speed history per bus
const busSpeedHistory = new Map();

/**
 * Calculate speed between two GPS points
 */
function calculateSpeed(prevGps, currentGps) {
  if (!prevGps || !currentGps) return null;
  
  const timeDiff = (currentGps.timestamp - prevGps.timestamp) / 1000; // seconds
  if (timeDiff <= 0) return null;
  
  // Haversine distance
  const R = 6371; // Earth's radius in km
  const dLat = (currentGps.lat - prevGps.lat) * Math.PI / 180;
  const dLon = (currentGps.lon - prevGps.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(prevGps.lat * Math.PI / 180) * Math.cos(currentGps.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // km
  
  const speedKmh = (distance / timeDiff) * 3600;
  return speedKmh;
}

/**
 * Find nearest route segment for a GPS point
 */
function findNearestSegment(gps, route) {
  if (!route || !route.stops || route.stops.length === 0) {
    return { segmentId: 'ROUTE_START', segmentName: route?.startPoint || 'Unknown' };
  }
  
  const allPoints = [
    { name: route.startPoint, lat: route.startLat, lon: route.startLon, order: 0 },
    ...route.stops.map(s => ({ name: s.name, lat: s.lat, lon: s.lon, order: s.order })),
    { name: route.endPoint, lat: route.endLat, lon: route.endLon, order: 999 }
  ].sort((a, b) => a.order - b.order);
  
  let minDist = Infinity;
  let nearestSegment = null;
  
  for (let i = 0; i < allPoints.length - 1; i++) {
    const p1 = allPoints[i];
    const p2 = allPoints[i + 1];
    
    // Distance from point to line segment
    const dist = pointToSegmentDistance(gps, p1, p2);
    if (dist < minDist) {
      minDist = dist;
      nearestSegment = {
        segmentId: `${p1.name}_TO_${p2.name}`,
        segmentName: `${p1.name} → ${p2.name}`,
        fromStop: p1,
        toStop: p2
      };
    }
  }
  
  return nearestSegment || { segmentId: 'UNKNOWN', segmentName: 'Unknown Segment' };
}

/**
 * Calculate distance from point to line segment
 */
function pointToSegmentDistance(point, segStart, segEnd) {
  const R = 6371; // km
  
  // Simple approximation: distance to midpoint of segment
  const midLat = (segStart.lat + segEnd.lat) / 2;
  const midLon = (segStart.lon + segEnd.lon) / 2;
  
  const dLat = (point.lat - midLat) * Math.PI / 180;
  const dLon = (point.lon - midLon) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point.lat * Math.PI / 180) * Math.cos(midLat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

/**
 * Calculate distance between two GPS points in km
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Check if bus is near a designated bus stop
 * Returns the stop name if within radius, null otherwise
 */
function isNearBusStop(gps, route) {
  if (!route) return null;
  
  // Collect all designated stops (start, intermediate stops, end)
  const allStops = [];
  
  // Start point
  if (route.startLat && route.startLon) {
    allStops.push({ name: route.startPoint, lat: route.startLat, lon: route.startLon });
  }
  
  // Intermediate stops
  if (route.stops && route.stops.length > 0) {
    route.stops.forEach(stop => {
      allStops.push({ name: stop.name, lat: stop.lat, lon: stop.lon });
    });
  }
  
  // End point
  if (route.endLat && route.endLon) {
    allStops.push({ name: route.endPoint, lat: route.endLat, lon: route.endLon });
  }
  
  // Check distance to each stop
  for (const stop of allStops) {
    const distance = calculateDistanceKm(gps.lat, gps.lon, stop.lat, stop.lon);
    if (distance <= TRAFFIC_CONFIG.BUS_STOP_RADIUS) {
      return stop.name;
    }
  }
  
  return null;
}

/**
 * Determine traffic severity based on speed
 */
function getSeverity(avgSpeed) {
  if (avgSpeed <= TRAFFIC_CONFIG.HIGH_SPEED_THRESHOLD) return TrafficSeverity.HIGH;
  if (avgSpeed <= TRAFFIC_CONFIG.MEDIUM_SPEED_THRESHOLD) return TrafficSeverity.MEDIUM;
  if (avgSpeed <= TRAFFIC_CONFIG.LOW_SPEED_THRESHOLD) return TrafficSeverity.LOW;
  return null;
}

/**
 * Generate traffic message based on severity
 */
function getTrafficMessage(severity, segmentName) {
  switch (severity) {
    case TrafficSeverity.HIGH:
      return `Heavy traffic congestion near ${segmentName}. Expect significant delays.`;
    case TrafficSeverity.MEDIUM:
      return `Moderate traffic near ${segmentName}. Some delays expected.`;
    case TrafficSeverity.LOW:
      return `Slow moving traffic near ${segmentName}.`;
    default:
      return `Traffic detected near ${segmentName}.`;
  }
}

/**
 * Process GPS update and detect traffic
 * Called whenever a bus GPS is updated
 */
export function processGpsForTraffic(busId, currentGps, previousGps, route) {
  if (!currentGps || !route) return null;
  
  // Check if bus is at a designated stop - skip traffic detection
  const nearStop = isNearBusStop(currentGps, route);
  if (nearStop) {
    console.log(`Bus ${busId} is at stop "${nearStop}" - skipping traffic detection`);
    // Clear any existing alert for this bus since it's at a stop
    const alertKey = `${busId}_${findNearestSegment(currentGps, route).segmentId}`;
    if (activeAlerts.has(alertKey)) {
      activeAlerts.delete(alertKey);
      return { action: 'CLEARED_AT_STOP', stopName: nearStop };
    }
    return null;
  }
  
  // Calculate current speed
  let currentSpeed = null;
  if (previousGps) {
    currentSpeed = calculateSpeed(previousGps, currentGps);
  }
  
  // Use GPS-reported speed if available
  if (currentGps.speed !== null && currentGps.speed !== undefined) {
    currentSpeed = currentGps.speed * 3.6; // Convert m/s to km/h
  }
  
  if (currentSpeed === null) return null;
  
  // Update speed history
  if (!busSpeedHistory.has(busId)) {
    busSpeedHistory.set(busId, []);
  }
  
  const history = busSpeedHistory.get(busId);
  history.push({
    speed: currentSpeed,
    timestamp: currentGps.timestamp,
    lat: currentGps.lat,
    lon: currentGps.lon
  });
  
  // Keep only last 60 seconds of data
  const cutoff = Date.now() - 60000;
  while (history.length > 0 && history[0].timestamp < cutoff) {
    history.shift();
  }
  
  // Need minimum samples for detection
  if (history.length < TRAFFIC_CONFIG.MIN_SAMPLES) return null;
  
  // Calculate average speed over detection window
  const detectionWindow = history.filter(h => 
    h.timestamp > Date.now() - TRAFFIC_CONFIG.DETECTION_DURATION * 1000
  );
  
  if (detectionWindow.length < TRAFFIC_CONFIG.MIN_SAMPLES) return null;
  
  const avgSpeed = detectionWindow.reduce((sum, h) => sum + h.speed, 0) / detectionWindow.length;
  
  // Find which segment the bus is on
  const segment = findNearestSegment(currentGps, route);
  const alertKey = `${busId}_${segment.segmentId}`;
  
  // Check for traffic condition
  const severity = getSeverity(avgSpeed);
  
  if (severity) {
    // Traffic detected
    const existingAlert = activeAlerts.get(alertKey);
    
    if (!existingAlert) {
      // Create new alert
      const alert = {
        id: `TRAFFIC_${Date.now()}`,
        type: 'TRAFFIC',
        busId,
        routeId: route.id,
        segmentId: segment.segmentId,
        segmentName: segment.segmentName,
        fromStop: segment.fromStop,
        toStop: segment.toStop,
        severity,
        avgSpeed: Math.round(avgSpeed * 10) / 10,
        message: getTrafficMessage(severity, segment.segmentName),
        detectedAt: new Date().toISOString(),
        lastUpdated: Date.now(),
        gps: { lat: currentGps.lat, lon: currentGps.lon }
      };
      
      activeAlerts.set(alertKey, alert);
      console.log('Traffic alert created:', alert);
      return { action: 'CREATED', alert };
    } else {
      // Update existing alert
      existingAlert.severity = severity;
      existingAlert.avgSpeed = Math.round(avgSpeed * 10) / 10;
      existingAlert.message = getTrafficMessage(severity, segment.segmentName);
      existingAlert.lastUpdated = Date.now();
      existingAlert.gps = { lat: currentGps.lat, lon: currentGps.lon };
      existingAlert.normalSpeedStart = null; // Reset clear timer
      
      return { action: 'UPDATED', alert: existingAlert };
    }
  } else {
    // Speed is normal - check if we should clear an existing alert
    const existingAlert = activeAlerts.get(alertKey);
    
    if (existingAlert) {
      if (!existingAlert.normalSpeedStart) {
        existingAlert.normalSpeedStart = Date.now();
      }
      
      const normalDuration = (Date.now() - existingAlert.normalSpeedStart) / 1000;
      
      if (normalDuration >= TRAFFIC_CONFIG.CLEAR_DURATION) {
        // Clear the alert
        activeAlerts.delete(alertKey);
        console.log('Traffic alert cleared:', alertKey);
        return { action: 'CLEARED', alertId: existingAlert.id };
      }
    }
  }
  
  return null;
}

/**
 * Get all active traffic alerts
 */
export function getAllTrafficAlerts() {
  return Array.from(activeAlerts.values());
}

/**
 * Get traffic alerts for a specific bus
 */
export function getTrafficAlertsForBus(busId) {
  return Array.from(activeAlerts.values()).filter(a => a.busId === busId);
}

/**
 * Get traffic alerts for a specific route
 */
export function getTrafficAlertsForRoute(routeId) {
  return Array.from(activeAlerts.values()).filter(a => a.routeId === routeId);
}

/**
 * Get traffic alerts relevant to a passenger
 * (for buses they're tracking or routes they're viewing)
 */
export function getTrafficAlertsForPassenger(busIds = [], routeIds = []) {
  return Array.from(activeAlerts.values()).filter(a => 
    busIds.includes(a.busId) || routeIds.includes(a.routeId)
  );
}

/**
 * Clear all alerts for a bus (when trip ends)
 */
export function clearAlertsForBus(busId) {
  const keysToDelete = [];
  activeAlerts.forEach((alert, key) => {
    if (alert.busId === busId) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => activeAlerts.delete(key));
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity) {
  switch (severity) {
    case TrafficSeverity.HIGH: return '#D32F2F';
    case TrafficSeverity.MEDIUM: return '#FF9800';
    case TrafficSeverity.LOW: return '#FFC107';
    default: return '#9E9E9E';
  }
}

/**
 * Get severity icon for UI
 */
export function getSeverityIcon(severity) {
  switch (severity) {
    case TrafficSeverity.HIGH: return '🔴';
    case TrafficSeverity.MEDIUM: return '🟠';
    case TrafficSeverity.LOW: return '🟡';
    default: return '⚪';
  }
}

export default {
  processGpsForTraffic,
  getAllTrafficAlerts,
  getTrafficAlertsForBus,
  getTrafficAlertsForRoute,
  getTrafficAlertsForPassenger,
  clearAlertsForBus,
  getSeverityColor,
  getSeverityIcon,
  TrafficSeverity
};
