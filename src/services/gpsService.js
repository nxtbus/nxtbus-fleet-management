/**
 * Real GPS Service for NxtBus
 * Handles actual device GPS tracking with high accuracy
 */

import websocketService from './websocketService';

class GPSService {
  constructor() {
    this.isTracking = false;
    this.watchId = null;
    this.currentPosition = null;
    this.trackingOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000
    };
    this.lastKnownPosition = null;
    this.positionHistory = [];
    this.trackingStartTime = null;
    this.totalDistance = 0;
    this.callbacks = new Map();
  }

  /**
   * Check if GPS is available
   */
  isGPSAvailable() {
    return 'geolocation' in navigator;
  }

  /**
   * Request GPS permissions
   */
  async requestPermissions() {
    if (!this.isGPSAvailable()) {
      throw new Error('GPS not available on this device');
    }

    try {
      // Test GPS access
      const position = await this.getCurrentPosition();
      return {
        granted: true,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
    } catch (error) {
      throw new Error(`GPS permission denied: ${error.message}`);
    }
  }

  /**
   * Get current GPS position (one-time)
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!this.isGPSAvailable()) {
        reject(new Error('GPS not available'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const gpsData = this.processGPSData(position);
          resolve(gpsData);
        },
        (error) => {
          reject(this.handleGPSError(error));
        },
        this.trackingOptions
      );
    });
  }

  /**
   * Start continuous GPS tracking
   */
  async startTracking(tripId, options = {}) {
    if (this.isTracking) {
      throw new Error('GPS tracking already active');
    }

    if (!this.isGPSAvailable()) {
      throw new Error('GPS not available on this device');
    }

    // Merge custom options
    this.trackingOptions = {
      ...this.trackingOptions,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          try {
            const gpsData = this.processGPSData(position, tripId);
            this.handleGPSUpdate(gpsData, tripId);
            
            if (!this.isTracking) {
              this.isTracking = true;
              this.trackingStartTime = Date.now();
              resolve(gpsData);
            }
          } catch (error) {
            console.error('GPS processing error:', error);
          }
        },
        (error) => {
          const gpsError = this.handleGPSError(error);
          console.error('GPS tracking error:', gpsError);
          
          if (!this.isTracking) {
            reject(gpsError);
          }
          
          // Notify callbacks about error
          this.notifyCallbacks('error', gpsError);
        },
        this.trackingOptions
      );
    });
  }

  /**
   * Stop GPS tracking
   */
  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    
    this.isTracking = false;
    this.trackingStartTime = null;
    
    // Notify callbacks
    this.notifyCallbacks('stopped', {
      totalDistance: this.totalDistance,
      duration: this.trackingStartTime ? Date.now() - this.trackingStartTime : 0,
      positionCount: this.positionHistory.length
    });
    
    // Reset tracking data
    this.positionHistory = [];
    this.totalDistance = 0;
  }

  /**
   * Process raw GPS data from device
   */
  processGPSData(position, tripId = null) {
    const coords = position.coords;
    const timestamp = position.timestamp || Date.now();

    // Calculate speed if not provided by device
    let speed = coords.speed || 0;
    let heading = coords.heading || 0;

    if (this.lastKnownPosition && speed === 0) {
      const timeDiff = (timestamp - this.lastKnownPosition.timestamp) / 1000; // seconds
      
      if (timeDiff > 0) {
        const distance = this.calculateDistance(
          this.lastKnownPosition.lat,
          this.lastKnownPosition.lon,
          coords.latitude,
          coords.longitude
        );
        
        speed = distance / timeDiff; // m/s
        
        // Calculate heading/bearing
        heading = this.calculateBearing(
          this.lastKnownPosition.lat,
          this.lastKnownPosition.lon,
          coords.latitude,
          coords.longitude
        );
      }
    }

    const gpsData = {
      tripId,
      lat: coords.latitude,
      lon: coords.longitude,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
      altitudeAccuracy: coords.altitudeAccuracy,
      speed: speed, // m/s
      speedKmh: speed * 3.6, // km/h
      heading: heading, // degrees
      timestamp: timestamp,
      source: 'device_gps',
      quality: this.assessGPSQuality(coords)
    };

    // Update position history
    this.updatePositionHistory(gpsData);
    this.lastKnownPosition = gpsData;

    return gpsData;
  }

  /**
   * Handle GPS updates
   */
  handleGPSUpdate(gpsData, tripId) {
    this.currentPosition = gpsData;

    // Send to WebSocket if connected
    if (websocketService.isSocketConnected()) {
      websocketService.sendGPSUpdate(gpsData);
    }

    // Notify callbacks
    this.notifyCallbacks('update', gpsData);

    // Log high-accuracy positions
    if (gpsData.accuracy <= 10) {
      console.log(`📍 High-accuracy GPS: ${gpsData.lat.toFixed(6)}, ${gpsData.lon.toFixed(6)} (±${gpsData.accuracy}m)`);
    }
  }

  /**
   * Update position history and calculate distance
   */
  updatePositionHistory(gpsData) {
    this.positionHistory.push(gpsData);

    // Calculate distance from last position
    if (this.positionHistory.length > 1) {
      const lastPos = this.positionHistory[this.positionHistory.length - 2];
      const distance = this.calculateDistance(
        lastPos.lat,
        lastPos.lon,
        gpsData.lat,
        gpsData.lon
      );
      
      // Only add to total if movement is significant (> 1 meter)
      if (distance > 1) {
        this.totalDistance += distance;
      }
    }

    // Keep only last 100 positions to manage memory
    if (this.positionHistory.length > 100) {
      this.positionHistory = this.positionHistory.slice(-100);
    }
  }

  /**
   * Assess GPS quality based on accuracy and other factors
   */
  assessGPSQuality(coords) {
    const accuracy = coords.accuracy;
    
    if (accuracy <= 5) return 'excellent';
    if (accuracy <= 10) return 'good';
    if (accuracy <= 20) return 'fair';
    if (accuracy <= 50) return 'poor';
    return 'very_poor';
  }

  /**
   * Calculate distance between two GPS points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  /**
   * Calculate bearing between two GPS points
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360; // Normalize to 0-360
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   */
  toDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  /**
   * Handle GPS errors
   */
  handleGPSError(error) {
    let message = 'GPS error occurred';
    let code = 'GPS_ERROR';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'GPS access denied by user';
        code = 'GPS_PERMISSION_DENIED';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'GPS position unavailable';
        code = 'GPS_UNAVAILABLE';
        break;
      case error.TIMEOUT:
        message = 'GPS request timed out';
        code = 'GPS_TIMEOUT';
        break;
      default:
        message = error.message || 'Unknown GPS error';
        code = 'GPS_UNKNOWN_ERROR';
    }

    return {
      code,
      message,
      originalError: error
    };
  }

  /**
   * Add callback for GPS events
   */
  addCallback(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event).add(callback);
  }

  /**
   * Remove callback
   */
  removeCallback(event, callback) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).delete(callback);
    }
  }

  /**
   * Notify callbacks
   */
  notifyCallbacks(event, data) {
    if (this.callbacks.has(event)) {
      this.callbacks.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`GPS callback error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get tracking statistics
   */
  getTrackingStats() {
    return {
      isTracking: this.isTracking,
      startTime: this.trackingStartTime,
      duration: this.trackingStartTime ? Date.now() - this.trackingStartTime : 0,
      positionCount: this.positionHistory.length,
      totalDistance: this.totalDistance,
      currentPosition: this.currentPosition,
      lastKnownPosition: this.lastKnownPosition,
      averageAccuracy: this.calculateAverageAccuracy(),
      qualityDistribution: this.getQualityDistribution()
    };
  }

  /**
   * Calculate average GPS accuracy
   */
  calculateAverageAccuracy() {
    if (this.positionHistory.length === 0) return 0;
    
    const totalAccuracy = this.positionHistory.reduce((sum, pos) => sum + pos.accuracy, 0);
    return totalAccuracy / this.positionHistory.length;
  }

  /**
   * Get GPS quality distribution
   */
  getQualityDistribution() {
    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      very_poor: 0
    };

    this.positionHistory.forEach(pos => {
      distribution[pos.quality]++;
    });

    return distribution;
  }

  /**
   * Export tracking data
   */
  exportTrackingData() {
    return {
      metadata: {
        startTime: this.trackingStartTime,
        endTime: Date.now(),
        duration: this.trackingStartTime ? Date.now() - this.trackingStartTime : 0,
        totalDistance: this.totalDistance,
        positionCount: this.positionHistory.length
      },
      positions: this.positionHistory,
      statistics: this.getTrackingStats()
    };
  }

  /**
   * Clear tracking history
   */
  clearHistory() {
    this.positionHistory = [];
    this.totalDistance = 0;
    this.lastKnownPosition = null;
  }
}

// Create singleton instance
const gpsService = new GPSService();

export default gpsService;