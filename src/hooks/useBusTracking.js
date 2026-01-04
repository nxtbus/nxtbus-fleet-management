/**
 * Bus Tracking Hook for NxtBus
 * Manages real-time GPS updates and ETA refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { computeStopETA } from '../utils/etaCalculator';
import { calculateDistance, hasBusPassedStop } from '../utils/geoUtils';
import { ScanStatus } from '../utils/qrScanHandler';

// Refresh interval: 15 seconds (within 10-20 second requirement)
const REFRESH_INTERVAL_MS = 15000;

// GPS history length for speed calculation
const GPS_HISTORY_LENGTH = 5;

/**
 * Hook for tracking a specific bus to a stop
 * @param {Object} bus - Bus data with route info
 * @param {Object} stopGps - Stop coordinates {lat, lon}
 * @param {boolean} enabled - Whether tracking is active
 */
export function useBusTracking(bus, stopGps, enabled = true) {
  const [trackingData, setTrackingData] = useState(null);
  const [status, setStatus] = useState(ScanStatus.BUS_NOT_STARTED);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  const gpsHistoryRef = useRef([]);
  const intervalRef = useRef(null);

  // Fetch latest GPS from server (real GPS data from driver devices)
  const fetchBusGps = useCallback(async (busId) => {
    try {
      // Fetch real GPS data from server API
      const response = await fetch(`/api/trips/active`);
      const trips = await response.json();
      
      // Find the trip for this bus
      const trip = trips.find(t => t.busId === busId || t.id === busId);
      if (!trip || !trip.currentGps) return null;
      
      return trip.currentGps;
    } catch (error) {
      console.error('Failed to fetch GPS data:', error);
      return null;
    }
  }, []);

  // Update GPS history for live speed calculation
  const updateGpsHistory = useCallback((newGps) => {
    gpsHistoryRef.current = [
      ...gpsHistoryRef.current.slice(-(GPS_HISTORY_LENGTH - 1)),
      newGps
    ];
  }, []);

  // Main tracking update function
  const updateTracking = useCallback(async () => {
    if (!bus || !stopGps || !enabled) return;

    try {
      // Fetch latest GPS
      const newGps = await fetchBusGps(bus.id);
      if (!newGps) {
        setStatus(ScanStatus.BUS_NOT_STARTED);
        return;
      }

      // Update history
      updateGpsHistory(newGps);

      // Get previous GPS for speed calculation
      const history = gpsHistoryRef.current;
      const prevGps = history.length > 1 ? history[history.length - 2] : null;

      // Check if bus has passed stop
      const routeEnd = { lat: bus.route.endLat, lon: bus.route.endLon };
      if (hasBusPassedStop(newGps, stopGps, routeEnd)) {
        setStatus(ScanStatus.BUS_PASSED);
        setTrackingData({ message: 'Bus already passed this stop' });
        return;
      }

      // Check if bus is at stop
      const distance = calculateDistance(newGps.lat, newGps.lon, stopGps.lat, stopGps.lon);
      if (distance < 0.1) {
        setStatus(ScanStatus.BUS_AT_STOP);
        setTrackingData({ message: 'Bus is arriving now!' });
        return;
      }

      // Calculate ETA
      const eta = computeStopETA({
        busCurrentGps: newGps,
        busPreviousGps: prevGps,
        stopGps,
        route: bus.route
      });

      setStatus(ScanStatus.BUS_APPROACHING);
      setTrackingData({
        ...eta,
        busGps: newGps,
        distance
      });
      setLastUpdate(new Date());
      setError(null);

    } catch (err) {
      setError(err.message);
    }
  }, [bus, stopGps, enabled, fetchBusGps, updateGpsHistory]);

  // Set up refresh interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Initial update
    updateTracking();

    // Set up interval (every 15 seconds)
    intervalRef.current = setInterval(updateTracking, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, updateTracking]);

  // Manual refresh function
  const refresh = useCallback(() => {
    updateTracking();
  }, [updateTracking]);

  return {
    trackingData,
    status,
    lastUpdate,
    error,
    refresh,
    isTracking: enabled && status === ScanStatus.BUS_APPROACHING
  };
}

/**
 * Hook for tracking multiple buses
 * @param {Array} buses - Array of bus data
 * @param {Object} stopGps - Stop coordinates
 */
export function useMultiBusTracking(buses, stopGps) {
  const [allTrackingData, setAllTrackingData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (!buses?.length || !stopGps) return;

    const updateAll = async () => {
      const results = await Promise.all(
        buses.map(async (bus) => {
          if (!bus.currentGps) {
            return { bus, status: ScanStatus.BUS_NOT_STARTED };
          }

          const routeEnd = { lat: bus.route.endLat, lon: bus.route.endLon };
          
          if (hasBusPassedStop(bus.currentGps, stopGps, routeEnd)) {
            return { bus, status: ScanStatus.BUS_PASSED };
          }

          const eta = computeStopETA({
            busCurrentGps: bus.currentGps,
            busPreviousGps: bus.previousGps,
            stopGps,
            route: bus.route
          });

          return {
            bus,
            status: ScanStatus.BUS_APPROACHING,
            eta
          };
        })
      );

      // Sort by ETA
      results.sort((a, b) => {
        if (a.status !== ScanStatus.BUS_APPROACHING) return 1;
        if (b.status !== ScanStatus.BUS_APPROACHING) return -1;
        return (a.eta?.etaMinutes || 999) - (b.eta?.etaMinutes || 999);
      });

      setAllTrackingData(results);
      setLastUpdate(new Date());
    };

    updateAll();
    const interval = setInterval(updateAll, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [buses, stopGps]);

  return { allTrackingData, lastUpdate };
}
