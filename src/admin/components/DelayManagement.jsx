import { useState, useEffect } from 'react';
import { getDelays, reportDelay, updateDelayStatus, getBuses, getRoutes } from '../services/adminService';

function DelayManagement() {
  const [delays, setDelays] = useState([]);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    busId: '',
    routeId: '',
    reason: '',
    delayMinutes: 10
  });

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [delaysData, busesData, routesData] = await Promise.all([
        getDelays(),
        getBuses(),
        getRoutes()
      ]);
      setDelays(delaysData);
      setBuses(busesData.filter(b => b.status === 'active'));
      setRoutes(routesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const bus = buses.find(b => b.id === formData.busId);
      await reportDelay({
        ...formData,
        busNumber: bus?.number || formData.busId,
        delayMinutes: parseInt(formData.delayMinutes)
      });
      await loadData();
      resetForm();
    } catch (err) {
      alert('Failed to report delay');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateDelayStatus(id, newStatus);
      await loadData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({ busId: '', routeId: '', reason: '', delayMinutes: 10 });
  };

  const filteredDelays = filter === 'all'
    ? delays.filter(d => 
        d.busNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        routes.find(r => r.id === d.routeId)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : delays.filter(d => 
        d.status === filter && (
          d.busNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          routes.find(r => r.id === d.routeId)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading">Loading delays...</div>;

  return (
    <div className="delay-management ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">⚠️</span>
              Delay Management Center
            </h2>
            <p className="ultra-subtitle">Real-time delay monitoring and incident management</p>
          </div>
          <div className="header-stats">
            <div className="stat-pill active">
              <span className="stat-value">{delays.filter(d => d.status === 'active').length}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-pill resolved">
              <span className="stat-value">{delays.filter(d => d.status === 'resolved').length}</span>
              <span className="stat-label">Resolved</span>
            </div>
            <div className="stat-pill total">
              <span className="stat-value">{delays.length}</span>
              <span className="stat-label">Total Today</span>
            </div>
          </div>
        </div>
        <button className="ultra-btn primary" onClick={() => setShowForm(true)}>
          <span className="btn-icon">➕</span>
          Report Delay
        </button>
      </div>

      {/* Advanced Search & Filter Bar */}
      <div className="ultra-filter-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search delays by bus, route, or reason..."
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
            All Delays ({delays.length})
          </button>
          <button
            className={`filter-pill ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            🔴 Active ({delays.filter(d => d.status === 'active').length})
          </button>
          <button
            className={`filter-pill ${filter === 'resolved' ? 'active' : ''}`}
            onClick={() => setFilter('resolved')}
          >
            ✅ Resolved ({delays.filter(d => d.status === 'resolved').length})
          </button>
        </div>
      </div>

      {/* Ultra-Modern Report Delay Modal */}
      {showForm && (
        <div className="ultra-modal-overlay">
          <div className="ultra-modal delay-modal">
            <div className="modal-header">
              <div className="modal-title-section">
                <h3 className="modal-title">
                  <span className="modal-icon">⚠️</span>
                  Report Bus Delay
                </h3>
                <p className="modal-subtitle">Document and track service disruptions</p>
              </div>
              <button className="modal-close" onClick={resetForm}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="ultra-form">
              <div className="form-sections">
                <div className="form-section">
                  <h4 className="section-title">🚌 Vehicle Information</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Select Bus</label>
                      <select
                        value={formData.busId}
                        onChange={(e) => setFormData({ ...formData, busId: e.target.value })}
                        required
                        className="ultra-select"
                      >
                        <option value="">Choose a bus</option>
                        {buses.map(bus => (
                          <option key={bus.id} value={bus.id}>
                            🚌 {bus.number} - {bus.type || 'Standard'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Route</label>
                      <select
                        value={formData.routeId}
                        onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                        required
                        className="ultra-select"
                      >
                        <option value="">Select route</option>
                        {routes.map(route => (
                          <option key={route.id} value={route.id}>
                            🛣️ {route.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">📋 Delay Details</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Delay Reason</label>
                      <select
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        required
                        className="ultra-select"
                      >
                        <option value="">Select reason</option>
                        <option value="Heavy traffic">🚦 Heavy traffic</option>
                        <option value="Mechanical issue">🔧 Mechanical issue</option>
                        <option value="Road accident">🚨 Road accident</option>
                        <option value="Weather conditions">🌧️ Weather conditions</option>
                        <option value="Route diversion">🚧 Route diversion</option>
                        <option value="Driver issue">👤 Driver issue</option>
                        <option value="Other">📝 Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Delay Duration (minutes)</label>
                      <input
                        type="number"
                        value={formData.delayMinutes}
                        onChange={(e) => setFormData({ ...formData, delayMinutes: e.target.value })}
                        min="1"
                        max="120"
                        required
                        className="ultra-input"
                        placeholder="Enter minutes"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="ultra-btn secondary" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="ultra-btn primary">
                  <span className="btn-icon">📤</span>
                  Report Delay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={filter === 'all' ? 'active' : ''}
          onClick={() => setFilter('all')}
        >
          All ({delays.length})
        </button>
        <button
          className={filter === 'active' ? 'active' : ''}
          onClick={() => setFilter('active')}
        >
          Active ({delays.filter(d => d.status === 'active').length})
        </button>
        <button
          className={filter === 'resolved' ? 'active' : ''}
          onClick={() => setFilter('resolved')}
        >
          Resolved ({delays.filter(d => d.status === 'resolved').length})
        </button>
      </div>

      {/* Ultra-Modern Delays List */}
      <div className="ultra-delays-grid">
        {filteredDelays.length === 0 ? (
          <div className="ultra-empty-state">
            <div className="empty-icon">✅</div>
            <h3>No {filter !== 'all' ? filter : ''} delays found</h3>
            <p>
              {searchTerm 
                ? `No delays match "${searchTerm}"`
                : filter === 'active' 
                  ? "All delays have been resolved" 
                  : "No delays reported today"
              }
            </p>
          </div>
        ) : (
          filteredDelays.map((delay, index) => (
            <div 
              key={delay.id} 
              className={`ultra-delay-card ${delay.status}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="delay-card-header">
                <div className="delay-primary-info">
                  <div className="bus-info">
                    <span className="bus-number">🚌 {delay.busNumber}</span>
                    <span className="route-name">
                      {routes.find(r => r.id === delay.routeId)?.name || delay.routeId}
                    </span>
                  </div>
                  <div className="delay-badges">
                    <span className={`status-badge ${delay.status}`}>
                      {delay.status === 'active' ? '🔴' : '✅'} {delay.status}
                    </span>
                    <span className="delay-time-badge">+{delay.delayMinutes} min</span>
                  </div>
                </div>
              </div>

              <div className="delay-card-body">
                <div className="delay-reason-section">
                  <h4 className="reason-title">Delay Reason</h4>
                  <p className="reason-text">{delay.reason}</p>
                </div>
                
                <div className="delay-meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Reported</span>
                    <span className="meta-value">{formatTime(delay.reportedAt)}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Duration</span>
                    <span className="meta-value">{delay.delayMinutes} minutes</span>
                  </div>
                </div>
              </div>

              {delay.status === 'active' && (
                <div className="delay-card-actions">
                  <button
                    className="ultra-btn success small"
                    onClick={() => handleStatusChange(delay.id, 'resolved')}
                  >
                    <span className="btn-icon">✓</span>
                    Mark Resolved
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DelayManagement;
