/**
 * GPS Tracker Service for Driver App
 * Uses real device GPS when available, falls back to simulation for testing
 */

import gpsService from '../../services/gpsService';
import driverGPSSimulator from '../../services/driverGPSSimulator';
import websocketService from '../../services/websocketService';

class GPSTrackerService {
  constructor() {
    this.isTracking = false;
    this.currentPosition = null;
    this.listeners = new Set();
    this.tripId = null;
    this.busId = null;
    this.driverId = null;
    this.transmitInterval = null;
    this.useSimulation = false;
    this.simulationInterval = null;
  }

  /**
   * Initialize tracker with driver and bus info
   */
  async initialize({ driverId, busId, tripId }) {
    this.driverId = driverId;
    this.busId = busId;
    this.tripId = tripId;
    
    // Initialize GPS simulator
    await driverGPSSimulator.initialize();
    
    console.log('GPS Tracker initialized:', { driverId, busId, tripId });
  }

  /**
   * Start GPS tracking (real GPS or simulation)
   */
  async startTracking() {
    if (this.isTracking) {
      console.log('GPS tracking already active');
      return { success: true, message: 'Already tracking' };
    }

    // Try real GPS first
    const realGPSResult = await this.tryRealGPS();
    if (realGPSResult.success) {
      return realGPSResult;
    }

    // Fall back to simulation
    console.log('Real GPS not available, using simulation');
    return this.startSimulation();
  }

