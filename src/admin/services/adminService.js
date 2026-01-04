/**
 * Admin Service for NxtBus
 * Wrapper around shared data store for admin-specific operations
 */

import { dataStore } from '../../services/sharedDataService';

// ============ BUS MANAGEMENT ============

export async function getBuses() {
  return dataStore.getBuses();
}

export async function getBusById(id) {
  return dataStore.getBusById(id);
}

export async function addBus(busData) {
  return dataStore.addBus(busData);
}

export async function updateBus(id, updates) {
  return dataStore.updateBus(id, updates);
}

export async function deleteBus(id) {
  return dataStore.deleteBus(id);
}

// ============ ROUTE MANAGEMENT ============

export async function getRoutes() {
  return dataStore.getRoutes();
}

export async function getRouteById(id) {
  return dataStore.getRouteById(id);
}

export async function addRoute(routeData) {
  return dataStore.addRoute(routeData);
}

export async function updateRoute(id, updates) {
  return dataStore.updateRoute(id, updates);
}

export async function deleteRoute(id) {
  return dataStore.deleteRoute(id);
}

export async function addStopToRoute(routeId, stopData) {
  return dataStore.addStopToRoute(routeId, stopData);
}

export async function removeStopFromRoute(routeId, stopId) {
  return dataStore.removeStopFromRoute(routeId, stopId);
}

// ============ DRIVER MANAGEMENT ============

export async function getDrivers() {
  return dataStore.getDrivers();
}

export async function addDriver(driverData) {
  return dataStore.addDriver(driverData);
}

export async function updateDriver(id, updates) {
  return dataStore.updateDriver(id, updates);
}

export async function deleteDriver(id) {
  return dataStore.deleteDriver(id);
}

// ============ DELAY MANAGEMENT ============

export async function getDelays() {
  return dataStore.getDelays();
}

export async function getActiveDelays() {
  return dataStore.getActiveDelays();
}

export async function reportDelay(delayData) {
  return dataStore.addDelay(delayData);
}

export async function updateDelayStatus(id, status) {
  return dataStore.updateDelayStatus(id, status);
}

export async function deleteDelay(id) {
  return dataStore.deleteDelay(id);
}

// ============ NOTIFICATION MANAGEMENT ============

export async function getNotifications() {
  return dataStore.getNotifications();
}

export async function sendNotification(notifData) {
  return dataStore.addNotification(notifData);
}

export async function deleteNotification(id) {
  return dataStore.deleteNotification(id);
}

// ============ FEEDBACK MANAGEMENT ============

export async function getFeedbacks(filters = {}) {
  return dataStore.getFeedbacks(filters);
}

export async function updateFeedbackStatus(id, status) {
  return dataStore.updateFeedbackStatus(id, status);
}

export async function getFeedbackStats() {
  return dataStore.getFeedbackStats();
}

// ============ ACTIVE TRIPS ============

export async function getActiveTrips() {
  return dataStore.getActiveTrips();
}

// ============ DASHBOARD ============

export async function getDashboardStats() {
  return dataStore.getDashboardStats();
}

// ============ RESET ============

export async function resetAllData() {
  return dataStore.resetAllData();
}

// ============ OWNER MANAGEMENT ============

// Get API base URL - use production backend for deployed apps
function getAPIBase() {
  // Local development
  if (window.location.hostname === 'localhost') {
    return 'http://localhost:3001/api';
  }
  
  // Production: use Render backend URL
  return 'https://nxtbus-backend.onrender.com/api';
}

const API_BASE = getAPIBase();

export async function getOwners() {
  const res = await fetch(`${API_BASE}/owners`);
  return res.json();
}

export async function getOwnerById(id) {
  const res = await fetch(`${API_BASE}/owners/${id}`);
  return res.json();
}

export async function addOwner(ownerData) {
  const res = await fetch(`${API_BASE}/owners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ownerData)
  });
  return res.json();
}

export async function updateOwner(id, updates) {
  const res = await fetch(`${API_BASE}/owners/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  return res.json();
}

export async function deleteOwner(id) {
  const res = await fetch(`${API_BASE}/owners/${id}`, { method: 'DELETE' });
  return res.json();
}

export async function assignBusToOwner(busId, ownerId) {
  return updateBus(busId, { ownerId });
}

export async function getOwnerBuses(ownerId) {
  const buses = await getBuses();
  return buses.filter(b => b.ownerId === ownerId);
}
