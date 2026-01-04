/**
 * Route Diversion Detection Service
 * Detects when a bus deviates from its predefined route
 * Uses map-matching to keep bus aligned with official route
 */

// Diversion detection configuration
const DIVERSION_CONFIG = {
  DEVIATION_THRESHOLD: 0.08,      // km (80 meters) - distance from route to trigger alert
  PERSISTENCE_DURATION: 60,       // seconds - how long deviation must persist
  MIN_SPEED_THRESHOLD: 5,         // km/h - minimum speed to consider (avoid false alerts when stopped)
  CLEAR_DURATION: 30,             // seconds - how long bus must be back on route to clear alert
  GPS_DRIFT_TOLERANCE: 0.03,      // km (30 meters) - normal GPS drift range
  BUS_STOP_RADIUS: 0.05,          // km (50 meters) - bus stop geo-fence
  ROLLING_WINDOW: 60              // seconds - time window for deviation history
};

// Active diversion alerts
const activeDiversions = new Map();

// Deviation history per bus (for rolling window analysis)
const deviationHistory = new Map();

// Diversion event log (for admin dashboard)
const diversionLog = [];

/**
 * Calculate distance between two GPS points in km (Haversine)
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function pointToLineDistance(pointLat, pointLon, line1Lat, line1Lon, line2Lat, line2Lon) {
  const A = pointLat - line1Lat;
  const B = pointLon - line1Lon;
  const C = line2Lat - line1Lat;
  const D = line2Lon - line1Lon;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let nearestLat, nearestLon;

  if (param < 0) {
    nearestLat = line1Lat;
    nearestLon = line1Lon;
  } else if (param > 1) {
    nearestLat = line2Lat;
    nearestLon = line2Lon;
  } else {
    nearestLat = line1Lat + param * C;
    nearestLon = line1Lon + param * D;
  }

  return {
    distance: calculateDistanceKm(pointLat, pointLon, nearestLat, nearestLon),
    nearestPoint: { lat: nearestLat, lon: nearestLon }
  };
}


/**
 * Build route polyline from route definition
 * Creates ordered array of lat/lon points representing the official route
 */
function buildRoutePolyline(route) {
  if (!route) return [];

  const polyline = [];

  // Start point
  if (route.startLat && route.startLon) {
    polyline.push({
      lat: route.startLat,
      lon: route.startLon,
      name: route.startPoint,
      isStop: true
    });
  }

  // Intermediate stops (sorted by order)
  if (route.stops && route.stops.length > 0) {
    const sortedStops = [...route.stops].sort((a, b) => a.order - b.order);
    sortedStops.forEach(stop => {
      polyline.push({
        lat: stop.lat,
        lon: stop.lon,
        name: stop.name,
        isStop: true
      });
    });
  }

  // End point
  if (route.endLat && route.endLon) {
    polyline.push({
      lat: route.endLat,
      lon: route.endLon,
      name: route.endPoint,
      isStop: true
    });
  }

  return polyline;
}

/**
 * Find nearest point on route polyline (map matching)
 * Returns the snapped position and distance from route
 */
function mapMatchToRoute(gpsLat, gpsLon, routePolyline) {
  if (!routePolyline || routePolyline.length < 2) {
    return { snappedPoint: { lat: gpsLat, lon: gpsLon }, distance: 0, segmentIndex: 0 };
  }

  let minDistance = Infinity;
  let snappedPoint = { lat: gpsLat, lon: gpsLon };
  let nearestSegmentIndex = 0;

  // Check distance to each segment
  for (let i = 0; i < routePolyline.length - 1; i++) {
    const p1 = routePolyline[i];
    const p2 = routePolyline[i + 1];

    const result = pointToLineDistance(gpsLat, gpsLon, p1.lat, p1.lon, p2.lat, p2.lon);

    if (result.distance < minDistance) {
      minDistance = result.distance;
      snappedPoint = result.nearestPoint;
      nearestSegmentIndex = i;
    }
  }

  return {
    snappedPoint,
    distance: minDistance,
    segmentIndex: nearestSegmentIndex,
    segmentStart: routePolyline[nearestSegmentIndex],
    segmentEnd: routePolyline[nearestSegmentIndex + 1]
  };
}

/**
 * Check if GPS point is near a designated bus stop
 */
function isNearBusStop(gpsLat, gpsLon, routePolyline) {
  for (const point of routePolyline) {
    if (point.isStop) {
      const distance = calculateDistanceKm(gpsLat, gpsLon, point.lat, point.lon);
      if (distance <= DIVERSION_CONFIG.BUS_STOP_RADIUS) {
        return point.name;
      }
    }
  }
  return null;
}

/**
 * Calculate speed from GPS data
 */