  /**
   * Try to start real GPS tracking
   */
  async tryRealGPS() {
    try {
      // Check GPS availability
      if (!gpsService.isGPSAvailable()) {
        return { success: false, message: 'GPS not available on this device' };
      }

      // Request GPS permissions
      await gpsService.requestPermissions();

      // Set up GPS callbacks
      gpsService.addCallback('update', (gpsData) => {
        this.handlePositionUpdate(gpsData);
      });

      gpsService.addCallback('error', (error) => {
        this.handlePositionError(error);
      });

      // Start GPS tracking with high accuracy
      await gpsService.startTracking(this.tripId, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000
      });

      this.useSimulation = false;
      this.startTransmission();
      this.isTracking = true;
      this.notifyListeners('tracking_started');

      console.log('✅ Real GPS tracking started successfully');
      return { success: true, message: 'Real GPS tracking started' };

    } catch (error) {
      console.log('❌ Real GPS failed:', error.message);
      return { success: false, message: error.message };
    }
  }

  /**
   * Start GPS simulation
   */
  async startSimulation() {
    try {
      // Start simulation
      const simulation = driverGPSSimulator.startSimulation(this.driverId, {
        tripId: this.tripId,
        busId: this.busId,
        routeId: 'ROUTE001' // Default route for simulation
      });

      if (!simulation) {
        return { success: false, message: 'Failed to start GPS simulation' };
      }

      this.useSimulation = true;
      
      // Start simulation update interval
      this.simulationInterval = setInterval(() => {
        const position = driverGPSSimulator.getCurrentPosition(this.driverId);
        if (position) {
          this.handlePositionUpdate(position);
        }
      }, 5000); // Update every 5 seconds

      this.startTransmission();
      this.isTracking = true;
      this.notifyListeners('tracking_started');

      console.log('🛰️ GPS simulation started successfully');
      return { success: true, message: 'GPS simulation started (no real GPS available)' };

    } catch (error) {
      console.error('Failed to start GPS simulation:', error);
      return { success: false, message: 'Failed to start GPS simulation' };
    }
  }

  /**
   * Start transmission interval
   */
  startTransmission() {
    // Start server transmission interval (every 15 seconds)
    this.transmitInterval = setInterval(() => {
      this.transmitToServer();
    }, 15000);
  }

  /**
   * Stop GPS tracking
   */
  stopTracking() {
    if (!this.isTracking) {
      return { success: true, message: 'Not tracking' };
    }

    if (this.useSimulation) {
      // Stop simulation
      driverGPSSimulator.stopSimulation(this.driverId);
      
      if (this.simulationInterval) {
        clearInterval(this.simulationInterval);
        this.simulationInterval = null;
      }
    } else {
      // Stop real GPS service
      gpsService.stopTracking();
      
      // Remove GPS callbacks
      gpsService.removeCallback('update', this.handlePositionUpdate);
      gpsService.removeCallback('error', this.handlePositionError);
    }

    // Clear transmission interval
    if (this.transmitInterval) {
      clearInterval(this.transmitInterval);
      this.transmitInterval = null;
    }

    this.isTracking = false;
    this.currentPosition = null;
    this.useSimulation = false;
    this.notifyListeners('tracking_stopped');

    console.log('GPS tracking stopped');
    return { success: true, message: 'GPS tracking stopped' };
  }

  /**
   * Handle new GPS position (real or simulated)
   */
  handlePositionUpdate(gpsData) {
    console.log('📍 GPS Update received:', gpsData.source || 'unknown', gpsData);

    // Store current position
    this.currentPosition = {
      lat: gpsData.lat,
      lon: gpsData.lon,
      accuracy: gpsData.accuracy,
      speed: gpsData.speed, // m/s
      speedKmh: gpsData.speedKmh, // km/h
      heading: gpsData.heading,
      altitude: gpsData.altitude,
      timestamp: gpsData.timestamp,
      quality: gpsData.quality,
      source: gpsData.source || (this.useSimulation ? 'simulated_gps' : 'device_gps')
    };

    this.notifyListeners('position_update', this.currentPosition);
  }

  /**
   * Handle GPS errors
   */
  handlePositionError(error) {
    console.error('GPS Error:', error);
    this.notifyListeners('gps_error', error);
  }

  /**
   * Transmit GPS data to server via API and WebSocket
   */
  async transmitToServer() {
    if (!this.currentPosition || !this.tripId) {
      return { success: false, message: 'No GPS data or trip ID' };
    }

    const payload = {
      tripId: this.tripId,
      busId: this.busId,
      driverId: this.driverId,
      ...this.currentPosition,
      transmittedAt: Date.now()
    };

    try {
      // Send via WebSocket for real-time updates
      if (websocketService.isSocketConnected()) {
        websocketService.sendGPSUpdate(payload);
      }

      // Send via HTTP API for persistence
      const token = localStorage.getItem('driver_token');
      const response = await fetch(`/api/trips/${this.tripId}/gps`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📡 GPS transmitted successfully:', result);
      
      this.notifyListeners('gps_transmitted', payload);
      return { success: true, result };

    } catch (error) {
      console.error('GPS transmission failed:', error);
      
      // Queue for retry when offline
      this.queueForRetry(payload);
      this.notifyListeners('transmission_failed', { error: error.message, payload });
      
      return { success: false, error: error.message };
    }
  }

  /**
   * Queue failed transmissions for retry
   */
  queueForRetry(payload) {
    try {
      const queue = JSON.parse(localStorage.getItem('gps_retry_queue') || '[]');
      queue.push(payload);
      
      // Keep only last 50 failed transmissions
      if (queue.length > 50) {
        queue.splice(0, queue.length - 50);
      }
      
      localStorage.setItem('gps_retry_queue', JSON.stringify(queue));
      console.log('GPS payload queued for retry:', payload.timestamp);
    } catch (error) {
      console.error('Failed to queue GPS payload:', error);
    }
  }

  /**
   * Retry queued transmissions when connection is restored
   */
  async retryQueuedTransmissions() {
    try {
      const queue = JSON.parse(localStorage.getItem('gps_retry_queue') || '[]');
      if (queue.length === 0) return { success: true, retried: 0 };

      console.log(`Retrying ${queue.length} queued GPS transmissions...`);
      
      const failed = [];
      let retried = 0;
      
      for (const payload of queue) {
        try {
          const token = localStorage.getItem('driver_token');
          const response = await fetch(`/api/trips/${payload.tripId}/gps`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            retried++;
            console.log('✅ Retried GPS transmission:', payload.timestamp);
          } else {
            failed.push(payload);
          }
        } catch (error) {
          failed.push(payload);
        }
      }

      // Update queue with remaining failed transmissions
      localStorage.setItem('gps_retry_queue', JSON.stringify(failed));
      
      console.log(`GPS retry complete: ${retried} successful, ${failed.length} still failed`);
      return { success: true, retried, failed: failed.length };

    } catch (error) {
      console.error('Failed to retry GPS transmissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current position
   */
  getCurrentPosition() {
    return this.currentPosition;
  }

  /**
   * Get GPS tracking statistics
   */
  getTrackingStats() {
    if (!this.isTracking) {
      return null;
    }
    
    if (this.useSimulation) {
      const simStatus = driverGPSSimulator.getSimulationStatus(this.driverId);
      return {
        isTracking: this.isTracking,
        source: 'simulation',
        simulation: simStatus,
        currentPosition: this.currentPosition
      };
    } else {
      return gpsService.getTrackingStats();
    }
  }

  /**
   * Get tracking status
   */
  getStatus() {
    return {
      isTracking: this.isTracking,
      useSimulation: this.useSimulation,
      currentPosition: this.currentPosition,
      tripId: this.tripId,
      busId: this.busId,
      driverId: this.driverId,
      trackingStats: this.getTrackingStats()
    };
  }

  /**
   * Subscribe to GPS events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data = null) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('GPS tracker listener error:', error);
      }
    });
  }

  /**
   * Force GPS position update (manual refresh)
   */
  async forceUpdate() {
    if (!this.isTracking) {
      return { success: false, message: 'GPS tracking not active' };
    }

    try {
      if (this.useSimulation) {
        const position = driverGPSSimulator.getCurrentPosition(this.driverId);
        if (position) {
          this.handlePositionUpdate(position);
          return { success: true, position, source: 'simulation' };
        } else {
          return { success: false, message: 'Simulation not active' };
        }
      } else {
        const position = await gpsService.getCurrentPosition();
        this.handlePositionUpdate(position);
        return { success: true, position, source: 'real_gps' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Toggle between real GPS and simulation (for testing)
   */
  async toggleGPSMode() {
    if (!this.isTracking) {
      return { success: false, message: 'GPS tracking not active' };
    }

    // Stop current tracking
    this.stopTracking();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start with opposite mode
    if (this.useSimulation) {
      // Try to switch to real GPS
      const result = await this.tryRealGPS();
      if (result.success) {
        return { success: true, message: 'Switched to real GPS', mode: 'real_gps' };
      } else {
        // Fall back to simulation
        await this.startSimulation();
        return { success: true, message: 'Real GPS not available, staying with simulation', mode: 'simulation' };
      }
    } else {
      // Switch to simulation
      await this.startSimulation();
      return { success: true, message: 'Switched to GPS simulation', mode: 'simulation' };
    }
  }
}

// Singleton instance
export const gpsTracker = new GPSTrackerService();
export default gpsTracker;
