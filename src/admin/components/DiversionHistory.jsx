/**
 * Diversion History Component for Admin Dashboard
 * Shows all route deviation events with details
 */

import { useState, useEffect } from 'react';
import { getDiversionLog, getAllActiveDiversions } from '../../services/routeDiversionService';

function DiversionHistory() {
  const [activeDiversions, setActiveDiversions] = useState([]);
  const [diversionLog, setDiversionLog] = useState([]);
  const [filter, setFilter] = useState('all'); // all, active, resolved
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = () => {
    setActiveDiversions(getAllActiveDiversions());
    setDiversionLog(getDiversionLog());
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const filteredLog = diversionLog.filter(entry => {
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && entry.status === 'ACTIVE') ||
      (filter === 'resolved' && entry.status === 'RESOLVED');
    
    const matchesSearch = !searchTerm || 
      entry.busId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.routeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.routeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="diversion-history ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">🛣️</span>
              Route Diversion Monitor
            </h2>
            <p className="ultra-subtitle">Real-time route deviation tracking and analysis</p>
          </div>
          <div className="header-stats">
            <div className="stat-pill active">
              <span className="stat-value">{activeDiversions.length}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-pill resolved">
              <span className="stat-value">{diversionLog.filter(d => d.status === 'RESOLVED').length}</span>
              <span className="stat-label">Resolved</span>
            </div>
            <div className="stat-pill total">
              <span className="stat-value">{diversionLog.length}</span>
              <span className="stat-label">Total Events</span>
            </div>
          </div>
        </div>
        <div className="live-indicator">
          <div className="live-dot"></div>
          <span>Live Monitoring</span>
        </div>
      </div>

      {/* Advanced Search & Filter Bar */}
      <div className="ultra-filter-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by bus ID or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ultra-search-input"
            />
          </div>
        </div>
        <div className="filter-pills">
          <button 
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`} 
            onClick={() => setFilter('all')}
          >
            All Events ({diversionLog.length})
          </button>
          <button 
            className={`filter-pill ${filter === 'active' ? 'active' : ''}`} 
            onClick={() => setFilter('active')}
          >
            🔴 Active ({activeDiversions.length})
          </button>
          <button 
            className={`filter-pill ${filter === 'resolved' ? 'active' : ''}`} 
            onClick={() => setFilter('resolved')}
          >
            ✅ Resolved ({diversionLog.filter(d => d.status === 'RESOLVED').length})
          </button>
        </div>
      </div>

      {/* Active Diversions Alert Section */}
      {activeDiversions.length > 0 && (
        <div className="ultra-alert-section">
          <div className="alert-header">
            <h3 className="alert-title">
              <span className="alert-icon pulse">⚠️</span>
              Currently Active Diversions
            </h3>
            <span className="alert-count">{activeDiversions.length} Active</span>
          </div>
          <div className="active-diversions-grid">
            {activeDiversions.map((diversion, index) => (
              <div 
                key={diversion.id} 
                className="ultra-diversion-card active"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="diversion-card-header">
                  <div className="bus-info">
                    <span className="bus-id">🚌 Bus {diversion.busId}</span>
                    <span className="route-name">{diversion.routeName}</span>
                  </div>
                  <span className="status-badge active pulse">ACTIVE</span>
                </div>
                <div className="diversion-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Deviation Distance</span>
                    <span className="detail-value">{diversion.deviationDistance}m</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Expected Segment</span>
                    <span className="detail-value">{diversion.expectedSegment}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Detected At</span>
                    <span className="detail-value">{formatDateTime(diversion.detectedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultra-Modern Diversion Log Table */}
      <div className="ultra-table-section">
        <div className="table-header">
          <h3 className="table-title">
            <span className="table-icon">📋</span>
            Diversion Event Log
          </h3>
          <div className="table-info">
            <span className="result-count">{filteredLog.length} events</span>
          </div>
        </div>
        
        {filteredLog.length === 0 ? (
          <div className="ultra-empty-state">
            <div className="empty-icon">📊</div>
            <h3>No diversion events found</h3>
            <p>
              {searchTerm 
                ? `No events match "${searchTerm}"`
                : "No route diversions recorded"
              }
            </p>
          </div>
        ) : (
          <div className="ultra-table-container">
            <table className="ultra-table">
              <thead>
                <tr>
                  <th>Bus & Route</th>
                  <th>Timeline</th>
                  <th>Duration</th>
                  <th>Max Deviation</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLog.map((entry, index) => (
                  <tr 
                    key={entry.id} 
                    className={`table-row ${entry.status.toLowerCase()}`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <td>
                      <div className="bus-route-cell">
                        <div className="bus-info">
                          <span className="bus-number">🚌 {entry.busId}</span>
                          <span className="route-name">{entry.routeName || entry.routeId}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="timeline-cell">
                        <div className="time-item">
                          <span className="time-label">Start:</span>
                          <span className="time-value">{formatDateTime(entry.startTime)}</span>
                        </div>
                        <div className="time-item">
                          <span className="time-label">End:</span>
                          <span className="time-value">{formatDateTime(entry.endTime)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="duration-badge">{formatDuration(entry.duration)}</span>
                    </td>
                    <td>
                      <span className="deviation-badge">{entry.maxDeviation}m</span>
                    </td>
                    <td>
                      <span className={`status-badge ${entry.status.toLowerCase()}`}>
                        {entry.status === 'ACTIVE' ? '🔴' : '✅'} {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default DiversionHistory;
