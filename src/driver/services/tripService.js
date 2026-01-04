/**
 * Trip Service for Driver App
 * Uses shared data store for consistency with Admin and Passenger apps
 */

import { dataStore } from '../../services/sharedDataService';
import { gpsTracker } from './gpsTracker';
import { calculateDistance } from '../../utils/geoUtils';

// Trip status enum
export const TripStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

class TripService {
  constructor() {
    this.currentTrip = null;
    this.listeners = new Set();
    this.gpsUnsubscribe = null;
  }

  /**
   * Start a new trip
   */
  async startTrip({ driverId, busId, routeId, route }) {
    // Check if there's a local trip in progress
    if (this.currentTrip?.status === TripStatus.IN_PROGRESS) {
      // Check if local trip is stale (older than 5 minutes)
      const tripAge = Date.now() - (this.currentTrip.lastUpdate || 0);
      const isStale = tripAge > 5 * 60 * 1000; // 5 minutes
      
      if (isStale) {
        console.log('Local trip is stale, clearing');
        this.currentTrip = null;
        localStorage.removeItem('current_trip');
      } else {
        // Verify if the trip still exists on server
        const serverTrips = await dataStore.getActiveTrips();
        const serverTrip = serverTrips.find(t => t.tripId === this.currentTrip.tripId);
        
        if (!serverTrip) {
          // Trip doesn't exist on server anymore, clear local state
          console.log('Clearing stale local trip - not on server');
          this.currentTrip = null;
          localStorage.removeItem('current_trip');
        } else {
          return { success: false, message: 'A trip is already in progress' };
        }
      }
    }

    try {
      // Get bus details
      const bus = await dataStore.getBusById(busId);
      const busNumber = bus?.number || busId;

      // Create trip in shared store
      const trip = await dataStore.startTrip({
        driverId,
        busId,
        busNumber,
        routeId,
        route: {
          ...route,
          tripStartTime: new Date().toISOString(),
          tripEndTime: new Date(Date.now() + (route.estimatedDuration || 60) * 60000).toISOString()
        }
      });

      // Initialize GPS tracker
      gpsTracker.initialize({ driverId, busId, tripId: trip.tripId });

      // Start GPS tracking
      const trackingResult = gpsTracker.startTracking();
      if (!trackingResult.success) {
        return { success: false, message: trackingResult.message };
      }

      // Subscribe to GPS updates
      this.gpsUnsubscribe = gpsTracker.subscribe((event, data) => {
        if (event === 'position_update' && this.currentTrip) {
          this.updateTripGps(data);
        }
      });

      this.currentTrip = {
        ...trip,
        status: TripStatus.IN_PROGRESS,
        positionLog: [],
        distanceCovered: 0
      };

      this.saveTrip(this.currentTrip);
      this.notifyListeners('trip_started', this.currentTrip);

      console.log('Trip started:', trip.tripId);
      return { success: true, trip: this.currentTrip };
    } catch (error) {
      console.error('Error starting trip:', error);
      return { success: false, message: 'Failed to start trip. Please try again.' };
    }
  }

