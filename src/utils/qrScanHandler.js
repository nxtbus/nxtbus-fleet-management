/**
 * QR Scan Handler for NxtBus
 * Decision flow for processing QR code scans at bus stops
 */

import { calculateDistance, hasBusPassedStop, formatDistance } from './geoUtils';
import { computeStopETA } from './etaCalculator';

// Status codes for scan results
export const ScanStatus = {
  BUS_NOT_STARTED: 'BUS_NOT_STARTED',
  BUS_APPROACHING: 'BUS_APPROACHING',
  BUS_PASSED: 'BUS_PASSED',
  BUS_AT_STOP: 'BUS_AT_STOP',
  NO_ACTIVE_BUS: 'NO_ACTIVE_BUS',
  ERROR: 'ERROR'
};

// Threshold for "bus at stop" detection (meters)
const AT_STOP_THRESHOLD_KM = 0.1; // 100 meters

/**
 * Parse QR code data from bus stop
 * QR contains: stopId, lat, lon, stopName
 * @param {string} qrData - Raw QR code string (JSON)
 * @returns {Object} Parsed stop data
 */
export function parseStopQR(qrData) {
  try {
    const data = JSON.parse(qrData);
    return {
      stopId: data.stopId,
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
      stopName: data.stopName || 'Unknown Stop',
      valid: true
    };
  } catch (e) {
    // Fallback: try to parse as simple format "stopId|lat|lon|name"
    try {
      const parts = qrData.split('|');
      return {
        stopId: parts[0],
        lat: parseFloat(parts[1]),
        lon: parseFloat(parts[2]),
        stopName: parts[3] || 'Unknown Stop',
        valid: true
      };
    } catch {
      return { valid: false, error: 'Invalid QR format' };
    }
  }
}

/**
 * Check if bus trip has started
 * @param {Object} bus - Bus data with tripStartTime and currentGps
 * @returns {boolean}
 */
export function hasBusStarted(bus) {
  if (!bus || !bus.tripStartTime) {
    return false;
  }

  const now = Date.now();
  const startTime = new Date(bus.tripStartTime).getTime();

  // Bus has started if current time >= trip start time AND we have GPS data
  return now >= startTime && bus.currentGps !== null;
}

/**
 * Main QR scan processing function
 * Implements the complete decision flow
 * @param {Object} params
 * @returns {Object} Scan result with status and data
 */
export function processQRScan({ qrData, activeBuses, selectedRouteId }) {
  // Step 1: Parse QR code
  const stopData = parseStopQR(qrData);
  if (!stopData.valid) {
    return {
      status: ScanStatus.ERROR,
      message: 'Invalid QR code',
      stopData: null
    };
  }

  // Step 2: Find active buses for this route/stop
  const relevantBuses = activeBuses.filter(bus => 
    !selectedRouteId || bus.routeId === selectedRouteId
  );

  if (relevantBuses.length === 0) {
    return {
      status: ScanStatus.NO_ACTIVE_BUS,
      message: 'No active buses on this route',
      stopData
    };
  }

  // Step 3: Process each bus and find best ETA
  const busResults = relevantBuses.map(bus => {
    // Check if bus has started
    if (!hasBusStarted(bus)) {
      return {
        bus,
        status: ScanStatus.BUS_NOT_STARTED,
        message: 'Bus not started yet',
        scheduledStart: bus.tripStartTime
      };
    }

    const stopGps = { lat: stopData.lat, lon: stopData.lon };
    const routeEnd = { lat: bus.route.endLat, lon: bus.route.endLon };

    // Check if bus has passed the stop
    if (hasBusPassedStop(bus.currentGps, stopGps, routeEnd)) {
      return {
        bus,
        status: ScanStatus.BUS_PASSED,
        message: 'Bus already passed this stop'
      };
    }

    // Check if bus is at the stop
    const distanceToStop = calculateDistance(
      bus.currentGps.lat, bus.currentGps.lon,
      stopData.lat, stopData.lon
    );

    if (distanceToStop <= AT_STOP_THRESHOLD_KM) {
      return {
        bus,
        status: ScanStatus.BUS_AT_STOP,
        message: 'Bus is arriving now!',
        distance: distanceToStop
      };
    }

    // Calculate ETA for approaching bus
    const etaResult = computeStopETA({
      busCurrentGps: bus.currentGps,
      busPreviousGps: bus.previousGps,
      stopGps,
      route: bus.route
    });

    return {
      bus,
      status: ScanStatus.BUS_APPROACHING,
      message: `Arriving in ${etaResult.etaMinutes} min`,
      eta: etaResult,
      distance: distanceToStop,
      formattedDistance: formatDistance(distanceToStop)
    };
  });

  // Sort by ETA (approaching buses first, then by arrival time)
  const sortedResults = busResults.sort((a, b) => {
    if (a.status === ScanStatus.BUS_APPROACHING && b.status !== ScanStatus.BUS_APPROACHING) return -1;
    if (b.status === ScanStatus.BUS_APPROACHING && a.status !== ScanStatus.BUS_APPROACHING) return 1;
    if (a.eta && b.eta) return a.eta.etaMinutes - b.eta.etaMinutes;
    return 0;
  });

  return {
    status: sortedResults[0]?.status || ScanStatus.NO_ACTIVE_BUS,
    stopData,
    buses: sortedResults,
    scannedAt: new Date()
  };
}

/**
 * Format scan result for display
 * @param {Object} scanResult - Result from processQRScan
 * @returns {Object} Display-ready data
 */
export function formatScanResult(scanResult) {
  const { status, stopData, buses } = scanResult;

  return {
    stopName: stopData?.stopName || 'Unknown Stop',
    stopId: stopData?.stopId,
    buses: buses?.map(b => ({
      busNumber: b.bus?.busNumber,
      routeName: b.bus?.route?.name,
      status: b.status,
      statusMessage: b.message,
      etaMinutes: b.eta?.etaMinutes,
      arrivalTime: b.eta?.formattedArrival,
      distance: b.formattedDistance,
      speedKmh: b.eta?.finalSpeedKmh?.toFixed(1)
    })) || []
  };
}
