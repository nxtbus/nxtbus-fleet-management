/**
 * Geo Utilities for NxtBus
 * Haversine formula for accurate distance calculation
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate bearing between two points (direction of travel)
 * @returns {number} Bearing in degrees (0-360)
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  let bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Check if bus has passed a stop based on position relative to route direction
 * @param {Object} busPos - {lat, lon} current bus position
 * @param {Object} stopPos - {lat, lon} stop position
 * @param {Object} routeEnd - {lat, lon} route end position
 * @returns {boolean} true if bus has passed the stop
 */
export function hasBusPassedStop(busPos, stopPos, routeEnd) {
  // Calculate distances
  const busToStop = calculateDistance(busPos.lat, busPos.lon, stopPos.lat, stopPos.lon);
  const busToEnd = calculateDistance(busPos.lat, busPos.lon, routeEnd.lat, routeEnd.lon);
  const stopToEnd = calculateDistance(stopPos.lat, stopPos.lon, routeEnd.lat, routeEnd.lon);

  // If bus is closer to end than stop is to end, and bus is very close to or past stop
  // Bus has passed if: bus-to-end < stop-to-end (bus is ahead of stop toward destination)
  // Also check if bus is within threshold distance (150m) to handle edge cases
  const PASSED_THRESHOLD_KM = 0.15; // 150 meters

  if (busToEnd < stopToEnd && busToStop > PASSED_THRESHOLD_KM) {
    return true;
  }

  return false;
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}
