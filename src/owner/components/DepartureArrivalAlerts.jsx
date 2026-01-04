import { useState, useEffect, useCallback, useRef } from 'react';
import { getTimingAlerts, getSchedules, getActiveTrips } from '../services/ownerService';

function DepartureArrivalAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const intervalRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [alertsData, schedulesData, tripsData] = await Promise.all([
        getTimingAlerts(),
        getSchedules(),
        getActiveTrips()
      ]);
      setAlerts(alertsData);
      setSchedules(schedulesData);
      setTrips(tripsData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load timing data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 seconds
    intervalRef.current = setInterval(loadData, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    return a.type === filter;
  });

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = dayNames[now.getDay()];

  // Get today's active schedules
  const todaySchedules = schedules.filter(s => 
    s.status === 'active' && s.days?.includes(today)
  );

  // Categorize schedules
  const upcomingDepartures = todaySchedules.filter(s => s.startTime > currentTime);
  const inProgress = todaySchedules.filter(s => {
    const trip = trips.find(t => t.busId === s.busId);
    return trip || (s.startTime <= currentTime && s.endTime >= currentTime);
  });

  if (loading) {
    return <div className="loading">Loading timing alerts...</div>;
  }

  return (
    <div className="timing-alerts ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">⏰</span>
              Departure & Arrival Timing Alerts
            </h2>
            <p className="ultra-subtitle">Real-time schedule monitoring and timing analysis</p>
          </div>
          <div className="current-time-display">
            <span className="time-icon">🕐</span>
            <span className="current-time">{currentTime}</span>
            <span className="day-badge">{today}</span>
          </div>
        </div>
      </div>

      {/* Ultra-Modern Stats Grid */}
      <div className="ultra-stats-grid">
        <div className={`ultra-stat-card ${alerts.filter(a => a.type === 'late_departure').length > 0 ? 'alerts warning' : ''}`}>
          <div className="stat-icon">🚌</div>
          <div className="stat-content">
            <span className="stat-value">{alerts.filter(a => a.type === 'late_departure').length}</span>
            <span className="stat-label">Late Departures</span>
            <span className="stat-sub">Delayed starts</span>
          </div>
          {alerts.filter(a => a.type === 'late_departure').length > 0 && <div className="alert-pulse"></div>}
        </div>
        <div className={`ultra-stat-card ${alerts.filter(a => a.type === 'late_arrival').length > 0 ? 'alerts warning' : ''}`}>
          <div className="stat-icon">🏁</div>
          <div className="stat-content">
            <span className="stat-value">{alerts.filter(a => a.type === 'late_arrival').length}</span>
            <span className="stat-label">Late Arrivals</span>
            <span className="stat-sub">Delayed arrivals</span>
          </div>
          {alerts.filter(a => a.type === 'late_arrival').length > 0 && <div className="alert-pulse"></div>}
        </div>
        <div className="ultra-stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <span className="stat-value">{todaySchedules.length}</span>
            <span className="stat-label">Today's Schedules</span>
            <span className="stat-sub">Total planned</span>
          </div>
        </div>
        <div className="ultra-stat-card primary">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{inProgress.length}</span>
            <span className="stat-label">In Progress</span>
            <span className="stat-sub">Currently running</span>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="ultra-active-alerts-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-icon">⚠️</span>
              Active Timing Alerts
            </h3>
            <div className="filter-section">
              <div className="filter-pills">
                <button
                  className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
                  onClick={() => setFilter('all')}
                >
                  All ({alerts.length})
                </button>
                <button
                  className={`filter-pill ${filter === 'late_departure' ? 'active' : ''}`}
                  onClick={() => setFilter('late_departure')}
                >
                  Late Departure ({alerts.filter(a => a.type === 'late_departure').length})
                </button>
                <button
                  className={`filter-pill ${filter === 'late_arrival' ? 'active' : ''}`}
                  onClick={() => setFilter('late_arrival')}
                >
                  Late Arrival ({alerts.filter(a => a.type === 'late_arrival').length})
                </button>
              </div>
            </div>
          </div>

          <div className="ultra-alerts-grid">
            {filteredAlerts.map((alert, idx) => (
              <div key={idx} className={`ultra-timing-alert-card ${alert.severity}`}>
                <div className="alert-card-header">
                  <div className="alert-type-info">
                    <span className="alert-type-badge">
                      {alert.type === 'late_departure' ? '🚌 Late Departure' : '🏁 Late Arrival'}
                    </span>
                    <span className={`severity-badge ${alert.severity}`}>
                      {alert.severity === 'high' ? '🔴 High' : '🟡 Medium'}
                    </span>
                  </div>
                </div>
                <div className="alert-card-body">
                  <div className="alert-bus-info">
                    <span className="bus-number">{alert.busNumber}</span>
                    <span className="route-name">{alert.routeName}</span>
                  </div>
                  <div className="alert-details">
                    <div className="detail-row">
                      <span className="detail-icon">👤</span>
                      <span className="detail-label">Driver:</span>
                      <span className="detail-value">{alert.driverName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-icon">📅</span>
                      <span className="detail-label">Scheduled:</span>
                      <span className="detail-value">{alert.scheduledTime}</span>
                    </div>
                    {alert.estimatedTime && (
                      <div className="detail-row">
                        <span className="detail-icon">⏱️</span>
                        <span className="detail-label">Estimated:</span>
                        <span className="detail-value">{alert.estimatedTime}</span>
                      </div>
                    )}
                    <div className="detail-row highlight">
                      <span className="detail-icon">⚠️</span>
                      <span className="detail-label">Delay:</span>
                      <span className="detail-value danger">+{alert.delayMinutes} min</span>
                    </div>
                  </div>
                </div>
                <div className="alert-action">
                  <span className="action-hint">
                    💡 {alert.type === 'late_departure' 
                      ? 'Contact driver to confirm status' 
                      : 'Notify passengers of delay'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultra-Modern Schedule Overview */}
      <div className="ultra-schedule-overview">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">📅</span>
            Today's Schedule Overview
          </h3>
        </div>
        
        {/* Upcoming Departures */}
        <div className="schedule-section">
          <h4 className="subsection-title">
            <span className="subsection-icon">🕐</span>
            Upcoming Departures
          </h4>
          {upcomingDepartures.length === 0 ? (
            <div className="no-data">No more departures scheduled for today</div>
          ) : (
            <div className="ultra-schedule-list">
              {upcomingDepartures.slice(0, 5).map(schedule => (
                <div key={schedule.id} className="ultra-schedule-item upcoming">
                  <div className="schedule-time-section">
                    <span className="schedule-time">{schedule.startTime}</span>
                    <span className="schedule-label">Departure</span>
                  </div>
                  <div className="schedule-info">
                    <div className="schedule-bus">
                      <span className="bus-number">{schedule.busNumber}</span>
                      <span className="route-name">{schedule.routeName}</span>
                    </div>
                    <span className="driver-name">👤 {schedule.driverName}</span>
                  </div>
                  <div className="schedule-status">
                    <span className="status-badge pending">Pending</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* In Progress */}
        <div className="schedule-section">
          <h4 className="subsection-title">
            <span className="subsection-icon">🟢</span>
            Currently In Progress
          </h4>
          {inProgress.length === 0 ? (
            <div className="no-data">No trips currently in progress</div>
          ) : (
            <div className="ultra-schedule-list">
              {inProgress.map(schedule => {
                const trip = trips.find(t => t.busId === schedule.busId);
                return (
                  <div key={schedule.id} className="ultra-schedule-item in-progress">
                    <div className="schedule-time-section">
                      <span className="schedule-time">{schedule.startTime} - {schedule.endTime}</span>
                      <span className="schedule-label">Shift</span>
                    </div>
                    <div className="schedule-info">
                      <div className="schedule-bus">
                        <span className="bus-number">{schedule.busNumber}</span>
                        <span className="route-name">{schedule.routeName}</span>
                      </div>
                      <span className="driver-name">👤 {schedule.driverName}</span>
                    </div>
                    <div className="schedule-status">
                      <span className={`status-badge ${trip ? 'active' : 'scheduled'}`}>
                        {trip ? '🟢 On Trip' : '⏳ Scheduled'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* No Alerts State */}
      {alerts.length === 0 && (
        <div className="ultra-no-alerts-banner">
          <span className="banner-icon">✅</span>
          <div className="banner-content">
            <h3>All On Schedule</h3>
            <p>No timing alerts at the moment. All buses are running on schedule.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartureArrivalAlerts;
