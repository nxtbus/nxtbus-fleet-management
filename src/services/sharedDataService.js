/**
 * Shared Data Service for NxtBus
 * Single source of truth for all apps (Admin, Driver, Passenger)
 * Uses backend API for JSON file storage
 */

import * as api from './apiService';

// ============ DATA STORE CLASS ============

class SharedDataStore {
  constructor() {
    this.serverAvailable = null;
    this.checkServer();
  }

  async checkServer() {
    this.serverAvailable = await api.checkServerHealth();
    if (!this.serverAvailable) {
      console.warn('Backend server not available. Please start the server with: cd server && node index.js');
    }
    return this.serverAvailable;
  }

  // ============ BUSES ============
  
  getBuses() {
    return api.getBuses();
  }

  getBusById(id) {
    return api.getBusById(id);
  }

  async getBusesByIds(ids) {
    const buses = await api.getBuses();
    return buses.filter(b => ids.includes(b.id));
  }

  async getActiveBuses() {
    const buses = await api.getBuses();
    return buses.filter(b => b.status === 'active');
  }

  addBus(busData) {
    return api.addBus(busData);
  }

  updateBus(id, updates) {
    return api.updateBus(id, updates);
  }

  deleteBus(id) {
    return api.deleteBus(id);
  }

  // ============ ROUTES ============

  getRoutes() {
    return api.getRoutes();
  }

  getRouteById(id) {
    return api.getRouteById(id);
  }

  async getActiveRoutes() {
    const routes = await api.getRoutes();
    return routes.filter(r => r.status === 'active');
  }

  addRoute(routeData) {
    return api.addRoute(routeData);
  }

  updateRoute(id, updates) {
    return api.updateRoute(id, updates);
  }

  deleteRoute(id) {
    return api.deleteRoute(id);
  }

  async addStopToRoute(routeId, stopData) {
    const route = await api.getRouteById(routeId);
    if (!route) throw new Error('Route not found');
    
    const newStop = {
      id: `S${Date.now()}`,
      ...stopData,
      order: (route.stops || []).length + 1
    };
    route.stops = [...(route.stops || []), newStop];
    return api.updateRoute(routeId, { stops: route.stops });
  }

  async removeStopFromRoute(routeId, stopId) {
    const route = await api.getRouteById(routeId);
    if (!route) throw new Error('Route not found');
    
    route.stops = (route.stops || []).filter(s => s.id !== stopId);
    route.stops.forEach((s, i) => s.order = i + 1);
    return api.updateRoute(routeId, { stops: route.stops });
  }

  getLocations() {
    return api.getLocations();
  }

  // ============ DRIVERS ============

  getDrivers() {
    return api.getDrivers();
  }

  getDriverById(id) {
    return api.getDriverById(id);
  }

  getDriverByPhone(phone) {
    return api.getDriverByPhone(phone);
  }

  authenticateDriver(phone, pin) {
    return api.authenticateDriver(phone, pin);
  }

  addDriver(driverData) {
    return api.addDriver(driverData);
  }

  updateDriver(id, updates) {
    return api.updateDriver(id, updates);
  }

  deleteDriver(id) {
    return api.deleteDriver(id);
  }

  // ============ ACTIVE TRIPS ============

  getActiveTrips() {
    return api.getActiveTrips();
  }

  startTrip(tripData) {
    return api.startTrip(tripData);
  }

  updateTripGps(tripId, gpsData) {
    return api.updateTripGps(tripId, gpsData);
  }

  endTrip(tripId) {
    return api.endTrip(tripId);
  }

  // ============ DELAYS ============

  getDelays() {
    return api.getDelays();
  }

  getActiveDelays() {
    return api.getActiveDelays();
  }

  addDelay(delayData) {
    return api.addDelay(delayData);
  }

  updateDelayStatus(id, status) {
    return api.updateDelayStatus(id, status);
  }

  deleteDelay(id) {
    return api.deleteDelay(id);
  }

  // ============ NOTIFICATIONS ============

  getNotifications() {
    return api.getNotifications();
  }

  addNotification(notifData) {
    return api.addNotification(notifData);
  }

  deleteNotification(id) {
    return api.deleteNotification(id);
  }

  // ============ FEEDBACKS ============

  getFeedbacks(filters = {}) {
    return api.getFeedbacks(filters);
  }

  addFeedback(feedbackData) {
    return api.addFeedback(feedbackData);
  }

  updateFeedbackStatus(id, status) {
    return api.updateFeedbackStatus(id, status);
  }

  async getFeedbackStats() {
    const feedbacks = await api.getFeedbacks();
    const total = feedbacks.length;
    const avgRating = total > 0 ? feedbacks.reduce((sum, f) => sum + f.rating, 0) / total : 0;
    const byCategory = {};
    const byStatus = {};
    
    feedbacks.forEach(f => {
      byCategory[f.category] = (byCategory[f.category] || 0) + 1;
      byStatus[f.status] = (byStatus[f.status] || 0) + 1;
    });
    
    return { total, avgRating: avgRating.toFixed(1), byCategory, byStatus };
  }

  // ============ SCHEDULES ============

  getSchedules() {
    return api.getSchedules();
  }

  async getScheduleById(id) {
    const schedules = await api.getSchedules();
    return schedules.find(s => s.id === id);
  }

  async getSchedulesByRoute(routeId) {
    const schedules = await api.getSchedules();
    return schedules.filter(s => s.routeId === routeId);
  }

  async getSchedulesByBus(busId) {
    const schedules = await api.getSchedules();
    return schedules.filter(s => s.busId === busId);
  }

  addSchedule(scheduleData) {
    return api.addSchedule(scheduleData);
  }

  updateSchedule(id, updates) {
    return api.updateSchedule(id, updates);
  }

  deleteSchedule(id) {
    return api.deleteSchedule(id);
  }

  getActiveSchedules() {
    return api.getActiveSchedules();
  }

  // ============ DASHBOARD STATS ============

  getDashboardStats() {
    return api.getDashboardStats();
  }

  // ============ RESET ============

  resetAllData() {
    return api.resetAllData();
  }
}

// Singleton instance
export const dataStore = new SharedDataStore();
export default dataStore;
