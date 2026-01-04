/**
 * Owner Service for NxtBus
 * Real-time API wrapper connecting Driver and Admin data to Owner Portal
 * All data is filtered by the current owner's buses
 */

import { dataStore } from '../../services/sharedDataService';
import { getCurrentOwnerId } from './ownerAuth';

// API Base URL - Auto-detect environment
const getHost = () => {
  // If running in Capacitor (mobile app), use network IP
  if (window.Capacitor?.isNativePlatform()) {
    return '10.77.155.222';
  }
  // If accessing from browser on same network
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return window.location.hostname;
  }
  // Default to localhost for local development
  return 'localhost';
};

const HOST = getHost();
const API_BASE = `http://${HOST}:3001/api`;

// ============ API HELPERS ============

async function fetchApi(endpoint) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`);
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Owner API Error:', error);
    throw error;
  }
}

// ============ OWNER BUS FILTERING ============

// Get buses that belong to the current owner
export async function getOwnerBuses() {
  const ownerId = getCurrentOwnerId();
  const buses = await dataStore.getBuses();
  
  if (!ownerId) return buses; // Return all if no owner logged in (fallback)
  return buses.filter(bus => bus.ownerId === ownerId);
}

// Get bus IDs that belong to the current owner
export async function getOwnerBusIds() {
  const ownerBuses = await getOwnerBuses();
  return ownerBuses.map(bus => bus.id);
}

// Check if a bus belongs to the current owner
export async function isBusOwnedByCurrentOwner(busId) {
  const ownerBusIds = await getOwnerBusIds();
  return ownerBusIds.includes(busId);
}

// ============ FLEET OVERVIEW (Connected to Admin) ============

export async function getFleetOverview() {
  const ownerId = getCurrentOwnerId();
  
  const [allBuses, drivers, routes, activeTrips, delays] = await Promise.all([
    dataStore.getBuses(),
    dataStore.getDrivers(),
    dataStore.getRoutes(),
    dataStore.getActiveTrips(),
    dataStore.getActiveDelays()
  ]);

  // Filter buses by owner
  const buses = ownerId ? allBuses.filter(b => b.ownerId === ownerId) : allBuses;
  const busIds = buses.map(b => b.id);
  
  // Filter drivers assigned to owner's buses
  const ownerDriverIds = new Set();
  buses.forEach(bus => {
    (bus.assignedDrivers || []).forEach(driverId => ownerDriverIds.add(driverId));
  });
  const ownerDrivers = drivers.filter(d => ownerDriverIds.has(d.id));
  
  // Filter trips for owner's buses
  const ownerTrips = activeTrips.filter(t => busIds.includes(t.busId));
  
  // Filter delays for owner's buses
  const ownerDelays = delays.filter(d => busIds.includes(d.busId));
  
  // Get routes used by owner's buses
  const ownerRouteIds = new Set();
  buses.forEach(bus => {
    (bus.assignedRoutes || []).forEach(routeId => ownerRouteIds.add(routeId));
  });
  const ownerRoutes = routes.filter(r => ownerRouteIds.has(r.id));

  const activeBuses = buses.filter(b => b.status === 'active').length;
  const busesOnTrip = ownerTrips.length;

  return {
    totalBuses: buses.length,
    activeBuses,
    busesOnTrip,
    totalDrivers: ownerDrivers.length,
    activeDrivers: ownerDrivers.filter(d => d.status === 'active').length,
    totalRoutes: ownerRoutes.length,
    activeRoutes: ownerRoutes.filter(r => r.status === 'active').length,
    activeDelays: ownerDelays.length,
    activeTrips: busesOnTrip
  };
}

// ============ REAL-TIME TRACKING (Connected to Driver GPS) ============

export async function getActiveTrips() {
  const busIds = await getOwnerBusIds();
  const trips = await dataStore.getActiveTrips();
  return trips.filter(t => busIds.includes(t.busId));
}

// Get all buses with their location (active trips + last known location for inactive)
export async function getAllBusesWithLocation() {
  const [buses, trips, drivers, routes, schedules] = await Promise.all([
    getOwnerBuses(),
    dataStore.getActiveTrips(),
    dataStore.getDrivers(),
    dataStore.getRoutes(),
    dataStore.getSchedules()
  ]);

  return buses.map(bus => {
    // Check if bus has an active trip
    const activeTrip = trips.find(t => t.busId === bus.id);
    const assignedDrivers = drivers.filter(d => bus.assignedDrivers?.includes(d.id));
    const assignedRoutes = routes.filter(r => bus.assignedRoutes?.includes(r.id));
    const busSchedules = schedules.filter(s => s.busId === bus.id);
    
    if (activeTrip) {
      // Bus is on active trip
      const driver = drivers.find(d => d.id === activeTrip.driverId);
      let speed = 0;
      if (activeTrip.currentGps?.speed) {
        speed = Math.round(activeTrip.currentGps.speed * 3.6);
      }
      
      let progress = 0;
      if (activeTrip.startTime && activeTrip.route?.estimatedDuration) {
        const elapsed = (Date.now() - new Date(activeTrip.startTime).getTime()) / 60000;
        progress = Math.min(100, Math.round((elapsed / activeTrip.route.estimatedDuration) * 100));
      }
      
      return {
        busId: bus.id,
        busNumber: bus.number,
        type: bus.type,
        capacity: bus.capacity,
        busStatus: bus.status,
        tripStatus: 'active',
        tripId: activeTrip.tripId || activeTrip.id,
        driverId: activeTrip.driverId,
        driverName: driver?.name || 'Unknown',
        driverPhone: driver?.phone || '',
        routeId: activeTrip.routeId,
        routeName: activeTrip.route?.name || 'Unknown Route',
        route: activeTrip.route,
        currentLat: activeTrip.currentGps?.lat,
        currentLon: activeTrip.currentGps?.lon,
        speed: speed,
        maxSpeed: activeTrip.maxSpeed || 0,
        avgSpeed: activeTrip.avgSpeed || 0,
        progress: progress,
        startTime: activeTrip.startTime,
        lastUpdate: activeTrip.lastUpdate || Date.now(),
        assignedDrivers,
        assignedRoutes,
        schedules: busSchedules
      };
    } else {
      // Bus is not on active trip - show last known location
      const lastKnownLocation = bus.lastKnownLocation || bus.lastLocation || null;
      const defaultRoute = assignedRoutes[0] || null;
      
      return {
        busId: bus.id,
        busNumber: bus.number,
        type: bus.type,
        capacity: bus.capacity,
        busStatus: bus.status,
        tripStatus: 'inactive',
        tripId: null,
        driverId: null,
        driverName: assignedDrivers[0]?.name || 'Not assigned',
        driverPhone: assignedDrivers[0]?.phone || '',
        routeId: defaultRoute?.id || null,
        routeName: defaultRoute?.name || 'No route assigned',
        route: defaultRoute,
        currentLat: lastKnownLocation?.lat || defaultRoute?.startLat || null,
        currentLon: lastKnownLocation?.lon || defaultRoute?.startLon || null,
        speed: 0,
        maxSpeed: 0,
        avgSpeed: 0,
        progress: 0,
        startTime: null,
        lastUpdate: lastKnownLocation?.timestamp || bus.lastUpdateTime || null,
        assignedDrivers,
        assignedRoutes,
        schedules: busSchedules
      };
    }
  });
}

export async function getFleetLocations() {
  const ownerId = getCurrentOwnerId();
  const busIds = await getOwnerBusIds();
  
  // Fallback to basic trip data filtered by owner
  const trips = await dataStore.getActiveTrips();
  const buses = await dataStore.getBuses();
  const drivers = await dataStore.getDrivers();
  
  // Filter trips by owner's buses
  const ownerTrips = trips.filter(t => busIds.includes(t.busId));
  
  return ownerTrips.map(trip => {
    const bus = buses.find(b => b.id === trip.busId);
    const driver = drivers.find(d => d.id === trip.driverId);
    
    // Calculate speed from GPS
    let speed = 0;
    if (trip.currentGps?.speed) {
      speed = Math.round(trip.currentGps.speed * 3.6);
    }
    
    // Calculate progress
    let progress = 0;
    if (trip.startTime && trip.route?.estimatedDuration) {
      const elapsed = (Date.now() - new Date(trip.startTime).getTime()) / 60000;
      progress = Math.min(100, Math.round((elapsed / trip.route.estimatedDuration) * 100));
    }
    
    return {
      tripId: trip.tripId || trip.id,
      busId: trip.busId,
      busNumber: bus?.number || trip.busNumber,
      driverId: trip.driverId,
      driverName: driver?.name || 'Unknown',
      driverPhone: driver?.phone || '',
      routeId: trip.routeId,
      routeName: trip.route?.name || 'Unknown Route',
      route: trip.route,
      currentLat: trip.currentGps?.lat,
      currentLon: trip.currentGps?.lon,
      speed: speed,
      maxSpeed: trip.maxSpeed || 0,
      avgSpeed: trip.avgSpeed || 0,
      progress: progress,
      startTime: trip.startTime,
      lastUpdate: trip.lastUpdate || Date.now(),
      status: 'active'
    };
  });
}

export async function getTripDetails(tripId) {
  const trips = await dataStore.getActiveTrips();
  return trips.find(t => t.tripId === tripId || t.id === tripId);
}


// ============ DELAY MANAGEMENT (Connected to Admin Delays) ============

export async function getDelays() {
  const busIds = await getOwnerBusIds();
  const delays = await dataStore.getDelays();
  return delays.filter(d => busIds.includes(d.busId));
}

export async function getActiveDelays() {
  const busIds = await getOwnerBusIds();
  const delays = await dataStore.getActiveDelays();
  return delays.filter(d => busIds.includes(d.busId));
}

export async function getDelayStats() {
  const delays = await dataStore.getDelays();
  const active = delays.filter(d => d.status === 'active');
  const resolved = delays.filter(d => d.status === 'resolved');
  
  const avgDelay = active.length > 0 
    ? Math.round(active.reduce((sum, d) => sum + (d.delayMinutes || 0), 0) / active.length)
    : 0;

  const byReason = {};
  delays.forEach(d => {
    const reason = d.reason || 'Unknown';
    byReason[reason] = (byReason[reason] || 0) + 1;
  });

  return {
    total: delays.length,
    active: active.length,
    resolved: resolved.length,
    avgDelayMinutes: avgDelay,
    byReason
  };
}

// ============ DRIVER & BUS DETAILS (Connected to Admin) ============

export async function getBuses() {
  return getOwnerBuses();
}

export async function getDrivers() {
  const buses = await getOwnerBuses();
  const allDrivers = await dataStore.getDrivers();
  
  // Get driver IDs assigned to owner's buses
  const ownerDriverIds = new Set();
  buses.forEach(bus => {
    (bus.assignedDrivers || []).forEach(driverId => ownerDriverIds.add(driverId));
  });
  
  return allDrivers.filter(d => ownerDriverIds.has(d.id));
}

export async function getBusDetails(busId) {
  const [bus, trips, schedules, drivers] = await Promise.all([
    dataStore.getBusById(busId),
    dataStore.getActiveTrips(),
    dataStore.getSchedules(),
    dataStore.getDrivers()
  ]);

  const currentTrip = trips.find(t => t.busId === busId);
  const busSchedules = schedules.filter(s => s.busId === busId);
  const assignedDrivers = drivers.filter(d => bus?.assignedDrivers?.includes(d.id));

  return {
    ...bus,
    currentTrip,
    schedules: busSchedules,
    drivers: assignedDrivers
  };
}

export async function getDriverDetails(driverId) {
  const [drivers, trips, schedules, buses] = await Promise.all([
    dataStore.getDrivers(),
    dataStore.getActiveTrips(),
    dataStore.getSchedules(),
    dataStore.getBuses()
  ]);

  const driver = drivers.find(d => d.id === driverId);
  if (!driver) return null;

  const currentTrip = trips.find(t => t.driverId === driverId);
  const driverSchedules = schedules.filter(s => s.driverId === driverId);
  const assignedBuses = buses.filter(b => driver.assignedBuses?.includes(b.id));

  return {
    ...driver,
    currentTrip,
    schedules: driverSchedules,
    buses: assignedBuses
  };
}

export async function getFleetWithDrivers() {
  const [buses, allDrivers, trips, schedules] = await Promise.all([
    getOwnerBuses(),
    dataStore.getDrivers(),
    dataStore.getActiveTrips(),
    dataStore.getSchedules()
  ]);

  const busIds = buses.map(b => b.id);

  return buses.map(bus => {
    const assignedDrivers = allDrivers.filter(d => 
      bus.assignedDrivers?.includes(d.id)
    );
    const currentTrip = trips.find(t => t.busId === bus.id);
    const busSchedules = schedules.filter(s => s.busId === bus.id);

    return {
      ...bus,
      drivers: assignedDrivers,
      currentTrip,
      schedules: busSchedules,
      isOnTrip: !!currentTrip
    };
  });
}

// ============ SPEED MONITORING (Connected to Driver GPS) ============

export async function getSpeedData() {
  const locations = await getFleetLocations();
  const SPEED_LIMIT = 60;

  return locations.map(loc => ({
    tripId: loc.tripId,
    busId: loc.busId,
    busNumber: loc.busNumber,
    driverName: loc.driverName,
    routeName: loc.routeName,
    currentSpeed: loc.speed || 0,
    maxSpeed: loc.maxSpeed || 0,
    avgSpeed: loc.avgSpeed || 0,
    speedLimit: SPEED_LIMIT,
    isOverspeed: (loc.speed || 0) > SPEED_LIMIT,
    overspeedCount: loc.overspeedCount || 0,
    lastUpdate: loc.lastUpdate
  }));
}

export async function getOverspeedAlerts() {
  const locations = await getFleetLocations();
  const SPEED_LIMIT = 60;

  return locations
    .filter(loc => (loc.speed || 0) > SPEED_LIMIT)
    .map(loc => ({
      tripId: loc.tripId,
      busNumber: loc.busNumber,
      driverName: loc.driverName,
      driverPhone: loc.driverPhone,
      currentSpeed: loc.speed,
      speedLimit: SPEED_LIMIT,
      excessSpeed: loc.speed - SPEED_LIMIT,
      timestamp: loc.lastUpdate
    }));
}


// ============ DEPARTURE/ARRIVAL ALERTS (Connected to Schedules) ============

export async function getSchedules() {
  const busIds = await getOwnerBusIds();
  const schedules = await dataStore.getSchedules();
  return schedules.filter(s => busIds.includes(s.busId));
}

export async function getTimingAlerts() {
  const busIds = await getOwnerBusIds();
  const [allSchedules, allTrips] = await Promise.all([
    dataStore.getSchedules(),
    dataStore.getActiveTrips()
  ]);

  // Filter by owner's buses
  const schedules = allSchedules.filter(s => busIds.includes(s.busId));
  const trips = allTrips.filter(t => busIds.includes(t.busId));

  const alerts = [];
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = dayNames[now.getDay()];

  schedules.forEach(schedule => {
    if (schedule.status !== 'active' || !schedule.days?.includes(today)) return;

    const scheduledStart = schedule.startTime;
    const scheduledEnd = schedule.endTime;
    const trip = trips.find(t => t.busId === schedule.busId);

    // Check for late departure (bus should have started but hasn't)
    if (scheduledStart < currentTime && !trip) {
      const [schedH, schedM] = scheduledStart.split(':').map(Number);
      const [currH, currM] = currentTime.split(':').map(Number);
      const delayMins = (currH * 60 + currM) - (schedH * 60 + schedM);
      
      if (delayMins > 5 && delayMins < 120) { // Between 5 mins and 2 hours late
        alerts.push({
          type: 'late_departure',
          scheduleId: schedule.id,
          busId: schedule.busId,
          busNumber: schedule.busNumber,
          routeName: schedule.routeName,
          driverName: schedule.driverName,
          scheduledTime: scheduledStart,
          delayMinutes: delayMins,
          severity: delayMins > 15 ? 'high' : 'medium'
        });
      }
    }

    // Check for potential late arrival based on trip progress
    if (trip && trip.route?.estimatedDuration) {
      const startTime = new Date(trip.startTime);
      const expectedEnd = new Date(startTime.getTime() + trip.route.estimatedDuration * 60000);
      const [endH, endM] = scheduledEnd.split(':').map(Number);
      const scheduledEndTime = new Date(now);
      scheduledEndTime.setHours(endH, endM, 0, 0);

      if (expectedEnd > scheduledEndTime) {
        const delayMins = Math.round((expectedEnd - scheduledEndTime) / 60000);
        if (delayMins > 5) {
          alerts.push({
            type: 'late_arrival',
            scheduleId: schedule.id,
            busId: schedule.busId,
            busNumber: schedule.busNumber || trip.busNumber,
            routeName: schedule.routeName || trip.route?.name,
            driverName: schedule.driverName || trip.driverName,
            scheduledTime: scheduledEnd,
            estimatedTime: expectedEnd.toTimeString().slice(0, 5),
            delayMinutes: delayMins,
            severity: delayMins > 15 ? 'high' : 'medium'
          });
        }
      }
    }
  });

  return alerts;
}

// ============ STOP ANALYTICS ============

export async function getStopAnalytics() {
  const busIds = await getOwnerBusIds();
  const [routes, allTrips, buses] = await Promise.all([
    dataStore.getRoutes(),
    dataStore.getActiveTrips(),
    getOwnerBuses()
  ]);

  // Get route IDs used by owner's buses
  const ownerRouteIds = new Set();
  buses.forEach(bus => {
    (bus.assignedRoutes || []).forEach(routeId => ownerRouteIds.add(routeId));
  });

  // Filter routes and trips
  const ownerRoutes = routes.filter(r => ownerRouteIds.has(r.id));
  const trips = allTrips.filter(t => busIds.includes(t.busId));

  const stopData = [];

  ownerRoutes.forEach(route => {
    (route.stops || []).forEach(stop => {
      // Get historical data from trips for this stop
      const tripStopData = trips
        .filter(t => t.routeId === route.id)
        .map(t => t.stopTimes?.[stop.id])
        .filter(Boolean);

      const avgWaitTime = tripStopData.length > 0
        ? Math.round(tripStopData.reduce((sum, t) => sum + (t.waitTime || 2), 0) / tripStopData.length)
        : stop.estimatedTime || 2;

      stopData.push({
        stopId: stop.id,
        stopName: stop.name,
        routeId: route.id,
        routeName: route.name,
        order: stop.order,
        avgWaitTime,
        estimatedTime: stop.estimatedTime || 2,
        lat: stop.lat,
        lon: stop.lon,
        tripCount: tripStopData.length,
        isPeakHourCongested: avgWaitTime > (stop.estimatedTime || 2) * 1.5
      });
    });
  });

  return stopData;
}

export async function getRouteAnalytics(routeId) {
  const busIds = await getOwnerBusIds();
  const [route, allTrips] = await Promise.all([
    dataStore.getRouteById(routeId),
    dataStore.getActiveTrips()
  ]);

  if (!route) return null;

  const routeTrips = allTrips.filter(t => t.routeId === routeId && busIds.includes(t.busId));
  
  return {
    route,
    totalTrips: routeTrips.length,
    avgDuration: route.estimatedDuration,
    stops: (route.stops || []).map(stop => ({
      ...stop,
      avgWaitTime: 2,
      congestionLevel: 'normal'
    }))
  };
}

export async function getRoutes() {
  const buses = await getOwnerBuses();
  const allRoutes = await dataStore.getRoutes();
  
  // Get route IDs used by owner's buses
  const ownerRouteIds = new Set();
  buses.forEach(bus => {
    (bus.assignedRoutes || []).forEach(routeId => ownerRouteIds.add(routeId));
  });
  
  return allRoutes.filter(r => ownerRouteIds.has(r.id));
}

// ============ NOTIFICATIONS (Connected to Admin) ============

export async function getNotifications() {
  return dataStore.getNotifications();
}

// ============ REAL-TIME EVENT SUBSCRIPTION ============

// Poll for real-time updates
export function subscribeToUpdates(callback, intervalMs = 3000) {
  const poll = async () => {
    try {
      const [locations, delays, alerts] = await Promise.all([
        getFleetLocations(),
        getActiveDelays(),
        getOverspeedAlerts()
      ]);
      callback({ locations, delays, alerts, timestamp: Date.now() });
    } catch (error) {
      console.error('Update poll error:', error);
    }
  };

  // Initial fetch
  poll();
  
  // Set up interval
  const intervalId = setInterval(poll, intervalMs);
  
  // Return unsubscribe function
  return () => clearInterval(intervalId);
}
