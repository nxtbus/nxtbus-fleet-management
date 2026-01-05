/**
 * Delay Notification Component
 * Shows real-time delay alerts to passengers
 */

import { useState, useEffect } from 'react';
import { subscribeToDelays, getDelaysForRoute, getDelaysForBus } from '../services/delayDetectionService';

// Toast notification for new delays
export function DelayToast({ delay, onDismiss }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 300);
    }, 10000); // Auto-dismiss after 10 seconds
    
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!delay) return null;

  return (
    <div className={`delay-toast ${visible ? 'visible' : 'hiding'}`}>
      <div className="toast-icon">⏰</div>
      <div className="toast-content">
        <div className="toast-title">Bus {delay.busNumber} Delayed</div>
        <div className="toast-message">
          Running ~{delay.delayMinutes} min behind schedule
        </div>
      </div>
      <button className="toast-dismiss" onClick={() => { setVisible(false); onDismiss(); }}>
        ✕
      </button>
    </div>
  );
}

// Inline delay badge for bus cards
export function DelayBadge({ delayMinutes, severity = 'LOW' }) {
  if (!delayMinutes || delayMinutes < 5) return null;

  return (
    <span className={`delay-badge ${(severity || 'LOW').toLowerCase()}`}>
      ⏰ +{delayMinutes} min
    </span>
  );
}

// Delay alert banner for route view
export function DelayAlertBanner({ busId, routeId, busNumber }) {
  const [delays, setDelays] = useState([]);

  useEffect(() => {
    loadDelays();
    
    // Subscribe to real-time delay updates
    const unsubscribe = subscribeToDelays((event) => {
      if (event.type === 'DELAY_DETECTED') {
        if (event.delay.busId === busId || event.delay.routeId === routeId) {
          loadDelays();
        }
      }
    });

    return () => unsubscribe();
  }, [busId, routeId]);

  const loadDelays = async () => {
    try {
      let delayList = [];
      if (busId) {
        delayList = await getDelaysForBus(busId);
      } else if (routeId) {
        delayList = await getDelaysForRoute(routeId);
      }
      setDelays(delayList.filter(d => d.status === 'active'));
    } catch (error) {
      console.error('Error loading delays:', error);
    }
  };

  if (delays.length === 0) return null;

  return (
    <div className="delay-alert-banner">
      {delays.map(delay => (
        <div key={delay.id} className={`delay-alert ${delay.delayMinutes >= 10 ? 'severe' : ''}`}>
          <span className="delay-icon">⏰</span>
          <div className="delay-info">
            <strong>Bus {delay.busNumber || busNumber} is delayed</strong>
            <span>Running ~{delay.delayMinutes} minutes behind schedule</span>
            {delay.reason && <small>{delay.reason}</small>}
          </div>
        </div>
      ))}
    </div>
  );
}

// Notification list for viewing all notifications
export function NotificationList({ routeIds = [], onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, [routeIds]);

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/notifications`);
      const allNotifs = await response.json();
      
      // Filter by route if specified
      const filtered = routeIds.length > 0
        ? allNotifs.filter(n => 
            !n.targetRoutes?.length || 
            n.targetRoutes.some(r => routeIds.includes(r))
          )
        : allNotifs;
      
      // Sort by date, newest first
      filtered.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
      
      setNotifications(filtered.slice(0, 20)); // Last 20 notifications
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getTypeIcon = (type) => {
    const icons = {
      delay: '⏰',
      diversion: '🚧',
      alert: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || '📢';
  };

  if (loading) {
    return <div className="notification-loading">Loading notifications...</div>;
  }

  return (
    <div className="notification-list-container">
      <div className="notification-list-header">
        <h3>🔔 Notifications</h3>
        {onClose && <button onClick={onClose}>✕</button>}
      </div>
      
      {notifications.length === 0 ? (
        <div className="no-notifications">
          <span>📭</span>
          <p>No notifications</p>
        </div>
      ) : (
        <div className="notification-items">
          {notifications.map(notif => (
            <div key={notif.id} className={`notification-item ${notif.type}`}>
              <span className="notif-icon">{getTypeIcon(notif.type)}</span>
              <div className="notif-content">
                <div className="notif-title">{notif.title}</div>
                <div className="notif-message">{notif.message}</div>
                <div className="notif-time">{formatTime(notif.sentAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper to get API URL
function getApiUrl() {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:3001`;
}

export default {
  DelayToast,
  DelayBadge,
  DelayAlertBanner,
  NotificationList
};