function calculateSpeed(prevGps, currentGps) {
  if (!prevGps || !currentGps) return null;

  const timeDiff = (currentGps.timestamp - prevGps.timestamp) / 1000;
  if (timeDiff <= 0) return null;

  const distance = calculateDistanceKm(prevGps.lat, prevGps.lon, currentGps.lat, currentGps.lon);
  return (distance / timeDiff) * 3600; // km/h
}


/**
 * Process GPS update for route diversion detection
 * Main entry point - called on every GPS update
 */
export function processGpsForDiversion(busId, currentGps, previousGps, route) {
  if (!currentGps || !route) return null;

  const routePolyline = buildRoutePolyline(route);
  if (routePolyline.length < 2) return null;

  // Map match: find nearest point on official route
  const matchResult = mapMatchToRoute(currentGps.lat, currentGps.lon, routePolyline);
  const deviationDistance = matchResult.distance;

  // Check if at a bus stop - skip diversion detection
  const nearStop = isNearBusStop(currentGps.lat, currentGps.lon, routePolyline);
  if (nearStop) {
    // Clear any existing diversion alert when at stop
    if (activeDiversions.has(busId)) {
      const alert = activeDiversions.get(busId);
      logDiversionEnd(alert);
      activeDiversions.delete(busId);
      return { action: 'CLEARED_AT_STOP', stopName: nearStop };
    }
    return {
      action: 'AT_STOP',
      stopName: nearStop,
      snappedPoint: matchResult.snappedPoint
    };
  }

  // Calculate current speed
  let currentSpeed = null;
  if (currentGps.speed !== null && currentGps.speed !== undefined) {
    currentSpeed = currentGps.speed * 3.6; // m/s to km/h
  } else if (previousGps) {
    currentSpeed = calculateSpeed(previousGps, currentGps);
  }

  // Skip if bus is stopped or moving very slowly
  if (currentSpeed !== null && currentSpeed < DIVERSION_CONFIG.MIN_SPEED_THRESHOLD) {
    return {
      action: 'SLOW_SPEED',
      speed: currentSpeed,
      snappedPoint: matchResult.snappedPoint
    };
  }

  // Update deviation history
  if (!deviationHistory.has(busId)) {
    deviationHistory.set(busId, []);
  }

  const history = deviationHistory.get(busId);
  history.push({
    timestamp: currentGps.timestamp || Date.now(),
    distance: deviationDistance,
    lat: currentGps.lat,
    lon: currentGps.lon,
    speed: currentSpeed
  });

  // Keep only rolling window
  const cutoff = Date.now() - DIVERSION_CONFIG.ROLLING_WINDOW * 1000;
  while (history.length > 0 && history[0].timestamp < cutoff) {
    history.shift();
  }

  // Check if within GPS drift tolerance
  if (deviationDistance <= DIVERSION_CONFIG.GPS_DRIFT_TOLERANCE) {
    // Bus is on route - check if we should clear an existing alert
    return handleOnRoute(busId, matchResult);
  }

  // Check if deviation exceeds threshold
  if (deviationDistance > DIVERSION_CONFIG.DEVIATION_THRESHOLD) {
    return handleOffRoute(busId, route, currentGps, matchResult, history);
  }

  // In between drift tolerance and threshold - monitor
  return {
    action: 'MONITORING',
    deviationDistance: Math.round(deviationDistance * 1000), // meters
    snappedPoint: matchResult.snappedPoint
  };
}

/**
 * Handle when bus is on route
 */
function handleOnRoute(busId, matchResult) {
  const existingAlert = activeDiversions.get(busId);

  if (existingAlert) {
    // Start tracking time back on route
    if (!existingAlert.returnedToRouteAt) {
      existingAlert.returnedToRouteAt = Date.now();
    }

    const onRouteDuration = (Date.now() - existingAlert.returnedToRouteAt) / 1000;

    if (onRouteDuration >= DIVERSION_CONFIG.CLEAR_DURATION) {
      // Clear the diversion alert
      logDiversionEnd(existingAlert);
      activeDiversions.delete(busId);
      return {
        action: 'DIVERSION_CLEARED',
        message: 'Bus has returned to the official route.',
        snappedPoint: matchResult.snappedPoint
      };
    }

    return {
      action: 'RETURNING_TO_ROUTE',
      secondsOnRoute: Math.round(onRouteDuration),
      snappedPoint: matchResult.snappedPoint
    };
  }

  return {
    action: 'ON_ROUTE',
    snappedPoint: matchResult.snappedPoint
  };
}


/**
 * Handle when bus is off route
 */
