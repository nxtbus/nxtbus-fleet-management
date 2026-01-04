/**
 * Client-side WebSocket Service
 * Handles real-time communication with the server
 */

import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
    this.connectionPromise = null;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(token, userRole) {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    // Return existing connection promise if already connecting
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const host = this.getHost();
        const socketUrl = `http://${host}:3001`;

        this.socket = io(socketUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000
        });

        this.setupEventHandlers(resolve, reject);
        
      } catch (error) {
        console.error('WebSocket connection error:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Get appropriate host for WebSocket connection
   */
  getHost() {
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
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers(resolve, reject) {
    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.connectionPromise = null;
      resolve(this.socket);
    });

    this.socket.on('connected', (data) => {
      console.log('🔌 WebSocket authenticated:', data);
      this.emit('authenticated', data);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      this.isConnected = false;
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.connectionPromise = null;
        reject(error);
      }
      
      this.emit('connection_error', { error, attempts: this.reconnectAttempts });
    });

    this.socket.on('error', (error) => {
      console.error('🔌 WebSocket error:', error);
      this.emit('error', error);
    });

    // Real-time data events
    this.socket.on('gps_update', (data) => {
      this.emit('gps_update', data);
    });

    this.socket.on('fleet_status_update', (data) => {
      this.emit('fleet_status_update', data);
    });

    this.socket.on('trip_started', (data) => {
      this.emit('trip_started', data);
    });

    this.socket.on('trip_ended', (data) => {
      this.emit('trip_ended', data);
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('admin_notification', (data) => {
      this.emit('admin_notification', data);
    });

    this.socket.on('emergency_alert', (data) => {
      this.emit('emergency_alert', data);
    });

    // Subscription confirmations
    this.socket.on('fleet_tracking_subscribed', (data) => {
      console.log('📍 Fleet tracking subscribed:', data);
      this.emit('fleet_tracking_subscribed', data);
    });

    this.socket.on('notifications_subscribed', () => {
      console.log('🔔 Notifications subscribed');
      this.emit('notifications_subscribed');
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.connectionPromise = null;
    }
  }

  /**
   * Subscribe to fleet tracking updates
   */
  subscribeToFleetTracking(ownerId = null) {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_fleet_tracking', { ownerId });
    }
  }

  /**
   * Unsubscribe from fleet tracking updates
   */
  unsubscribeFromFleetTracking() {
    if (this.socket && this.isConnected) {
      this.socket.emit('unsubscribe_fleet_tracking');
    }
  }

  /**
   * Subscribe to notifications
   */
  subscribeToNotifications() {
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe_notifications');
    }
  }

  /**
   * Send GPS update (for drivers)
   */
  sendGPSUpdate(gpsData) {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, cannot send GPS update');
      return false;
    }

    try {
      // Enhanced GPS data with validation
      const gpsUpdate = {
        tripId: gpsData.tripId,
        driverId: gpsData.driverId,
        busId: gpsData.busId,
        lat: parseFloat(gpsData.lat),
        lon: parseFloat(gpsData.lon),
        accuracy: gpsData.accuracy || 0,
        speed: gpsData.speed || 0, // m/s
        speedKmh: gpsData.speedKmh || (gpsData.speed * 3.6) || 0,
        heading: gpsData.heading || 0,
        altitude: gpsData.altitude || null,
        quality: gpsData.quality || 'unknown',
        timestamp: gpsData.timestamp || Date.now(),
        source: gpsData.source || 'device_gps'
      };

      this.socket.emit('gps_update', gpsUpdate);
      console.log('📡 GPS update sent via WebSocket:', gpsUpdate);
      return true;
    } catch (error) {
      console.error('Failed to send GPS update:', error);
      return false;
    }
  }

  /**
   * Start trip (for drivers)
   */
  startTrip(tripData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('trip_start', tripData);
    }
  }

  /**
   * End trip (for drivers)
   */
  endTrip(tripData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('trip_end', tripData);
    }
  }

  /**
   * Send admin broadcast (for admins)
   */
  sendAdminBroadcast(broadcastData) {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin_broadcast', broadcastData);
    }
  }

  /**
   * Mark notification as read
   */
  markNotificationRead(notificationId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_notification_read', { id: notificationId });
    }
  }

  /**
   * Add event listener
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id || null
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;