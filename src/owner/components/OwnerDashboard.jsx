import { useState, useEffect, useCallback, useRef } from 'react';
import { getFleetOverview, getActiveDelays, getOverspeedAlerts, getTimingAlerts } from '../services/ownerService';
import { useWebSocket, useFleetTracking, useNotifications } from '../../hooks/useWebSocket';
import { getCurrentOwner } from '../services/ownerAuth';

function OwnerDashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [delays, setDelays] = useState([]);
  const [speedAlerts, setSpeedAlerts] = useState([]);
  const [timingAlerts, setTimingAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const intervalRef = useRef(null);

  // Get current owner for WebSocket connection
  const currentOwner = getCurrentOwner();
  const token = localStorage.getItem('nxtbus_owner_token'); // You'll need to store the JWT token

  // WebSocket integration
  const { isConnected, connectionError } = useWebSocket(token, 'owner');
  const { fleetData, gpsUpdates, lastUpdate: wsLastUpdate } = useFleetTracking(currentOwner?.id);
  const { notifications, unreadCount } = useNotifications();

  const loadData = useCallback(async () => {
    try {
      const [overview, delaysData, speedData, timingData] = await Promise.all([
        getFleetOverview(),
        getActiveDelays(),
        getOverspeedAlerts(),
        getTimingAlerts()
      ]);
      setStats(overview);
      setDelays(delaysData);
      setSpeedAlerts(speedData);
      setTimingAlerts(timingData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update stats when WebSocket fleet data changes
  useEffect(() => {
    if (fleetData) {
      setStats(prevStats => ({
        ...prevStats,
        ...fleetData
      }));
      setLastUpdate(wsLastUpdate);
    }
  }, [fleetData, wsLastUpdate]);

  // Fallback polling when WebSocket is not connected
  useEffect(() => {
    if (!isConnected && isLive) {
      intervalRef.current = setInterval(loadData, 10000); // Slower polling as fallback
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [loadData, isLive, isConnected]);

  if (loading) {
    return <div className="loading">Loading owner dashboard...</div>;
  }

  const totalAlerts = delays.length + speedAlerts.length + timingAlerts.length;

  return (
    <div className="owner-dashboard ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">🏢</span>
              Fleet Command Center
            </h2>
            <p className="ultra-subtitle">Real-time fleet monitoring and operational insights</p>
            <div className="connection-status">
              {isConnected ? (
                <span className="status-connected">
                  🟢 Live Updates Active
                </span>
              ) : (
                <span className="status-disconnected">
                  🔴 {connectionError ? 'Connection Error' : 'Connecting...'}
                </span>
              )}
              {unreadCount > 0 && (
                <span className="notification-badge">
                  🔔 {unreadCount} new
                </span>
              )}
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-pill live">
              <span className="stat-value">{stats?.busesOnTrip || 0}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-pill total">
              <span className="stat-value">{stats?.totalBuses || 0}</span>
              <span className="stat-label">Fleet</span>
            </div>
            <div className="stat-pill drivers">
              <span className="stat-value">{stats?.activeDrivers || 0}</span>
              <span className="stat-label">Drivers</span>
            </div>
          </div>
        </div>
        <div className="live-indicator">
          <div className="live-dot"></div>
          <span>Live Updates</span>
          <small>• {new Date().toLocaleTimeString()}</small>
        </div>
      </div>

      {/* Ultra-Modern Key Metrics */}
      <div className="ultra-stats-grid">
        <div className="ultra-stat-card primary" onClick={() => onNavigate('tracking')}>
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.busesOnTrip || 0}</div>
            <div className="stat-label">Buses On Trip</div>
            <div className="stat-sub">of {stats?.activeBuses || 0} active</div>
          </div>
          <div className="stat-trend">
            <span className="trend-icon">📈</span>
          </div>
        </div>

        <div className="ultra-stat-card fleet" onClick={() => onNavigate('fleet')}>
          <div className="stat-icon">🚌</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.totalBuses || 0}</div>
            <div className="stat-label">Total Fleet</div>
            <div className="stat-sub">{stats?.activeBuses || 0} active</div>
          </div>
        </div>

        <div className="ultra-stat-card drivers" onClick={() => onNavigate('fleet')}>
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <div className="stat-value">{stats?.totalDrivers || 0}</div>
            <div className="stat-label">Drivers</div>
            <div className="stat-sub">{stats?.activeDrivers || 0} active</div>
          </div>
        </div>

        <div className={`ultra-stat-card alerts ${totalAlerts > 0 ? 'warning' : 'success'}`}>
          <div className="stat-icon">{totalAlerts > 0 ? '🚨' : '✅'}</div>
          <div className="stat-content">
            <div className="stat-value">{totalAlerts}</div>
            <div className="stat-label">Active Alerts</div>
            <div className="stat-sub">{totalAlerts === 0 ? 'All clear' : 'Needs attention'}</div>
          </div>
          {totalAlerts > 0 && <div className="alert-pulse"></div>}
        </div>
      </div>

      {/* Ultra-Modern Alert Dashboard */}
      <div className="ultra-alert-dashboard">
        <div className="alert-dashboard-header">
          <h3 className="dashboard-title">
            <span className="dashboard-icon">🚨</span>
            Alert Command Center
          </h3>
        </div>

        <div className="ultra-alert-grid">
          {/* Delay Alerts */}
          <div className={`ultra-alert-card ${delays.length > 0 ? 'has-alerts' : ''}`} onClick={() => onNavigate('delays')}>
            <div className="alert-card-header">
              <div className="alert-type-info">
                <span className="alert-icon">⚠️</span>
                <div className="alert-type-text">
                  <h4>Delay Alerts</h4>
                  <p>Service disruptions</p>
                </div>
              </div>
              <div className="alert-count-badge">{delays.length}</div>
            </div>
            {delays.length > 0 ? (
              <div className="alert-preview-section">
                {delays.slice(0, 2).map((delay, index) => (
                  <div key={delay.id} className="alert-preview-item" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="preview-bus">🚌 {delay.busNumber}</div>
                    <div className="preview-delay">+{delay.delayMinutes} min</div>
                  </div>
                ))}
                {delays.length > 2 && (
                  <div className="more-alerts-indicator">+{delays.length - 2} more alerts</div>
                )}
              </div>
            ) : (
              <div className="no-alerts-state">
                <span className="no-alerts-icon">✅</span>
                <p>No active delays</p>
              </div>
            )}
          </div>

          {/* Speed Alerts */}
          <div className={`ultra-alert-card speed ${speedAlerts.length > 0 ? 'has-alerts danger' : ''}`} onClick={() => onNavigate('speed')}>
            <div className="alert-card-header">
              <div className="alert-type-info">
                <span className="alert-icon">⚡</span>
                <div className="alert-type-text">
                  <h4>Speed Alerts</h4>
                  <p>Overspeed violations</p>
                </div>
              </div>
              <div className="alert-count-badge danger">{speedAlerts.length}</div>
            </div>
            {speedAlerts.length > 0 ? (
              <div className="alert-preview-section">
                {speedAlerts.slice(0, 2).map((alert, index) => (
                  <div key={index} className="alert-preview-item danger" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="preview-bus">🚌 {alert.busNumber}</div>
                    <div className="preview-speed">{alert.currentSpeed} km/h</div>
                  </div>
                ))}
                {speedAlerts.length > 2 && (
                  <div className="more-alerts-indicator">+{speedAlerts.length - 2} more alerts</div>
                )}
              </div>
            ) : (
              <div className="no-alerts-state">
                <span className="no-alerts-icon">🛡️</span>
                <p>All buses within speed limit</p>
              </div>
            )}
          </div>

          {/* Timing Alerts */}
          <div className={`ultra-alert-card timing ${timingAlerts.length > 0 ? 'has-alerts' : ''}`} onClick={() => onNavigate('timing')}>
            <div className="alert-card-header">
              <div className="alert-type-info">
                <span className="alert-icon">⏰</span>
                <div className="alert-type-text">
                  <h4>Timing Alerts</h4>
                  <p>Schedule deviations</p>
                </div>
              </div>
              <div className="alert-count-badge">{timingAlerts.length}</div>
            </div>
            {timingAlerts.length > 0 ? (
              <div className="alert-preview-section">
                {timingAlerts.slice(0, 2).map((alert, index) => (
                  <div key={index} className="alert-preview-item" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="preview-bus">🚌 {alert.busNumber}</div>
                    <div className="preview-timing">{alert.type === 'late_departure' ? 'Late Start' : 'Late Arrival'}</div>
                  </div>
                ))}
                {timingAlerts.length > 2 && (
                  <div className="more-alerts-indicator">+{timingAlerts.length - 2} more alerts</div>
                )}
              </div>
            ) : (
              <div className="no-alerts-state">
                <span className="no-alerts-icon">⏱️</span>
                <p>All buses on schedule</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ultra-Modern Quick Actions */}
      <div className="ultra-quick-actions">
        <div className="quick-actions-header">
          <h3 className="actions-title">
            <span className="actions-icon">⚡</span>
            Quick Actions
          </h3>
        </div>
        <div className="ultra-action-grid">
          <button className="ultra-action-btn primary" onClick={() => onNavigate('tracking')}>
            <div className="action-icon-wrapper">
              <span className="action-icon">🗺️</span>
            </div>
            <div className="action-content">
              <span className="action-title">Live Tracking</span>
              <span className="action-subtitle">Real-time fleet map</span>
            </div>
          </button>
          <button className="ultra-action-btn" onClick={() => onNavigate('fleet')}>
            <div className="action-icon-wrapper">
              <span className="action-icon">📋</span>
            </div>
            <div className="action-content">
              <span className="action-title">Fleet Details</span>
              <span className="action-subtitle">Buses & drivers</span>
            </div>
          </button>
          <button className="ultra-action-btn" onClick={() => onNavigate('analytics')}>
            <div className="action-icon-wrapper">
              <span className="action-icon">📊</span>
            </div>
            <div className="action-content">
              <span className="action-title">Analytics</span>
              <span className="action-subtitle">Stop performance</span>
            </div>
          </button>
          <button className="ultra-action-btn warning" onClick={() => onNavigate('speed')}>
            <div className="action-icon-wrapper">
              <span className="action-icon">🚨</span>
            </div>
            <div className="action-content">
              <span className="action-title">Speed Monitor</span>
              <span className="action-subtitle">Safety oversight</span>
            </div>
          </button>
        </div>
      </div>

      {/* Ultra-Modern Route Status */}
      <div className="ultra-route-status">
        <div className="route-status-header">
          <h3 className="status-title">
            <span className="status-icon">🛣️</span>
            Route Operations
          </h3>
          <div className="route-summary">
            <span className="route-metric active">{stats?.activeRoutes || 0} Active</span>
            <span className="route-metric total">{stats?.totalRoutes || 0} Total</span>
          </div>
        </div>
        <div className="route-status-visual">
          <div className="route-progress-bar">
            <div 
              className="route-progress-fill"
              style={{ width: `${stats?.totalRoutes ? (stats.activeRoutes / stats.totalRoutes) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="route-status-text">
            {stats?.activeRoutes || 0} of {stats?.totalRoutes || 0} routes currently active
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerDashboard;
