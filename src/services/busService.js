/**
 * Bus Service for Passenger App
 * Uses shared data store for consistency with Admin
 */

import { dataStore } from './sharedDataService';

/**
 * Get all locations from routes (for search dropdowns)
 */
export async function getLocations() {
  return dataStore.getLocations();
}

// Export for backward compatibility
export const locations = [];

/**
 * Check if current time is within a schedule (handles overnight schedules)
 */
function isTimeInSchedule(currentTime, startTime, endTime) {
  // Handle overnight schedules (e.g., 23:00 - 01:00)
  if (endTime < startTime) {
    // Overnight: active if current >= start OR current <= end
    return currentTime >= startTime || currentTime <= endTime;
  }
  // Normal: active if current >= start AND current <= end
  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Check if a bus has an active schedule for a route right now
 */
async function isBusScheduledNow(busId, routeId) {
  const schedules = await dataStore.getSchedules();
  const now = new Date();
  const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);
  
  return schedules.some(s => 
    s.busId === busId &&
    s.routeId === routeId &&
    s.status === 'active' &&
    s.days.includes(currentDay) &&
    isTimeInSchedule(currentTime, s.startTime, s.endTime)
  );
}

// GPS simulation removed - now using real GPS data from driver devices

/**
 * Fetch all active buses with GPS data
 * Only returns buses with REAL GPS data from driver app (active trips)
 * Shows scheduled buses without GPS as "Scheduled" status
 */
export async function fetchActiveBuses(routeId = null) {
  // Get data from API
  const [activeTrips, routes, buses, schedules] = await Promise.all([
    dataStore.getActiveTrips(),
    dataStore.getRoutes(),
    dataStore.getBuses(),
    dataStore.getSchedules()
  ]);
  
  console.log('fetchActiveBuses - activeTrips:', activeTrips.length, activeTrips);
  console.log('fetchActiveBuses - schedules:', schedules.length);
  
  const hasSchedules = schedules.length > 0;
  const now = new Date();
  const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
  const currentTime = now.toTimeString().slice(0, 5);
  
  console.log('fetchActiveBuses - currentDay:', currentDay, 'currentTime:', currentTime);

  // Get buses with REAL GPS from active trips (driver has started trip)
  // Deduplicate by busId - keep only the most recent trip per bus
  // Only include trips with GPS data updated in the last 5 minutes
  const GPS_FRESHNESS_MS = 5 * 60 * 1000; // 5 minutes
  const tripsByBus = new Map();
  activeTrips
    .filter(trip => {
      // Must have GPS data
      if (!trip.currentGps) return false;
      // GPS must be recent (within last 5 minutes)
      const gpsAge = Date.now() - (trip.currentGps.timestamp || trip.lastUpdate);
      const isFresh = gpsAge < GPS_FRESHNESS_MS;
      if (!isFresh) {
        console.log('Trip filtered - GPS too old:', trip.busNumber, 'age:', Math.round(gpsAge/1000), 'seconds');
      }
      return isFresh;
    })
    .forEach(trip => {
      const existing = tripsByBus.get(trip.busId);
      if (!existing || trip.lastUpdate > existing.lastUpdate) {
        tripsByBus.set(trip.busId, trip);
      }
    });
  
  const liveBusPromises = Array.from(tripsByBus.values())
    .map(async (trip) => {
      const bus = buses.find(b => b.id === trip.busId);
      if (!bus) return null;
      
      const route = routes.find(r => r.id === trip.routeId) || trip.route;
      
      // Find the CURRENTLY ACTIVE schedule for this bus/route
      // Must match current day and current time should be within schedule window
      const schedule = schedules.find(s => 
        s.busId === trip.busId && 
        s.routeId === trip.routeId &&
        s.status === 'active' &&
        s.days.includes(currentDay) &&
        isTimeInSchedule(currentTime, s.startTime, s.endTime)
      );
      
      // If no currently active schedule, find any schedule for this bus/route (for display purposes)
      const fallbackSchedule = !schedule ? schedules.find(s => 
        s.busId === trip.busId && 
        s.routeId === trip.routeId &&
        s.status === 'active'
      ) : null;
      
      const activeSchedule = schedule || fallbackSchedule;
      
      return {
        id: trip.tripId,
        busNumber: bus?.number || trip.busNumber || trip.busId,
        routeId: trip.routeId,
        route: route ? {
          ...route,
          tripStartTime: trip.startTime,
          tripEndTime: new Date(new Date(trip.startTime).getTime() + (route.estimatedDuration || 60) * 60000).toISOString()
        } : trip.route,
        currentGps: trip.currentGps,
        previousGps: trip.previousGps,
        isLive: true,
        schedule: activeSchedule ? {
          startTime: activeSchedule.startTime,
          endTime: activeSchedule.endTime,
          driverName: activeSchedule.driverName,
          isActive: !!schedule // true only if it's the currently active schedule
        } : null
      };
    });

  const liveBuses = (await Promise.all(liveBusPromises)).filter(Boolean);

  // Also show scheduled buses that haven't started yet (no GPS, but scheduled)
  let scheduledBuses = [];
  
  if (hasSchedules) {
    // Get schedules for today
    const todaySchedules = schedules.filter(s => 
      s.status === 'active' && s.days.includes(currentDay)
    );
    
    console.log('fetchActiveBuses - todaySchedules:', todaySchedules.length, todaySchedules);
    
    // Find scheduled buses that don't have an active trip yet
    scheduledBuses = todaySchedules
      .filter(schedule => {
        // Check if this bus already has an active trip WITH GPS
        // Trips without GPS shouldn't block the scheduled bus from showing
        const hasActiveTrip = activeTrips.some(t => 
          t.busId === schedule.busId && t.routeId === schedule.routeId && t.currentGps
        );
        console.log('Schedule', schedule.busNumber, 'hasActiveTrip:', hasActiveTrip);
        return !hasActiveTrip;
      })
      .map(schedule => {
        const bus = buses.find(b => b.id === schedule.busId);
        const route = routes.find(r => r.id === schedule.routeId);
        if (!bus || !route) {
          console.log('Schedule missing bus or route:', schedule.busId, schedule.routeId);
          return null;
        }
        
        const isActive = isTimeInSchedule(currentTime, schedule.startTime, schedule.endTime);
        
        const isOvernight = schedule.endTime < schedule.startTime;
        let isUpcoming;
        if (isOvernight) {
          isUpcoming = currentTime < schedule.startTime && currentTime > schedule.endTime;
        } else {
          isUpcoming = currentTime < schedule.startTime;
        }
        
        console.log('Schedule', schedule.busNumber, '- isActive:', isActive, 'isUpcoming:', isUpcoming, 'startTime:', schedule.startTime, 'endTime:', schedule.endTime);
        
        // Don't show buses whose schedule has ended
        if (!isActive && !isUpcoming) {
          console.log('Schedule filtered out - not active and not upcoming');
          return null;
        }
        
        return {
          id: `SCHEDULED_${bus.id}_${schedule.routeId}`,
          busNumber: bus.number,
          routeId: schedule.routeId,
          route: route,
          currentGps: null, // No GPS - driver hasn't started trip
          previousGps: null,
          isLive: false,
          isScheduled: true, // Flag to indicate this is a scheduled bus waiting to start
          schedule: {
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            driverName: schedule.driverName,
            isActive,
            isUpcoming,
            isPast: false
          }
        };
      })
      .filter(Boolean);
  }

  let allBuses = [...liveBuses, ...scheduledBuses];

  if (routeId) {
    allBuses = allBuses.filter(b => b.routeId === routeId);
  }

  return allBuses;
}