function handleOffRoute(busId, route, currentGps, matchResult, history) {
  // Check if deviation has persisted long enough
  const persistentDeviations = history.filter(
    h => h.distance > DIVERSION_CONFIG.DEVIATION_THRESHOLD
  );

  if (persistentDeviations.length < 3) {
    // Not enough samples yet
    return {
      action: 'POTENTIAL_DIVERSION',
      deviationDistance: Math.round(matchResult.distance * 1000),
      snappedPoint: matchResult.snappedPoint
    };
  }

  // Check persistence duration
  const firstDeviation = persistentDeviations[0];
  const deviationDuration = (Date.now() - firstDeviation.timestamp) / 1000;

  if (deviationDuration < DIVERSION_CONFIG.PERSISTENCE_DURATION) {
    return {
      action: 'POTENTIAL_DIVERSION',
      deviationDistance: Math.round(matchResult.distance * 1000),
      persistedSeconds: Math.round(deviationDuration),
      requiredSeconds: DIVERSION_CONFIG.PERSISTENCE_DURATION,
      snappedPoint: matchResult.snappedPoint
    };
  }

  // Diversion confirmed!
  const existingAlert = activeDiversions.get(busId);

  if (!existingAlert) {
    // Create new diversion alert
    const alert = {
      id: `DIV_${Date.now()}`,
      type: 'ROUTE_DIVERSION',
      busId,
      routeId: route.id,
      routeName: route.name,
      deviationDistance: Math.round(matchResult.distance * 1000),
      expectedSegment: `${matchResult.segmentStart?.name || 'Unknown'} → ${matchResult.segmentEnd?.name || 'Unknown'}`,
      actualLocation: { lat: currentGps.lat, lon: currentGps.lon },
      snappedPoint: matchResult.snappedPoint,
      message: 'Route diversion detected. Expect delay.',
      detectedAt: new Date().toISOString(),
      startTime: Date.now(),
      lastUpdated: Date.now()
    };

    activeDiversions.set(busId, alert);
    logDiversionStart(alert);

    console.log('Route diversion detected:', alert);
    return { action: 'DIVERSION_DETECTED', alert };
  } else {
    // Update existing alert
    existingAlert.deviationDistance = Math.round(matchResult.distance * 1000);
    existingAlert.actualLocation = { lat: currentGps.lat, lon: currentGps.lon };
    existingAlert.lastUpdated = Date.now();
    existingAlert.returnedToRouteAt = null; // Reset return timer

    return { action: 'DIVERSION_ONGOING', alert: existingAlert };
  }
}

/**
 * Log diversion start event
 */
function logDiversionStart(alert) {
  diversionLog.push({
    id: alert.id,
    busId: alert.busId,
    routeId: alert.routeId,
    routeName: alert.routeName,
    startTime: alert.detectedAt,
    endTime: null,
    duration: null,
    maxDeviation: alert.deviationDistance,
    status: 'ACTIVE'
  });

  // Keep only last 100 events
  if (diversionLog.length > 100) {
    diversionLog.shift();
  }
}

/**
 * Log diversion end event
 */
function logDiversionEnd(alert) {
  const logEntry = diversionLog.find(e => e.id === alert.id);
  if (logEntry) {
    logEntry.endTime = new Date().toISOString();
    logEntry.duration = Math.round((Date.now() - alert.startTime) / 1000);
    logEntry.status = 'RESOLVED';
  }
}

/**
 * Get active diversion for a bus
 */
export function getDiversionForBus(busId) {
  return activeDiversions.get(busId) || null;
}

/**
 * Get all active diversions
 */
export function getAllActiveDiversions() {
  return Array.from(activeDiversions.values());
}

/**
 * Get diversion history log (for admin dashboard)
 */
export function getDiversionLog() {
  return [...diversionLog].reverse(); // Most recent first
}

/**
 * Clear diversion for a bus (when trip ends)
 */
export function clearDiversionForBus(busId) {
  const alert = activeDiversions.get(busId);
  if (alert) {
    logDiversionEnd(alert);
    activeDiversions.delete(busId);
  }
  deviationHistory.delete(busId);
}

/**
 * Get snapped position for display (map matching result)
 */
export function getSnappedPosition(busId, gpsLat, gpsLon, route) {
  const routePolyline = buildRoutePolyline(route);
  if (routePolyline.length < 2) {
    return { lat: gpsLat, lon: gpsLon };
  }

  const matchResult = mapMatchToRoute(gpsLat, gpsLon, routePolyline);

  // Only snap if within reasonable distance (avoid snapping when truly off-route)
  if (matchResult.distance <= DIVERSION_CONFIG.DEVIATION_THRESHOLD) {
    return matchResult.snappedPoint;
  }

  return { lat: gpsLat, lon: gpsLon };
}

export default {
  processGpsForDiversion,
  getDiversionForBus,
  getAllActiveDiversions,
  getDiversionLog,
  clearDiversionForBus,
  getSnappedPosition,
  DIVERSION_CONFIG
};