  /**
   * Update trip GPS in shared store
   */
  async updateTripGps(gpsData) {
    if (!this.currentTrip) {
      console.log('updateTripGps: No current trip');
      return;
    }

    console.log('updateTripGps: Sending GPS to server', gpsData);

    try {
      // Update in shared store (visible to passenger app)
      const result = await dataStore.updateTripGps(this.currentTrip.tripId, gpsData);
      console.log('updateTripGps: Server response', result);

      // Process GPS for traffic detection
      const previousGps = this.currentTrip.currentGps;
      
      // Import traffic service dynamically to avoid circular deps
      import('../../services/trafficService').then(({ processGpsForTraffic }) => {
        const trafficResult = processGpsForTraffic(
          this.currentTrip.busId,
          gpsData,
          previousGps,
          this.currentTrip.route
        );
        if (trafficResult) {
          console.log('Traffic detection:', trafficResult);
          this.notifyListeners('traffic_update', trafficResult);
        }
      });

      // Process GPS for route diversion detection
      import('../../services/routeDiversionService').then(({ processGpsForDiversion }) => {
        const diversionResult = processGpsForDiversion(
          this.currentTrip.busId,
          gpsData,
          previousGps,
          this.currentTrip.route
        );
        if (diversionResult) {
          console.log('Diversion detection:', diversionResult);
          this.notifyListeners('diversion_update', diversionResult);
        }
      });

      // Process GPS for delay detection
      import('../../services/delayDetectionService').then(({ processGpsForDelay }) => {
        processGpsForDelay(
          this.currentTrip.busId,
          this.currentTrip.tripId,
          gpsData,
          previousGps,
          this.currentTrip.route,
          this.currentTrip.schedule
        ).then(delayResult => {
          if (delayResult) {
            console.log('Delay detection:', delayResult);
            this.notifyListeners('delay_update', delayResult);
          }
        });
      });

      // Update local trip data
      this.currentTrip.currentGps = gpsData;
      this.currentTrip.positionLog.push({
        lat: gpsData.lat,
        lon: gpsData.lon,
        timestamp: gpsData.timestamp
      });

      // Keep only last 500 positions
      if (this.currentTrip.positionLog.length > 500) {
        this.currentTrip.positionLog.shift();
      }

      // Update distance
      this.currentTrip.distanceCovered = this.calculateTotalDistance();
      this.saveTrip(this.currentTrip);
    } catch (error) {
      console.error('Error updating GPS:', error);
    }
  }

  /**
   * End the current trip
   */
  async endTrip() {
    if (!this.currentTrip || this.currentTrip.status !== TripStatus.IN_PROGRESS) {
      return { success: false, message: 'No active trip to end' };
    }

    try {
      // Stop GPS tracking
      gpsTracker.stopTracking();

      if (this.gpsUnsubscribe) {
        this.gpsUnsubscribe();
        this.gpsUnsubscribe = null;
      }

      // End trip in shared store
      await dataStore.endTrip(this.currentTrip.tripId);

      // Clear any diversion alerts for this bus
      import('../../services/routeDiversionService').then(({ clearDiversionForBus }) => {
        clearDiversionForBus(this.currentTrip.busId);
      });

      // Calculate final metrics
      const endTime = new Date().toISOString();
      const startTime = new Date(this.currentTrip.startTime);
      const duration = (new Date(endTime) - startTime) / 1000 / 60;

      this.currentTrip.status = TripStatus.COMPLETED;
      this.currentTrip.endTime = endTime;
      this.currentTrip.duration = Math.round(duration);
      this.currentTrip.distanceCovered = this.calculateTotalDistance();

      const completedTrip = { ...this.currentTrip };
      const summary = this.generateTripSummary(completedTrip);

      this.saveCompletedTrip(completedTrip);
      this.notifyListeners('trip_ended', { trip: completedTrip, summary });

      this.currentTrip = null;
      localStorage.removeItem('current_trip');

      console.log('Trip ended:', completedTrip.tripId);
      return { success: true, trip: completedTrip, summary };
    } catch (error) {
      console.error('Error ending trip:', error);
      return { success: false, message: 'Failed to end trip. Please try again.' };
    }
  }

  /**
   * Cancel the current trip
   */
  async cancelTrip(reason = '') {
    if (!this.currentTrip) {
      return { success: false, message: 'No active trip' };
    }

    try {
      gpsTracker.stopTracking();

      if (this.gpsUnsubscribe) {
        this.gpsUnsubscribe();
        this.gpsUnsubscribe = null;
      }

      // End trip in shared store
      await dataStore.endTrip(this.currentTrip.tripId);

      this.currentTrip.status = TripStatus.CANCELLED;
      this.currentTrip.endTime = new Date().toISOString();
      this.currentTrip.cancelReason = reason;

      const cancelledTrip = { ...this.currentTrip };
      this.saveCompletedTrip(cancelledTrip);
      this.notifyListeners('trip_cancelled', cancelledTrip);

      this.currentTrip = null;
      localStorage.removeItem('current_trip');

      return { success: true, trip: cancelledTrip };
    } catch (error) {
      console.error('Error cancelling trip:', error);
      return { success: false, message: 'Failed to cancel trip.' };
    }
  }

