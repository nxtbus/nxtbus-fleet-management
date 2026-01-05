/**
 * Driver GPS Simulator for Testing
 * Simulates realistic driver GPS movement along routes for development/testing
 * This replaces the need for actual GPS hardware during development
 */

class DriverGPSSimulator {
  constructor() {
    this.activeSimulations = new Map(); // driverId -> simulation data
    this.routes = new Map(); // routeId -> route data
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.ENABLE_GPS_SIMULATION === 'true';
  }

  /**
   * Initialize simulator with route data
   */
  async initialize() {
    if (!this.isEnabled) {
      console.log('GPS simulation disabled');
      return;
    }

    try {
      // Get API base URL
      const API_BASE = this.getAPIBase();
      
      // Fetch routes from server
      const response = await fetch(`${API_BASE}/routes`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const routes = await response.json();
      
      if (!Array.isArray(routes)) {
        throw new Error('Invalid routes data received');
      }
      
      routes.forEach(route => {
        this.routes.set(route.id, route);
      });
      
      console.log('🛰️ Driver GPS Simulator initialized with', routes.length, 'routes');
    } catch (error) {
      console.error('Failed to initialize GPS simulator:', error);
      // Don't throw - allow app to continue without simulation
    }
  }

  /**
   * Get API base URL
   */
  getAPIBase() {
    // Production: use Render backend URL
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return 'https://nxtbus-backend.onrender.com/api';
    }
    
    // Development: use localhost
    return 'http://localhost:3001/api';
  }

  /**
   * Start GPS simulation for a driver
   */
  startSimulation(driverId, tripData) {
    if (!this.isEnabled) {
      console.log('GPS simulation disabled');
      return null;
    }

    const { routeId, busId, tripId } = tripData;
    const route = this.routes.get(routeId);
    
    if (!route) {
      console.error('Route not found for GPS simulation:', routeId);
      return null;
    }

    // Create waypoints from route
    const waypoints = this.createWaypoints(route);
    
    const simulation = {
      driverId,
      tripId,
      busId,
      routeId,
      route,
      waypoints,
      currentWaypointIndex: 0,
      progress: 0, // 0 to 1 within current segment
      startTime: Date.now(),
      lastUpdate: Date.now(),
      speed: 0, // km/h
      heading: 0,
      isActive: true,
      totalDistance: 0,
      currentPosition: waypoints[0] || { lat: route.startLat, lon: route.startLon }
    };

    this.activeSimulations.set(driverId, simulation);
    console.log('🚌 Started GPS simulation for driver:', driverId, 'on route:', route.name);
    
    return simulation;
  }

  /**
   * Stop GPS simulation for a driver
   */
  stopSimulation(driverId) {
    const simulation = this.activeSimulations.get(driverId);
    if (simulation) {
      simulation.isActive = false;
      this.activeSimulations.delete(driverId);
      console.log('🛑 Stopped GPS simulation for driver:', driverId);
      return true;
    }
    return false;
  }

  /**
   * Get current GPS position for a driver
   */
  getCurrentPosition(driverId) {
    const simulation = this.activeSimulations.get(driverId);
    if (!simulation || !simulation.isActive) {
      return null;
    }

    // Update simulation
    this.updateSimulation(simulation);
    
    return {
      tripId: simulation.tripId,
      driverId: simulation.driverId,
      busId: simulation.busId,
      lat: simulation.currentPosition.lat,
      lon: simulation.currentPosition.lon,
      accuracy: 5 + Math.random() * 10, // 5-15m accuracy
      speed: simulation.speed / 3.6, // Convert km/h to m/s
      speedKmh: simulation.speed,
      heading: simulation.heading,
      altitude: 920 + Math.random() * 50, // Simulated altitude
      quality: this.getGPSQuality(simulation.currentPosition.accuracy || 10),
      timestamp: Date.now(),
      source: 'simulated_gps'
    };
  }

  /**
   * Update simulation position
   */
  updateSimulation(simulation) {
    const now = Date.now();
    const timeDelta = (now - simulation.lastUpdate) / 1000; // seconds
    simulation.lastUpdate = now;

    if (timeDelta <= 0) return;

    // Calculate movement based on time
    const baseSpeed = 25 + Math.random() * 20; // 25-45 km/h
    const speedVariation = Math.sin((now - simulation.startTime) / 10000) * 10; // Speed variation
    simulation.speed = Math.max(10, Math.min(60, baseSpeed + speedVariation));

    // Distance moved in this update (in km)
    const distanceMoved = (simulation.speed * timeDelta) / 3600;
    simulation.totalDistance += distanceMoved;

    // Update position along waypoints
    this.moveAlongWaypoints(simulation, distanceMoved);
  }

