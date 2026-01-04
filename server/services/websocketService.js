/**
 * WebSocket Service for Real-time Communication
 * Handles live GPS updates, notifications, and fleet tracking
 */

const { Server } = require('socket.io');
const { verifyToken } = require('../middleware/auth');
const { logSecurityEvent, logError } = require('../utils/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket mapping
    this.roomSubscriptions = new Map(); // room -> Set of userIds
    this.gpsUpdateInterval = null;
    this.notificationQueue = [];
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:5173", "http://localhost:3000"],
        credentials: true,
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.startPeriodicUpdates();

    console.log('🔌 WebSocket service initialized');
  }

  /**
   * Setup authentication middleware
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          logSecurityEvent('WEBSOCKET_AUTH_FAILED', {
            reason: 'no_token',
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          });
          return next(new Error('Authentication required'));
        }

        const decoded = verifyToken(token);
        if (!decoded) {
          logSecurityEvent('WEBSOCKET_AUTH_FAILED', {
            reason: 'invalid_token',
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          });
          return next(new Error('Invalid token'));
        }

        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.userData = decoded;
        
        console.log(`🔌 WebSocket authenticated: ${decoded.role} ${decoded.id}`);
        next();
      } catch (error) {
        logError(error, { context: 'websocket_auth', socket: socket.id });
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      // GPS tracking events
      socket.on('gps_update', (data) => this.handleGPSUpdate(socket, data));
      socket.on('subscribe_fleet_tracking', (data) => this.handleFleetTrackingSubscription(socket, data));
      socket.on('unsubscribe_fleet_tracking', () => this.handleFleetTrackingUnsubscription(socket));
      
      // Trip events
      socket.on('trip_start', (data) => this.handleTripStart(socket, data));
      socket.on('trip_end', (data) => this.handleTripEnd(socket, data));
      
      // Notification events
      socket.on('subscribe_notifications', () => this.handleNotificationSubscription(socket));
      socket.on('mark_notification_read', (data) => this.handleNotificationRead(socket, data));
      
      // Admin events
      socket.on('admin_broadcast', (data) => this.handleAdminBroadcast(socket, data));
      
      // Disconnect handling
      socket.on('disconnect', () => this.handleDisconnection(socket));
      
      // Error handling
      socket.on('error', (error) => {
        logError(error, { 
          context: 'websocket_error', 
          userId: socket.userId, 
          socketId: socket.id 
        });
      });
    });
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    const userId = socket.userId;
    const userRole = socket.userRole;
    
    // Store connection
    this.connectedUsers.set(userId, socket);
    
    // Join role-based room
    socket.join(`role_${userRole}`);
    
    // Join user-specific room
    socket.join(`user_${userId}`);
    
    // Send connection confirmation
    socket.emit('connected', {
      userId,
      role: userRole,
      timestamp: Date.now(),
      message: 'WebSocket connected successfully'
    });
    
    // Send any queued notifications
    this.sendQueuedNotifications(socket);
    
    console.log(`🔌 User connected: ${userRole} ${userId} (${this.connectedUsers.size} total)`);
  }

  /**
   * Handle GPS update from driver
   */
  async handleGPSUpdate(socket, data) {
    if (socket.userRole !== 'driver') {
      socket.emit('error', { message: 'Only drivers can send GPS updates' });
      return;
    }

    try {
      const { tripId, lat, lon, speed, heading, accuracy, timestamp } = data;
      
      // Validate GPS data
      if (!tripId || !lat || !lon) {
        socket.emit('error', { message: 'Invalid GPS data' });
        return;
      }

      const gpsUpdate = {
        tripId,
        driverId: socket.userId,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        speed: speed ? parseFloat(speed) : 0,
        heading: heading ? parseFloat(heading) : 0,
        accuracy: accuracy ? parseFloat(accuracy) : 0,
        timestamp: timestamp || Date.now(),
        receivedAt: Date.now()
      };

      // Update trip data (you would update your database here)
      await this.updateTripGPS(gpsUpdate);
      
      // Broadcast to fleet tracking subscribers
      this.broadcastGPSUpdate(gpsUpdate);
      
      // Send confirmation to driver
      socket.emit('gps_update_confirmed', {
        tripId,
        timestamp: gpsUpdate.receivedAt
      });

    } catch (error) {
      logError(error, { context: 'gps_update', userId: socket.userId });
      socket.emit('error', { message: 'Failed to process GPS update' });
    }
  }

  /**
   * Handle fleet tracking subscription
   */
  handleFleetTrackingSubscription(socket, data) {
    if (socket.userRole !== 'owner' && socket.userRole !== 'admin') {
      socket.emit('error', { message: 'Access denied' });
      return;
    }

    const { ownerId } = data || {};
    const roomName = socket.userRole === 'admin' ? 'fleet_tracking_all' : `fleet_tracking_${ownerId || socket.userId}`;
    
    socket.join(roomName);
    
    // Add to room subscriptions
    if (!this.roomSubscriptions.has(roomName)) {
      this.roomSubscriptions.set(roomName, new Set());
    }
    this.roomSubscriptions.get(roomName).add(socket.userId);
    
    socket.emit('fleet_tracking_subscribed', { room: roomName });
    
    // Send current fleet status
    this.sendCurrentFleetStatus(socket, ownerId);
  }

  /**
   * Handle fleet tracking unsubscription
   */
  handleFleetTrackingUnsubscription(socket) {
    // Remove from all fleet tracking rooms
    const rooms = Array.from(socket.rooms).filter(room => room.startsWith('fleet_tracking_'));
    rooms.forEach(room => {
      socket.leave(room);
      if (this.roomSubscriptions.has(room)) {
        this.roomSubscriptions.get(room).delete(socket.userId);
      }
    });
    
    socket.emit('fleet_tracking_unsubscribed');
  }

  /**
   * Handle trip start
   */
  async handleTripStart(socket, data) {
    if (socket.userRole !== 'driver') {
      socket.emit('error', { message: 'Only drivers can start trips' });
      return;
    }

    try {
      const tripData = {
        ...data,
        driverId: socket.userId,
        startTime: Date.now(),
        status: 'active'
      };

      // Create trip (you would save to database here)
      const trip = await this.createTrip(tripData);
      
      // Broadcast trip start
      this.broadcastTripEvent('trip_started', trip);
      
      socket.emit('trip_start_confirmed', trip);

    } catch (error) {
      logError(error, { context: 'trip_start', userId: socket.userId });
      socket.emit('error', { message: 'Failed to start trip' });
    }
  }

  /**
   * Handle trip end
   */
  async handleTripEnd(socket, data) {
    if (socket.userRole !== 'driver') {
      socket.emit('error', { message: 'Only drivers can end trips' });
      return;
    }

    try {
      const { tripId } = data;
      
      // End trip (you would update database here)
      const trip = await this.endTrip(tripId, socket.userId);
      
      // Broadcast trip end
      this.broadcastTripEvent('trip_ended', trip);
      
      socket.emit('trip_end_confirmed', trip);

    } catch (error) {
      logError(error, { context: 'trip_end', userId: socket.userId });
      socket.emit('error', { message: 'Failed to end trip' });
    }
  }

  /**
   * Handle notification subscription
   */
  handleNotificationSubscription(socket) {
    socket.join('notifications');
    socket.emit('notifications_subscribed');
  }

  /**
   * Handle admin broadcast
   */
  handleAdminBroadcast(socket, data) {
    if (socket.userRole !== 'admin') {
      socket.emit('error', { message: 'Admin access required' });
      return;
    }

    const { type, message, target } = data;
    
    // Broadcast to specific target or all users
    if (target === 'all') {
      this.io.emit('admin_notification', { type, message, timestamp: Date.now() });
    } else if (target.startsWith('role_')) {
      this.io.to(target).emit('admin_notification', { type, message, timestamp: Date.now() });
    } else {
      this.io.to(`user_${target}`).emit('admin_notification', { type, message, timestamp: Date.now() });
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnection(socket) {
    const userId = socket.userId;
    
    // Remove from connected users
    this.connectedUsers.delete(userId);
    
    // Remove from room subscriptions
    this.roomSubscriptions.forEach((users, room) => {
      users.delete(userId);
      if (users.size === 0) {
        this.roomSubscriptions.delete(room);
      }
    });
    
    console.log(`🔌 User disconnected: ${socket.userRole} ${userId} (${this.connectedUsers.size} remaining)`);
  }

  /**
   * Broadcast GPS update to fleet tracking subscribers
   */
  broadcastGPSUpdate(gpsUpdate) {
    // Broadcast to admin (all fleet)
    this.io.to('fleet_tracking_all').emit('gps_update', gpsUpdate);
    
    // Broadcast to specific owner (if trip has owner info)
    if (gpsUpdate.ownerId) {
      this.io.to(`fleet_tracking_${gpsUpdate.ownerId}`).emit('gps_update', gpsUpdate);
    }
  }

  /**
   * Broadcast trip events
   */
  broadcastTripEvent(eventType, tripData) {
    // Broadcast to admin
    this.io.to('role_admin').emit(eventType, tripData);
    
    // Broadcast to owner
    if (tripData.ownerId) {
      this.io.to(`user_${tripData.ownerId}`).emit(eventType, tripData);
    }
  }

  /**
   * Send notification to specific user or role
   */
  sendNotification(notification) {
    const { target, type, message, data } = notification;
    
    const notificationData = {
      id: `notif_${Date.now()}`,
      type,
      message,
      data,
      timestamp: Date.now()
    };
    
    if (target === 'all') {
      this.io.emit('notification', notificationData);
    } else if (target.startsWith('role_')) {
      this.io.to(target).emit('notification', notificationData);
    } else {
      this.io.to(`user_${target}`).emit('notification', notificationData);
    }
  }

  /**
   * Send emergency alert
   */
  sendEmergencyAlert(alert) {
    this.io.emit('emergency_alert', {
      ...alert,
      timestamp: Date.now(),
      priority: 'high'
    });
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Get users by role
   */
  getUsersByRole(role) {
    const users = [];
    this.connectedUsers.forEach((socket, userId) => {
      if (socket.userRole === role) {
        users.push(userId);
      }
    });
    return users;
  }

  /**
   * Start periodic updates
   */
  startPeriodicUpdates() {
    // Send fleet status updates every 5 seconds
    this.gpsUpdateInterval = setInterval(() => {
      this.sendPeriodicFleetUpdates();
    }, 5000);
  }

  /**
   * Send periodic fleet updates
   */
  async sendPeriodicFleetUpdates() {
    try {
      // Get current fleet status (you would fetch from database)
      const fleetStatus = await this.getCurrentFleetStatus();
      
      // Send to all fleet tracking subscribers
      this.roomSubscriptions.forEach((users, room) => {
        if (room.startsWith('fleet_tracking_')) {
          this.io.to(room).emit('fleet_status_update', fleetStatus);
        }
      });
    } catch (error) {
      logError(error, { context: 'periodic_fleet_updates' });
    }
  }

  /**
   * Cleanup on shutdown
   */
  cleanup() {
    if (this.gpsUpdateInterval) {
      clearInterval(this.gpsUpdateInterval);
    }
    
    if (this.io) {
      this.io.close();
    }
    
    this.connectedUsers.clear();
    this.roomSubscriptions.clear();
  }

  // Helper methods (these would interact with your actual database)
  async updateTripGPS(gpsUpdate) {
    // Update trip GPS in database
    // For now, just log it
    console.log('📍 GPS Update:', gpsUpdate);
  }

  async createTrip(tripData) {
    // Create trip in database
    return { id: `trip_${Date.now()}`, ...tripData };
  }

  async endTrip(tripId, driverId) {
    // End trip in database
    return { id: tripId, driverId, endTime: Date.now(), status: 'completed' };
  }

  async getCurrentFleetStatus() {
    // Get current fleet status from database
    return {
      totalBuses: 5,
      activeBuses: 3,
      onlineDrivers: 2,
      timestamp: Date.now()
    };
  }

  async sendCurrentFleetStatus(socket, ownerId) {
    const fleetStatus = await this.getCurrentFleetStatus();
    socket.emit('current_fleet_status', fleetStatus);
  }

  sendQueuedNotifications(socket) {
    // Send any queued notifications for this user
    const userNotifications = this.notificationQueue.filter(n => 
      n.target === socket.userId || n.target === `role_${socket.userRole}` || n.target === 'all'
    );
    
    userNotifications.forEach(notification => {
      socket.emit('notification', notification);
    });
  }
}

module.exports = new WebSocketService();