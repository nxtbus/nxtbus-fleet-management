/**
 * React Hook for WebSocket Integration
 * Provides real-time data updates for components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import websocketService from '../services/websocketService';

export function useWebSocket(token, userRole) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const connectionAttempted = useRef(false);

  useEffect(() => {
    if (!token || !userRole || connectionAttempted.current) return;

    connectionAttempted.current = true;

    const connect = async () => {
      try {
        await websocketService.connect(token, userRole);
        setIsConnected(true);
        setConnectionError(null);
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        setConnectionError(error.message);
        setIsConnected(false);
      }
    };

    // Event listeners
    const handleAuthenticated = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleConnectionError = ({ error, attempts }) => {
      setConnectionError(error.message);
      setReconnectAttempts(attempts);
    };

    websocketService.on('authenticated', handleAuthenticated);
    websocketService.on('disconnected', handleDisconnected);
    websocketService.on('connection_error', handleConnectionError);

    connect();

    return () => {
      websocketService.off('authenticated', handleAuthenticated);
      websocketService.off('disconnected', handleDisconnected);
      websocketService.off('connection_error', handleConnectionError);
    };
  }, [token, userRole]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setIsConnected(false);
    connectionAttempted.current = false;
  }, []);

  return {
    isConnected,
    connectionError,
    reconnectAttempts,
    disconnect,
    websocketService
  };
}

export function useFleetTracking(ownerId = null) {
  const [fleetData, setFleetData] = useState(null);
  const [gpsUpdates, setGpsUpdates] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Subscribe to fleet tracking
    websocketService.subscribeToFleetTracking(ownerId);

    const handleFleetStatusUpdate = (data) => {
      setFleetData(data);
      setLastUpdate(new Date());
    };

    const handleGpsUpdate = (data) => {
      setGpsUpdates(prev => {
        // Keep only last 100 GPS updates
        const updated = [...prev, data].slice(-100);
        return updated;
      });
      setLastUpdate(new Date());
    };

    const handleTripStarted = (data) => {
      console.log('Trip started:', data);
      // You can update local state or trigger notifications
    };

    const handleTripEnded = (data) => {
      console.log('Trip ended:', data);
      // You can update local state or trigger notifications
    };

    websocketService.on('fleet_status_update', handleFleetStatusUpdate);
    websocketService.on('gps_update', handleGpsUpdate);
    websocketService.on('trip_started', handleTripStarted);
    websocketService.on('trip_ended', handleTripEnded);

    return () => {
      websocketService.unsubscribeFromFleetTracking();
      websocketService.off('fleet_status_update', handleFleetStatusUpdate);
      websocketService.off('gps_update', handleGpsUpdate);
      websocketService.off('trip_started', handleTripStarted);
      websocketService.off('trip_ended', handleTripEnded);
    };
  }, [ownerId]);

  return {
    fleetData,
    gpsUpdates,
    lastUpdate
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to notifications
    websocketService.subscribeToNotifications();

    const handleNotification = (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(notification.message, {
          icon: '/favicon.ico',
          tag: notification.id
        });
      }
    };

    const handleAdminNotification = (notification) => {
      setNotifications(prev => [
        { ...notification, isAdmin: true }, 
        ...prev
      ].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    };

    const handleEmergencyAlert = (alert) => {
      setNotifications(prev => [
        { ...alert, isEmergency: true }, 
        ...prev
      ].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      
      // Always show emergency alerts
      if (Notification.permission === 'granted') {
        new Notification(`🚨 EMERGENCY: ${alert.message}`, {
          icon: '/favicon.ico',
          tag: alert.id,
          requireInteraction: true
        });
      }
    };

    websocketService.on('notification', handleNotification);
    websocketService.on('admin_notification', handleAdminNotification);
    websocketService.on('emergency_alert', handleEmergencyAlert);

    return () => {
      websocketService.off('notification', handleNotification);
      websocketService.off('admin_notification', handleAdminNotification);
      websocketService.off('emergency_alert', handleEmergencyAlert);
    };
  }, []);

  const markAsRead = useCallback((notificationId) => {
    websocketService.markNotificationRead(notificationId);
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  };
}

export function useDriverGPS() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [trackingError, setTrackingError] = useState(null);
  const watchId = useRef(null);

  const startTracking = useCallback((tripId) => {
    if (!navigator.geolocation) {
      setTrackingError('Geolocation not supported');
      return;
    }

    setIsTracking(true);
    setTrackingError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 1000
    };

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const gpsData = {
          tripId,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          speed: position.coords.speed || 0,
          heading: position.coords.heading || 0,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };

        setCurrentPosition(gpsData);
        
        // Send GPS update via WebSocket
        websocketService.sendGPSUpdate(gpsData);
      },
      (error) => {
        console.error('GPS tracking error:', error);
        setTrackingError(error.message);
      },
      options
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId.current) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
    setCurrentPosition(null);
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return {
    isTracking,
    currentPosition,
    trackingError,
    startTracking,
    stopTracking
  };
}