  /**
   * Move simulation along waypoints
   */
  moveAlongWaypoints(simulation, distanceKm) {
    const { waypoints } = simulation;
    if (simulation.currentWaypointIndex >= waypoints.length - 1) {
      // Reached end of route
      return;
    }

    const currentWaypoint = waypoints[simulation.currentWaypointIndex];
    const nextWaypoint = waypoints[simulation.currentWaypointIndex + 1];

    // Calculate segment distance
    const segmentDistance = this.calculateDistance(
      currentWaypoint.lat, currentWaypoint.lon,
      nextWaypoint.lat, nextWaypoint.lon
    );

    // Calculate how much of the segment we've completed
    const segmentProgress = simulation.progress + (distanceKm / segmentDistance);

    if (segmentProgress >= 1.0) {
      // Move to next waypoint
      simulation.currentWaypointIndex++;
      simulation.progress = 0;
      
      if (simulation.currentWaypointIndex < waypoints.length - 1) {
        // Continue with remaining distance
        const remainingDistance = distanceKm - ((1.0 - simulation.progress) * segmentDistance);
        this.moveAlongWaypoints(simulation, remainingDistance);
      } else {
        // Reached final waypoint
        simulation.currentPosition = waypoints[waypoints.length - 1];
      }
    } else {
      // Interpolate position within current segment
      simulation.progress = segmentProgress;
      
      simulation.currentPosition = {
        lat: currentWaypoint.lat + (nextWaypoint.lat - currentWaypoint.lat) * segmentProgress,
        lon: currentWaypoint.lon + (nextWaypoint.lon - currentWaypoint.lon) * segmentProgress
      };

      // Calculate heading
      simulation.heading = this.calculateBearing(
        currentWaypoint.lat, currentWaypoint.lon,
        nextWaypoint.lat, nextWaypoint.lon
      );
    }

    // Add small GPS jitter for realism
    const jitter = 0.0001; // ~10m
    simulation.currentPosition.lat += (Math.random() - 0.5) * jitter;
    simulation.currentPosition.lon += (Math.random() - 0.5) * jitter;
  }

  /**
   * Create waypoints from route data
   */
  createWaypoints(route) {
    const waypoints = [];
    
    // Start point
    waypoints.push({ lat: route.startLat, lon: route.startLon, name: 'Start' });
    
    // Add stops as waypoints
    if (route.stops && route.stops.length > 0) {
      const sortedStops = [...route.stops].sort((a, b) => (a.order || 0) - (b.order || 0));
      sortedStops.forEach(stop => {
        waypoints.push({
          lat: stop.lat,
          lon: stop.lon,
          name: stop.name,
          stopId: stop.id
        });
      });
    }
    
    // End point
    waypoints.push({ lat: route.endLat, lon: route.endLon, name: 'End' });
    
    return waypoints;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = this.toRadians(lon2 - lon1);
    const lat1Rad = this.toRadians(lat1);
    const lat2Rad = this.toRadians(lat2);
    
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    
    const bearing = Math.atan2(y, x);
    return (this.toDegrees(bearing) + 360) % 360;
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
   * Get GPS quality based on accuracy
   */
  getGPSQuality(accuracy) {
    if (accuracy <= 5) return 'excellent';
    if (accuracy <= 10) return 'good';
    if (accuracy <= 20) return 'fair';
    if (accuracy <= 50) return 'poor';
    return 'very_poor';
  }

  /**
   * Get all active simulations
   */
  getActiveSimulations() {
    return Array.from(this.activeSimulations.values()).filter(sim => sim.isActive);
  }

  /**
   * Get simulation status for a driver
   */
  getSimulationStatus(driverId) {
    const simulation = this.activeSimulations.get(driverId);
    if (!simulation) return null;

    return {
      driverId: simulation.driverId,
      tripId: simulation.tripId,
      routeName: simulation.route.name,
      isActive: simulation.isActive,
      currentWaypoint: simulation.currentWaypointIndex,
      totalWaypoints: simulation.waypoints.length,
      speed: simulation.speed,
      totalDistance: simulation.totalDistance,
      duration: Date.now() - simulation.startTime
    };
  }

  /**
   * Enable/disable simulation
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    if (!enabled) {
      // Stop all active simulations
      this.activeSimulations.forEach((sim, driverId) => {
        this.stopSimulation(driverId);
      });
    }
    console.log('GPS Simulation', enabled ? 'enabled' : 'disabled');
  }
}

// Create singleton instance
const driverGPSSimulator = new DriverGPSSimulator();

export default driverGPSSimulator;