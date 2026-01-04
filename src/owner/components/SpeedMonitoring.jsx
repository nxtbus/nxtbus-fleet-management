import { useState, useEffect, useCallback, useRef } from 'react';
import { getSpeedData, getOverspeedAlerts } from '../services/ownerService';

function SpeedMonitoring() {
  const [speedData, setSpeedData] = useState([]);
  const [overspeedAlerts, setOverspeedAlerts] = useState([]);
  const [speedLimit, setSpeedLimit] = useState(60);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [data, alerts] = await Promise.all([
        getSpeedData(),
        getOverspeedAlerts()
      ]);
      setSpeedData(data);
      setOverspeedAlerts(alerts);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load speed data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 3 seconds for real-time speed monitoring
    intervalRef.current = setInterval(loadData, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  const getSpeedClass = (speed) => {
    if (speed > speedLimit) return 'danger';
    if (speed > speedLimit * 0.8) return 'warning';
    return 'safe';
  };

  const getSpeedPercentage = (speed) => {
    return Math.min(100, (speed / (speedLimit * 1.5)) * 100);
  };

  if (loading) {
    return <div className="loading">Loading speed monitoring...</div>;
  }

  return (
    <div className="speed-monitoring ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">🚨</span>
              Speed Monitoring & Overspeed Alerts
            </h2>
            <p className="ultra-subtitle">Real-time speed tracking and safety monitoring</p>
          </div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
            {lastUpdate && <small className="separator"> • {lastUpdate.toLocaleTimeString()}</small>}
          </div>
        </div>
        <div className="header-stats">
          <div className="speed-limit-control">
            <label>Speed Limit:</label>
            <input
              type="number"
              value={speedLimit}
              onChange={(e) => setSpeedLimit(Number(e.target.value))}
              min="30"
              max="120"
              className="ultra-speed-input"
            />
            <span>km/h</span>
          </div>
        </div>
      </div>

      {/* Overspeed Alerts Banner */}
      {overspeedAlerts.length > 0 && (
        <div className="ultra-overspeed-banner">
          <div className="banner-icon">🚨</div>
          <div className="banner-content">
            <h3>{overspeedAlerts.length} Overspeed Alert{overspeedAlerts.length > 1 ? 's' : ''}</h3>
            <p>The following buses are exceeding the speed limit</p>
          </div>
        </div>
      )}

      {/* Ultra-Modern Stats Grid */}
      <div className="ultra-stats-grid">
        <div className="ultra-stat-card primary">
          <div className="stat-icon">🚌</div>
          <div className="stat-content">
            <span className="stat-value">{speedData.length}</span>
            <span className="stat-label">Buses Tracked</span>
            <span className="stat-sub">Currently monitored</span>
          </div>
        </div>
        <div className="ultra-stat-card alerts danger">
          <div className="stat-icon">🚨</div>
          <div className="stat-content">
            <span className="stat-value">{speedData.filter(d => d.isOverspeed).length}</span>
            <span className="stat-label">Overspeeding</span>
            <span className="stat-sub">Immediate attention</span>
          </div>
          {speedData.filter(d => d.isOverspeed).length > 0 && <div className="alert-pulse"></div>}
        </div>
        <div className="ultra-stat-card alerts success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{speedData.filter(d => !d.isOverspeed).length}</span>
            <span className="stat-label">Within Limit</span>
            <span className="stat-sub">Safe driving</span>
          </div>
        </div>
        <div className="ultra-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-value">
              {speedData.length > 0 
                ? Math.round(speedData.reduce((sum, d) => sum + d.currentSpeed, 0) / speedData.length)
                : 0}
            </span>
            <span className="stat-label">Avg Speed</span>
            <span className="stat-sub">km/h</span>
          </div>
        </div>
      </div>

      {/* Active Overspeed Alerts */}
      {overspeedAlerts.length > 0 && (
        <div className="ultra-overspeed-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-icon">⚠️</span>
              Active Overspeed Alerts
            </h3>
          </div>
          <div className="ultra-overspeed-grid">
            {overspeedAlerts.map((alert, idx) => (
              <div key={idx} className="ultra-overspeed-card">
                <div className="overspeed-card-header">
                  <div className="bus-info">
                    <span className="bus-badge danger">🚌 {alert.busNumber}</span>
                    <span className="speed-value danger">{alert.currentSpeed} km/h</span>
                  </div>
                  <div className="alert-severity">
                    <span className="severity-badge high">🔴 Critical</span>
                  </div>
                </div>
                <div className="overspeed-card-body">
                  <div className="overspeed-detail">
                    <span className="detail-icon">👤</span>
                    <span className="detail-label">Driver:</span>
                    <span className="detail-value">{alert.driverName}</span>
                  </div>
                  <div className="overspeed-detail">
                    <span className="detail-icon">⚡</span>
                    <span className="detail-label">Excess Speed:</span>
                    <span className="detail-value danger">+{alert.excessSpeed} km/h</span>
                  </div>
                  <div className="overspeed-detail">
                    <span className="detail-icon">🕐</span>
                    <span className="detail-label">Detected:</span>
                    <span className="detail-value">{alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Now'}</span>
                  </div>
                </div>
                <div className="overspeed-action">
                  <span className="action-hint">⚠️ Contact driver immediately</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultra-Modern Speed Monitor */}
      <div className="ultra-speed-monitor-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">📊</span>
            Real-Time Speed Monitor
          </h3>
        </div>
        
        {speedData.length === 0 ? (
          <div className="ultra-empty-state">
            <span className="empty-icon">🚌</span>
            <h4>No buses currently on trip</h4>
            <p>Speed monitoring will appear when buses start their trips</p>
          </div>
        ) : (
          <div className="ultra-speed-monitor-grid">
            {speedData.map(bus => (
              <div key={bus.tripId} className={`ultra-speed-card ${getSpeedClass(bus.currentSpeed)}`}>
                <div className="speed-card-header">
                  <div className="bus-info">
                    <span className="bus-number">{bus.busNumber}</span>
                    <span className="route-name">{bus.routeName}</span>
                  </div>
                  <div className={`current-speed ${getSpeedClass(bus.currentSpeed)}`}>
                    {bus.currentSpeed} <small>km/h</small>
                  </div>
                </div>

                <div className="ultra-speed-gauge">
                  <div className="gauge-track">
                    <div 
                      className={`gauge-fill ${getSpeedClass(bus.currentSpeed)}`}
                      style={{ width: `${getSpeedPercentage(bus.currentSpeed)}%` }}
                    ></div>
                    <div 
                      className="speed-limit-marker"
                      style={{ left: `${(speedLimit / (speedLimit * 1.5)) * 100}%` }}
                    ></div>
                  </div>
                  <div className="gauge-labels">
                    <span>0</span>
                    <span className="limit-label">{speedLimit}</span>
                    <span>{Math.round(speedLimit * 1.5)}</span>
                  </div>
                </div>

                <div className="speed-card-body">
                  <div className="speed-detail">
                    <span className="detail-icon">👤</span>
                    <span className="detail-label">Driver</span>
                    <span className="detail-value">{bus.driverName}</span>
                  </div>
                  <div className="speed-detail">
                    <span className="detail-icon">📈</span>
                    <span className="detail-label">Max Speed</span>
                    <span className={`detail-value ${bus.maxSpeed > speedLimit ? 'danger' : ''}`}>
                      {bus.maxSpeed} km/h
                    </span>
                  </div>
                  <div className="speed-detail">
                    <span className="detail-icon">📊</span>
                    <span className="detail-label">Avg Speed</span>
                    <span className="detail-value">{bus.avgSpeed} km/h</span>
                  </div>
                  <div className="speed-detail">
                    <span className="detail-icon">⚠️</span>
                    <span className="detail-label">Violations</span>
                    <span className={`detail-value ${bus.overspeedCount > 0 ? 'warning' : ''}`}>
                      {bus.overspeedCount}
                    </span>
                  </div>
                </div>

                <div className="speed-card-footer">
                  <span className="last-update">
                    Updated: {bus.lastUpdate ? new Date(bus.lastUpdate).toLocaleTimeString() : 'N/A'}
                  </span>
                  {bus.isOverspeed && (
                    <span className="overspeed-badge">⚠️ OVERSPEED</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ultra-Modern Safety Tips */}
      <div className="ultra-safety-tips">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">🛡️</span>
            Speed Safety Guidelines
          </h3>
        </div>
        <div className="safety-tips-grid">
          <div className="safety-tip-card">
            <span className="tip-icon">🚦</span>
            <div className="tip-content">
              <h4>Speed Limit Compliance</h4>
              <p>Maintain speed within {speedLimit} km/h on regular routes</p>
            </div>
          </div>
          <div className="safety-tip-card">
            <span className="tip-icon">🏫</span>
            <div className="tip-content">
              <h4>Special Zones</h4>
              <p>Reduce speed near schools, hospitals, and crowded areas</p>
            </div>
          </div>
          <div className="safety-tip-card">
            <span className="tip-icon">📞</span>
            <div className="tip-content">
              <h4>Immediate Response</h4>
              <p>Contact drivers immediately when overspeed alerts are triggered</p>
            </div>
          </div>
          <div className="safety-tip-card">
            <span className="tip-icon">📊</span>
            <div className="tip-content">
              <h4>Pattern Analysis</h4>
              <p>Review overspeed patterns to identify drivers needing training</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpeedMonitoring;