/**
 * Fetch buses for a specific stop
 */
export async function fetchBusesForStop(stopId) {
  return await fetchActiveBuses();
}

/**
 * Fetch stop information
 */
export async function fetchStopInfo(stopId) {
  const routes = await dataStore.getRoutes();
  for (const route of routes) {
    const stop = (route.stops || []).find(s => s.id === stopId);
    if (stop) {
      return {
        stopId: stop.id,
        stopName: stop.name,
        lat: stop.lat,
        lon: stop.lon
      };
    }
  }
  return null;
}

/**
 * Fetch all routes
 */
export async function fetchRoutes() {
  return dataStore.getActiveRoutes();
}

/**
 * Submit user feedback
 */
export async function submitFeedback(feedbackData) {
  return dataStore.addFeedback(feedbackData);
}

/**
 * Fetch active alerts/notifications
 */
export async function fetchAlerts() {
  const [notifications, delays] = await Promise.all([
    dataStore.getNotifications(),
    dataStore.getActiveDelays()
  ]);
  
  // Combine notifications and delays into alerts
  const alerts = [
    ...notifications.slice(0, 5).map(n => ({
      id: n.id,
      type: n.type === 'diversion' ? 'diversion' : 'traffic',
      title: n.title,
      message: n.message,
      timestamp: n.sentAt
    })),
    ...delays.map(d => ({
      id: d.id,
      type: 'traffic',
      title: `Bus ${d.busNumber} Delayed`,
      message: `${d.reason} - Expected delay: ${d.delayMinutes} minutes`,
      timestamp: d.reportedAt
    }))
  ];
  
  return alerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
}
