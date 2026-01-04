/**
 * ETA Calculator for NxtBus
 * Dynamic speed-based ETA calculation without stop timing data
 */

import { calculateDistance } from './geoUtils';

// Speed blending weights
const LIVE_SPEED_WEIGHT = 0.7;
const AVG_SPEED_WEIGHT = 0.3;

// Realistic city bus speed limits (km/h)
const MIN_SPEED_KMH = 5;
const MAX_CITY_BUS_SPEED_KMH = 35;  // Realistic max for city bus with stops
const DEFAULT_CITY_BUS_SPEED_KMH = 20; // Average city bus speed including stops

/**
 * Calculate average route speed from trip data
 * @param {Object} route - Route with start/end coords and times
 * @returns {number} Average speed in km/h
 */
export function calculateAverageRouteSpeed(route) {
  const { startLat, startLon, endLat, endLon, estimatedDuration } = route;

  // Calculate total route distance
  const totalDistanceKm = calculateDistance(startLat, startLon, endLat, endLon);

  // Use estimatedDuration from route (in minutes) if available
  if (estimatedDuration && estimatedDuration > 0) {
    const durationHours = estimatedDuration / 60;
    const avgSpeed = totalDistanceKm / durationHours;
    // Cap at realistic city bus speed
    return Math.min(Math.max(avgSpeed, MIN_SPEED_KMH), MAX_CITY_BUS_SPEED_KMH);
  }

  // Fallback: use default city bus speed
  return DEFAULT_CITY_BUS_SPEED_KMH;
}

/**
 * Calculate live speed from consecutive GPS updates
 * @param {Object} prevGps - Previous GPS reading {lat, lon, timestamp}
 * @param {Object} currentGps - Current GPS reading {lat, lon, timestamp}
 * @returns {number|null} Live speed in km/h, or null if unavailable
 */
export function calculateLiveSpeed(prevGps, currentGps) {
  if (!prevGps || !currentGps) {
    return null;
  }

  const distance = calculateDistance(
    prevGps.lat, prevGps.lon,
    currentGps.lat, currentGps.lon
  );

  const timeDiffHours = (currentGps.timestamp - prevGps.timestamp) / (1000 * 60 * 60);

  if (timeDiffHours <= 0) {
    return null;
  }

  const speed = distance / timeDiffHours;

  // Sanity check: cap at realistic city bus speed
  if (speed > MAX_CITY_BUS_SPEED_KMH) {
    return MAX_CITY_BUS_SPEED_KMH;
  }

  return speed;
}

/**
 * Calculate blended speed using live and average speeds
 * Formula: final_speed = 70% live + 30% average
 * Falls back to average if live unavailable
 * @param {number|null} liveSpeed - Current live speed in km/h
 * @param {number} avgSpeed - Average route speed in km/h
 * @returns {number} Blended speed in km/h
 */
export function calculateBlendedSpeed(liveSpeed, avgSpeed) {
  if (liveSpeed === null || liveSpeed < MIN_SPEED_KMH) {
    // Fallback to average speed (capped at realistic max)
    return Math.min(Math.max(avgSpeed, MIN_SPEED_KMH), MAX_CITY_BUS_SPEED_KMH);
  }

  // Blend: 70% live + 30% average
  const blended = (LIVE_SPEED_WEIGHT * liveSpeed) + (AVG_SPEED_WEIGHT * avgSpeed);

  // Cap at realistic city bus speed
  return Math.min(Math.max(blended, MIN_SPEED_KMH), MAX_CITY_BUS_SPEED_KMH);
}

/**
 * Calculate ETA from distance and speed
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} speedKmh - Speed in km/h
 * @returns {Object} ETA details {minutes, arrivalTime}
 */
export function calculateETA(distanceKm, speedKmh) {
  const safeSpeed = Math.max(speedKmh, MIN_SPEED_KMH);

  // Time = Distance / Speed (in hours)
  const timeHours = distanceKm / safeSpeed;
  const timeMinutes = Math.round(timeHours * 60);

  // Calculate arrival time
  const arrivalTime = new Date(Date.now() + timeMinutes * 60 * 1000);

  return {
    minutes: timeMinutes,
    arrivalTime: arrivalTime,
    formattedArrival: arrivalTime.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  };
}

/**
 * Master ETA calculation function
 * Combines all logic for production use
 * @param {Object} params
 * @returns {Object} Complete ETA result
 */
export function computeStopETA({
  busCurrentGps,
  busPreviousGps,
  stopGps,
  route
}) {
  // Step 1: Calculate distance from bus to stop
  const distanceToStop = calculateDistance(
    busCurrentGps.lat, busCurrentGps.lon,
    stopGps.lat, stopGps.lon
  );

  // Step 2: Calculate average route speed
  const avgSpeed = calculateAverageRouteSpeed(route);

  // Step 3: Calculate live speed (if previous GPS available)
  const liveSpeed = calculateLiveSpeed(busPreviousGps, busCurrentGps);

  // Step 4: Blend speeds
  const finalSpeed = calculateBlendedSpeed(liveSpeed, avgSpeed);

  // Step 5: Calculate ETA
  const eta = calculateETA(distanceToStop, finalSpeed);

  return {
    distanceKm: distanceToStop,
    avgSpeedKmh: avgSpeed,
    liveSpeedKmh: liveSpeed,
    finalSpeedKmh: finalSpeed,
    etaMinutes: eta.minutes,
    arrivalTime: eta.arrivalTime,
    formattedArrival: eta.formattedArrival,
    calculatedAt: new Date()
  };
}
