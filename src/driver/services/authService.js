/**
 * Authentication Service for Driver App
 * Uses shared data store for consistency with Admin
 */

import { dataStore } from '../../services/sharedDataService';
import { gpsTracker } from './gpsTracker';

// Helper to parse time string to minutes
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

class AuthService {
  constructor() {
    this.currentDriver = null;
    this.selectedBus = null;
    this.selectedRoute = null;
    this.selectedSchedule = null;
    this.isAuthenticated = false;
    this.listeners = new Set();
  }

  /**
   * Login driver with phone and PIN
   */
  async login(phone, pin) {
    try {
      const driver = await dataStore.authenticateDriver(phone, pin);

      if (!driver) {
        return { success: false, message: 'Invalid phone number or PIN' };
      }

      if (driver.status !== 'active') {
        return { success: false, message: 'Driver account is not active' };
      }

      this.currentDriver = driver;
      this.isAuthenticated = true;
      this.saveSession(driver);
      this.notifyListeners('login', driver);

      console.log('Driver logged in:', driver.name);
      return { success: true, driver };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Server error. Please try again.' };
    }
  }

  /**
   * Logout driver
   */
  async logout() {
    gpsTracker.stopTracking();

    this.currentDriver = null;
    this.selectedBus = null;
    this.selectedRoute = null;
    this.selectedSchedule = null;
    this.isAuthenticated = false;
    this.clearSession();
    this.notifyListeners('logout');

    return { success: true };
  }

  /**
   * Get buses assigned to current driver
   */
  async getAssignedBuses() {
    if (!this.currentDriver) return [];

    try {
      // Reload driver data to get latest assignments
      const driver = await dataStore.getDriverById(this.currentDriver.id);
      if (!driver) return [];

      const allBuses = await dataStore.getBuses();
      const assignedBusIds = driver.assignedBuses || [];
      
      return allBuses.filter(bus => 
        assignedBusIds.includes(bus.id) && bus.status === 'active'
      );
    } catch (error) {
      console.error('Error getting assigned buses:', error);
      return [];
    }
  }

  /**
   * Select bus for trip
   */
  async selectBus(busId) {
    const buses = await this.getAssignedBuses();
    const bus = buses.find(b => b.id === busId);

    if (!bus) {
      return { success: false, message: 'Bus not found or not assigned to you' };
    }

    this.selectedBus = bus;
    this.notifyListeners('bus_selected', bus);

    return { success: true, bus };
  }

  /**
   * Get routes for selected bus (only routes with schedules assigned to this driver)
   */
  async getRoutesForBus() {
    if (!this.selectedBus || !this.currentDriver) return [];

    try {
      // Get schedules for this driver and bus
      const schedules = await dataStore.getSchedules();
      const driverSchedules = schedules.filter(s => 
        s.driverId === this.currentDriver.id && 
        s.busId === this.selectedBus.id &&
        s.status === 'active'
      );
      
      // Get unique route IDs from schedules
      const scheduledRouteIds = [...new Set(driverSchedules.map(s => s.routeId))];
      
      // Get route details for scheduled routes
      const routes = await dataStore.getActiveRoutes();
      return routes.filter(r => scheduledRouteIds.includes(r.id));
    } catch (error) {
      console.error('Error getting routes:', error);
      return [];
    }
  }

  /**
   * Get all scheduled trips for the driver today
   * Returns schedules with route details, sorted by start time
   */
  async getTodaySchedules() {
    if (!this.currentDriver) return [];

    try {
      const schedules = await dataStore.getSchedules();
      const routes = await dataStore.getActiveRoutes();
      const buses = await dataStore.getBuses();
      
      // Get current day abbreviation
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = days[new Date().getDay()];
      
      // Filter schedules for this driver, today, and active
      const todaySchedules = schedules.filter(s => 
        s.driverId === this.currentDriver.id &&
        s.status === 'active' &&
        s.days?.includes(today)
      );
      
      // Enrich with route and bus details
      const enrichedSchedules = todaySchedules.map(schedule => {
        const route = routes.find(r => r.id === schedule.routeId);
        const bus = buses.find(b => b.id === schedule.busId);
        return {
          ...schedule,
          route,
          bus,
          // Parse time for sorting
          startTimeMinutes: parseTimeToMinutes(schedule.startTime),
          endTimeMinutes: parseTimeToMinutes(schedule.endTime)
        };
      }).filter(s => s.route && s.bus); // Only include if route and bus exist
      
      // Sort by start time
      enrichedSchedules.sort((a, b) => a.startTimeMinutes - b.startTimeMinutes);
      
      return enrichedSchedules;
    } catch (error) {
      console.error('Error getting today schedules:', error);
      return [];
    }
  }

  /**
   * Select a specific schedule/trip
   */
  async selectSchedule(scheduleId) {
    const schedules = await this.getTodaySchedules();
    const schedule = schedules.find(s => s.id === scheduleId);
    
    if (!schedule) {
      return { success: false, message: 'Schedule not found' };
    }
    
    this.selectedBus = schedule.bus;
    this.selectedRoute = schedule.route;
    this.selectedSchedule = schedule;
    
    this.notifyListeners('schedule_selected', schedule);
    
    return { 
      success: true, 
      schedule,
      bus: schedule.bus,
      route: schedule.route
    };
  }

  /**
   * Select route for trip
   */
  async selectRoute(routeId) {
    const routes = await this.getRoutesForBus();
    const route = routes.find(r => r.id === routeId);

    if (!route) {
      return { success: false, message: 'Route not found' };
    }

    this.selectedRoute = route;
    this.notifyListeners('route_selected', route);

    return { success: true, route };
  }

  /**
   * Verify driver is ready to start trip
   */
  verifyReadyToStart() {
    const checks = {
      driverAuthenticated: this.isAuthenticated,
      busSelected: this.selectedBus !== null,
      routeSelected: this.selectedRoute !== null
    };

    const allPassed = Object.values(checks).every(v => v);

    return {
      ready: allPassed,
      checks,
      driver: this.currentDriver,
      bus: this.selectedBus,
      route: this.selectedRoute,
      schedule: this.selectedSchedule
    };
  }

  /**
   * Get current session state
   */
  getSession() {
    return {
      isAuthenticated: this.isAuthenticated,
      driver: this.currentDriver,
      selectedBus: this.selectedBus,
      selectedRoute: this.selectedRoute
    };
  }

  /**
   * Save session to storage
   */
  saveSession(driver) {
    localStorage.setItem('driver_session', JSON.stringify({
      driver,
      timestamp: Date.now()
    }));
  }

  /**
   * Restore session from storage
   */
  async restoreSession() {
    const saved = localStorage.getItem('driver_session');
    if (saved) {
      try {
        const { driver, timestamp } = JSON.parse(saved);
        // Session valid for 12 hours
        if (Date.now() - timestamp < 12 * 60 * 60 * 1000) {
          // Verify driver still exists and is active
          const currentDriver = await dataStore.getDriverById(driver.id);
          if (currentDriver && currentDriver.status === 'active') {
            this.currentDriver = currentDriver;
            this.isAuthenticated = true;
            return currentDriver;
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      }
    }
    this.clearSession();
    return null;
  }

  /**
   * Clear session
   */
  clearSession() {
    localStorage.removeItem('driver_session');
  }

  /**
   * Subscribe to auth events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data = null) {
    this.listeners.forEach(cb => cb(event, data));
  }
}

// Singleton
export const authService = new AuthService();
export default authService;