  /**
   * Calculate total distance from position log
   */
  calculateTotalDistance() {
    if (!this.currentTrip?.positionLog || this.currentTrip.positionLog.length < 2) {
      return 0;
    }

    let total = 0;
    const log = this.currentTrip.positionLog;

    for (let i = 1; i < log.length; i++) {
      total += calculateDistance(
        log[i - 1].lat, log[i - 1].lon,
        log[i].lat, log[i].lon
      );
    }

    return Math.round(total * 100) / 100;
  }

  /**
   * Generate trip summary
   */
  generateTripSummary(trip) {
    const startTime = new Date(trip.startTime);
    const endTime = new Date(trip.endTime);
    const durationMs = endTime - startTime;
    const durationMinutes = durationMs / 1000 / 60;
    const durationHours = durationMinutes / 60;

    const avgSpeed = durationHours > 0 ? trip.distanceCovered / durationHours : 0;

    return {
      tripId: trip.tripId,
      busNumber: trip.busNumber,
      routeName: trip.route?.name || 'Unknown Route',
      departureTime: startTime.toLocaleTimeString(),
      arrivalTime: endTime.toLocaleTimeString(),
      totalDuration: `${Math.floor(durationMinutes)} min`,
      totalDistance: `${trip.distanceCovered.toFixed(1)} km`,
      averageSpeed: `${avgSpeed.toFixed(1)} km/h`,
      status: trip.status,
      positionsRecorded: trip.positionLog?.length || 0
    };
  }

  /**
   * Get current trip
   */
  getCurrentTrip() {
    return this.currentTrip;
  }

  /**
   * Get trip status
   */
  getTripStatus() {
    if (!this.currentTrip) {
      return { status: TripStatus.NOT_STARTED, trip: null };
    }
    return { status: this.currentTrip.status, trip: this.currentTrip };
  }

  /**
   * Save trip to local storage
   */
  saveTrip(trip) {
    localStorage.setItem('current_trip', JSON.stringify(trip));
  }

  /**
   * Save completed trip to history
   */
  saveCompletedTrip(trip) {
    const history = JSON.parse(localStorage.getItem('trip_history') || '[]');
    history.unshift(trip);
    if (history.length > 50) history.pop();
    localStorage.setItem('trip_history', JSON.stringify(history));
  }

  /**
   * Get trip history
   */
  getTripHistory() {
    return JSON.parse(localStorage.getItem('trip_history') || '[]');
  }

  /**
   * Restore trip from storage
   */
  async restoreTrip() {
    const saved = localStorage.getItem('current_trip');
    if (saved) {
      try {
        const savedTrip = JSON.parse(saved);
        
        // Check if trip is stale (older than 5 minutes)
        const tripAge = Date.now() - (savedTrip.lastUpdate || 0);
        const isStale = tripAge > 5 * 60 * 1000; // 5 minutes
        
        if (isStale) {
          console.log('Saved trip is stale, clearing localStorage');
          localStorage.removeItem('current_trip');
          this.currentTrip = null;
          return null;
        }
        
        this.currentTrip = savedTrip;
        if (this.currentTrip.status === TripStatus.IN_PROGRESS) {
          // Resume tracking
          gpsTracker.initialize({
            driverId: this.currentTrip.driverId,
            busId: this.currentTrip.busId,
            tripId: this.currentTrip.tripId
          });
          gpsTracker.startTracking();

          // Re-register in shared store
          await dataStore.startTrip({
            ...this.currentTrip,
            tripId: this.currentTrip.tripId
          });

          this.gpsUnsubscribe = gpsTracker.subscribe((event, data) => {
            if (event === 'position_update' && this.currentTrip) {
              this.updateTripGps(data);
            }
          });
        }
        return this.currentTrip;
      } catch (error) {
        console.error('Error restoring trip:', error);
        // Clear corrupted trip data
        localStorage.removeItem('current_trip');
      }
    }
    return null;
  }

  /**
   * Force clear any stale trip (for recovery)
   */
  forceClearTrip() {
    this.currentTrip = null;
    localStorage.removeItem('current_trip');
    gpsTracker.stopTracking();
    if (this.gpsUnsubscribe) {
      this.gpsUnsubscribe();
      this.gpsUnsubscribe = null;
    }
    console.log('Trip forcefully cleared');
  }

  /**
   * Subscribe to trip events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(cb => cb(event, data));
  }
}

// Singleton
export const tripService = new TripService();
export default tripService;
