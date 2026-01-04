import { useState, useEffect } from 'react';
import { getStopAnalytics, getRoutes, getRouteAnalytics } from '../services/ownerService';

function StopAnalytics() {
  const [stopData, setStopData] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState('all');
  const [sortBy, setSortBy] = useState('waitTime');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stops, routesData] = await Promise.all([
        getStopAnalytics(),
        getRoutes()
      ]);
      setStopData(stops);
      setRoutes(routesData);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStops = stopData
    .filter(stop => selectedRoute === 'all' || stop.routeId === selectedRoute)
    .sort((a, b) => {
      if (sortBy === 'waitTime') return b.avgWaitTime - a.avgWaitTime;
      if (sortBy === 'name') return a.stopName.localeCompare(b.stopName);
      if (sortBy === 'congestion') return b.isPeakHourCongested - a.isPeakHourCongested;
      return 0;
    });

  const congestedStops = stopData.filter(s => s.isPeakHourCongested);
  const avgWaitTime = stopData.length > 0
    ? Math.round(stopData.reduce((sum, s) => sum + s.avgWaitTime, 0) / stopData.length)
    : 0;

  const getCongestionLevel = (stop) => {
    if (stop.isPeakHourCongested) return 'high';
    if (stop.avgWaitTime > stop.estimatedTime) return 'medium';
    return 'low';
  };

  const getCongestionColor = (level) => {
    switch (level) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      default: return '#4caf50';
    }
  };

  if (loading) {
    return <div className="loading">Loading stop analytics...</div>;
  }

  return (
    <div className="stop-analytics ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">📊</span>
              Stop Waiting Time Analytics
            </h2>
            <p className="ultra-subtitle">Comprehensive stop performance analysis and optimization insights</p>
          </div>
        </div>
        <div className="header-controls">
          <select 
            value={selectedRoute} 
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="ultra-select"
          >
            <option value="all">All Routes</option>
            {routes.map(route => (
              <option key={route.id} value={route.id}>{route.name}</option>
            ))}
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="ultra-select"
          >
            <option value="waitTime">Sort by Wait Time</option>
            <option value="congestion">Sort by Congestion</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Ultra-Modern Stats Grid */}
      <div className="ultra-stats-grid">
        <div className="ultra-stat-card primary">
          <div className="stat-icon">🚏</div>
          <div className="stat-content">
            <span className="stat-value">{stopData.length}</span>
            <span className="stat-label">Total Stops</span>
            <span className="stat-sub">Monitored locations</span>
          </div>
        </div>
        <div className={`ultra-stat-card ${congestedStops.length > 0 ? 'alerts warning' : ''}`}>
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <span className="stat-value">{congestedStops.length}</span>
            <span className="stat-label">Congested Stops</span>
            <span className="stat-sub">Need attention</span>
          </div>
          {congestedStops.length > 0 && <div className="alert-pulse"></div>}
        </div>
        <div className="ultra-stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-value">{avgWaitTime}</span>
            <span className="stat-label">Avg Wait Time</span>
            <span className="stat-sub">Minutes</span>
          </div>
        </div>
        <div className="ultra-stat-card">
          <div className="stat-icon">🛣️</div>
          <div className="stat-content">
            <span className="stat-value">{routes.length}</span>
            <span className="stat-label">Routes Analyzed</span>
            <span className="stat-sub">Active routes</span>
          </div>
        </div>
      </div>

      {/* Congestion Alerts */}
      {congestedStops.length > 0 && (
        <div className="ultra-congestion-alerts">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-icon">🚨</span>
              High Congestion Stops
            </h3>
            <p className="alert-description">
              These stops have significantly higher wait times than expected. Consider route optimization.
            </p>
          </div>
          <div className="ultra-congested-stops-grid">
            {congestedStops.slice(0, 4).map(stop => (
              <div key={stop.stopId} className="ultra-congested-stop-card">
                <div className="stop-card-header">
                  <div className="stop-info">
                    <span className="stop-name">{stop.stopName}</span>
                    <span className="route-name">{stop.routeName}</span>
                  </div>
                  <span className="congestion-badge high">High Congestion</span>
                </div>
                <div className="stop-card-body">
                  <div className="stop-detail">
                    <span className="detail-icon">⏱️</span>
                    <span className="detail-label">Avg Wait:</span>
                    <span className="detail-value danger">{stop.avgWaitTime} min</span>
                  </div>
                  <div className="stop-detail">
                    <span className="detail-icon">📊</span>
                    <span className="detail-label">Expected:</span>
                    <span className="detail-value">{stop.estimatedTime} min</span>
                  </div>
                  <div className="stop-detail">
                    <span className="detail-icon">🚌</span>
                    <span className="detail-label">Trips:</span>
                    <span className="detail-value">{stop.tripCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultra-Modern Analytics Table */}
      <div className="ultra-analytics-table-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">📋</span>
            Stop-wise Analytics
          </h3>
        </div>
        <div className="ultra-table-container">
          <table className="ultra-analytics-table">
            <thead>
              <tr>
                <th>Stop Name</th>
                <th>Route</th>
                <th>Order</th>
                <th>Avg Wait Time</th>
                <th>Expected Time</th>
                <th>Congestion</th>
                <th>Trip Count</th>
              </tr>
            </thead>
            <tbody>
              {filteredStops.map(stop => {
                const congestionLevel = getCongestionLevel(stop);
                return (
                  <tr key={`${stop.routeId}-${stop.stopId}`} className={congestionLevel === 'high' ? 'highlight' : ''}>
                    <td>
                      <div className="stop-cell">
                        <span className="stop-marker">🚏</span>
                        <span className="stop-name">{stop.stopName}</span>
                      </div>
                    </td>
                    <td>{stop.routeName}</td>
                    <td>
                      <span className="order-badge">#{stop.order}</span>
                    </td>
                    <td>
                      <span className={`wait-time ${congestionLevel}`}>
                        {stop.avgWaitTime} min
                      </span>
                    </td>
                    <td>{stop.estimatedTime} min</td>
                    <td>
                      <div className="congestion-indicator">
                        <span 
                          className="congestion-dot"
                          style={{ backgroundColor: getCongestionColor(congestionLevel) }}
                        ></span>
                        <span className={`congestion-label ${congestionLevel}`}>
                          {congestionLevel.charAt(0).toUpperCase() + congestionLevel.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td>{stop.tripCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ultra-Modern Route Summary */}
      <div className="ultra-route-summary-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">🛣️</span>
            Route-wise Summary
          </h3>
        </div>
        <div className="ultra-route-cards-grid">
          {routes.map(route => {
            const routeStops = stopData.filter(s => s.routeId === route.id);
            const routeAvgWait = routeStops.length > 0
              ? Math.round(routeStops.reduce((sum, s) => sum + s.avgWaitTime, 0) / routeStops.length)
              : 0;
            const routeCongested = routeStops.filter(s => s.isPeakHourCongested).length;

            return (
              <div key={route.id} className="ultra-route-summary-card">
                <div className="route-card-header">
                  <div className="route-info">
                    <span className="route-name">{route.name}</span>
                    <span className={`route-status ${route.status}`}>{route.status}</span>
                  </div>
                </div>
                <div className="route-card-body">
                  <div className="route-stats">
                    <div className="route-stat">
                      <span className="stat-value">{routeStops.length}</span>
                      <span className="stat-label">Stops</span>
                    </div>
                    <div className="route-stat">
                      <span className="stat-value">{routeAvgWait} min</span>
                      <span className="stat-label">Avg Wait</span>
                    </div>
                    <div className="route-stat">
                      <span className={`stat-value ${routeCongested > 0 ? 'warning' : ''}`}>
                        {routeCongested}
                      </span>
                      <span className="stat-label">Congested</span>
                    </div>
                  </div>
                  <div className="route-timeline">
                    {routeStops.sort((a, b) => a.order - b.order).map(stop => (
                      <div 
                        key={stop.stopId}
                        className="timeline-stop"
                        title={`${stop.stopName}: ${stop.avgWaitTime} min`}
                      >
                        <span 
                          className="timeline-dot"
                          style={{ backgroundColor: getCongestionColor(getCongestionLevel(stop)) }}
                        ></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ultra-Modern Optimization Suggestions */}
      <div className="ultra-optimization-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">💡</span>
            Optimization Suggestions
          </h3>
        </div>
        <div className="ultra-suggestions-grid">
          {congestedStops.length > 0 && (
            <div className="ultra-suggestion-card">
              <span className="suggestion-icon">🚏</span>
              <div className="suggestion-content">
                <h4>Review Congested Stops</h4>
                <p>
                  {congestedStops.length} stop(s) show higher than expected wait times. 
                  Consider adjusting schedules or adding express services.
                </p>
              </div>
            </div>
          )}
          <div className="ultra-suggestion-card">
            <span className="suggestion-icon">📊</span>
            <div className="suggestion-content">
              <h4>Peak Hour Analysis</h4>
              <p>
                Monitor wait times during peak hours (8-10 AM, 5-7 PM) to identify 
                patterns and optimize bus frequency.
              </p>
            </div>
          </div>
          <div className="ultra-suggestion-card">
            <span className="suggestion-icon">🔄</span>
            <div className="suggestion-content">
              <h4>Route Optimization</h4>
              <p>
                Consider rerouting buses to avoid consistently congested stops 
                or adding additional stops to distribute passenger load.
              </p>
            </div>
          </div>
          <div className="ultra-suggestion-card">
            <span className="suggestion-icon">📱</span>
            <div className="suggestion-content">
              <h4>Passenger Communication</h4>
              <p>
                Implement real-time passenger notifications for stops with 
                high wait times to improve user experience.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StopAnalytics;
