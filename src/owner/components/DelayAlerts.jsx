import { useState, useEffect, useCallback, useRef } from 'react';
import { getDelays, getDelayStats } from '../services/ownerService';

function DelayAlerts() {
  const [delays, setDelays] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const intervalRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const [delaysData, statsData] = await Promise.all([
        getDelays(),
        getDelayStats()
      ]);
      setDelays(delaysData);
      setStats(statsData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load delays:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 5 seconds
    intervalRef.current = setInterval(loadData, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loadData]);

  const filteredDelays = delays.filter(d => {
    const matchesFilter = filter === 'all' || d.status === filter;
    const matchesSearch = !searchTerm || 
      (d.busNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.routeId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.reason || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getSeverityClass = (minutes) => {
    if (minutes >= 20) return 'critical';
    if (minutes >= 10) return 'high';
    return 'medium';
  };

  if (loading) {
    return <div className="loading">Loading delay alerts...</div>;
  }

  return (
    <div className="delay-alerts ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">⚠️</span>
              Delay Alerts & Notifications
            </h2>
            <p className="ultra-subtitle">Real-time delay monitoring and alert management</p>
          </div>
          <div className="live-indicator">
            <span className="live-dot"></span>
            <span className="live-text">Live</span>
            {lastUpdate && <small className="separator"> • {lastUpdate.toLocaleTimeString()}</small>}
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-pill active">
            <span className="stat-value">{stats?.active || 0}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat-pill resolved">
            <span className="stat-value">{stats?.resolved || 0}</span>
            <span className="stat-label">Resolved</span>
          </div>
        </div>
      </div>

      {/* Ultra-Modern Stats Grid */}
      <div className="ultra-stats-grid">
        <div className="ultra-stat-card primary">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.active || 0}</span>
            <span className="stat-label">Active Delays</span>
            <span className="stat-sub">Requiring attention</span>
          </div>
        </div>
        <div className="ultra-stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.avgDelayMinutes || 0}</span>
            <span className="stat-label">Avg Delay</span>
            <span className="stat-sub">Minutes</span>
          </div>
        </div>
        <div className="ultra-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.resolved || 0}</span>
            <span className="stat-label">Resolved Today</span>
            <span className="stat-sub">Successfully handled</span>
          </div>
        </div>
        <div className="ultra-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-value">{stats?.total || 0}</span>
            <span className="stat-label">Total Delays</span>
            <span className="stat-sub">All time</span>
          </div>
        </div>
      </div>

      {/* Ultra-Modern Control Panel */}
      <div className="ultra-control-panel">
        <div className="control-section">
          <div className="search-section">
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by bus, route, or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ultra-search-input"
              />
            </div>
          </div>
        </div>
        <div className="filter-section">
          <div className="filter-pills">
            <button
              className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({delays.length})
            </button>
            <button
              className={`filter-pill ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Active ({delays.filter(d => d.status === 'active').length})
            </button>
            <button
              className={`filter-pill ${filter === 'resolved' ? 'active' : ''}`}
              onClick={() => setFilter('resolved')}
            >
              Resolved ({delays.filter(d => d.status === 'resolved').length})
            </button>
          </div>
        </div>
      </div>

      {/* Delay Reasons Breakdown */}
      {stats?.byReason && Object.keys(stats.byReason).length > 0 && (
        <div className="ultra-reasons-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="section-icon">📊</span>
              Delay Causes Analysis
            </h3>
          </div>
          <div className="ultra-reasons-grid">
            {Object.entries(stats.byReason).map(([reason, count]) => (
              <div key={reason} className="ultra-reason-card">
                <div className="reason-icon">
                  {(reason || '').toLowerCase().includes('traffic') ? '🚗' :
                   (reason || '').toLowerCase().includes('breakdown') ? '🔧' :
                   (reason || '').toLowerCase().includes('weather') ? '🌧️' :
                   (reason || '').toLowerCase().includes('diversion') ? '🔀' : '⚠️'}
                </div>
                <div className="reason-content">
                  <span className="reason-name">{reason}</span>
                  <span className="reason-count">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultra-Modern Delays List */}
      <div className="ultra-delays-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">📋</span>
            Delay Alerts ({filteredDelays.length})
          </h3>
        </div>
        
        {filteredDelays.length === 0 ? (
          <div className="ultra-empty-state">
            <span className="empty-icon">✅</span>
            <h4>No {filter !== 'all' ? filter : ''} delays found</h4>
            <p>All buses are running on schedule</p>
          </div>
        ) : (
          <div className="ultra-delays-grid">
            {filteredDelays.map(delay => (
              <div
                key={delay.id}
                className={`ultra-delay-card ${delay.status} ${getSeverityClass(delay.delayMinutes)}`}
              >
                <div className="delay-card-header">
                  <div className="bus-info">
                    <span className="bus-badge">🚌 {delay.busNumber}</span>
                    <span className={`status-badge ${delay.status}`}>
                      {delay.status}
                    </span>
                  </div>
                  <div className={`delay-time ${getSeverityClass(delay.delayMinutes)}`}>
                    +{delay.delayMinutes} min
                  </div>
                </div>

                <div className="delay-card-body">
                  <div className="delay-detail">
                    <span className="detail-icon">🛣️</span>
                    <span className="detail-label">Route:</span>
                    <span className="detail-value">{delay.routeId}</span>
                  </div>
                  <div className="delay-detail">
                    <span className="detail-icon">📝</span>
                    <span className="detail-label">Reason:</span>
                    <span className="detail-value">{delay.reason}</span>
                  </div>
                  <div className="delay-detail">
                    <span className="detail-icon">🕐</span>
                    <span className="detail-label">Reported:</span>
                    <span className="detail-value">
                      {new Date(delay.reportedAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {delay.status === 'active' && (
                  <div className="delay-card-actions">
                    <div className="action-hint">
                      <span className="hint-icon">💡</span>
                      <span>Consider notifying passengers or adjusting schedule</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DelayAlerts;
