/**
 * Real-time Notifications Component
 * Displays WebSocket notifications with different types and priorities
 */

import { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useWebSocket';
import './RealTimeNotifications.css';

function RealTimeNotifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [showPanel, setShowPanel] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);

  // Show notification popup for important notifications
  useEffect(() => {
    const latestNotification = notifications[0];
    if (latestNotification && !latestNotification.read) {
      if (latestNotification.isEmergency || latestNotification.isAdmin) {
        setActiveNotification(latestNotification);
        
        // Auto-hide after 10 seconds for non-emergency notifications
        if (!latestNotification.isEmergency) {
          setTimeout(() => {
            setActiveNotification(null);
          }, 10000);
        }
      }
    }
  }, [notifications]);

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setActiveNotification(null);
  };

  const getNotificationIcon = (notification) => {
    if (notification.isEmergency) return '🚨';
    if (notification.isAdmin) return '📢';
    if (notification.type === 'delay') return '⚠️';
    if (notification.type === 'speed') return '⚡';
    if (notification.type === 'trip') return '🚌';
    return '🔔';
  };

  const getNotificationClass = (notification) => {
    let className = 'notification-item';
    if (notification.isEmergency) className += ' emergency';
    if (notification.isAdmin) className += ' admin';
    if (!notification.read) className += ' unread';
    return className;
  };

  return (
    <>
      {/* Notification Bell */}
      <div className="notification-bell" onClick={() => setShowPanel(!showPanel)}>
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount}</span>
        )}
      </div>

      {/* Active Notification Popup */}
      {activeNotification && (
        <div 
          className={`realtime-notification ${activeNotification.isEmergency ? 'emergency' : ''}`}
          onClick={() => handleNotificationClick(activeNotification)}
        >
          <div className="notification-header">
            <span className="notification-icon">
              {getNotificationIcon(activeNotification)}
            </span>
            <span className="notification-title">
              {activeNotification.isEmergency ? 'EMERGENCY ALERT' : 
               activeNotification.isAdmin ? 'Admin Notification' : 'Notification'}
            </span>
            <button 
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation();
                setActiveNotification(null);
              }}
            >
              ×
            </button>
          </div>
          <div className="notification-message">
            {activeNotification.message}
          </div>
          {activeNotification.data?.message && (
            <div className="notification-details">
              {activeNotification.data.message}
            </div>
          )}
          <div className="notification-time">
            {new Date(activeNotification.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Notification Panel */}
      {showPanel && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button 
                  className="mark-all-read"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </button>
              )}
              <button 
                className="close-panel"
                onClick={() => setShowPanel(false)}
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={getNotificationClass(notification)}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <span className="notification-icon">
                      {getNotificationIcon(notification)}
                    </span>
                    <div className="notification-text">
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      {notification.data?.message && (
                        <div className="notification-details">
                          {notification.data.message}
                        </div>
                      )}
                      <div className="notification-time">
                        {new Date(notification.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Panel Overlay */}
      {showPanel && (
        <div 
          className="notification-overlay"
          onClick={() => setShowPanel(false)}
        />
      )}
    </>
  );
}

export default RealTimeNotifications;