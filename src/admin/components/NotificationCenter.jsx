import { useState, useEffect } from 'react';
import { getNotifications, sendNotification, getRoutes } from '../services/adminService';

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    type: 'delay',
    title: '',
    message: '',
    targetRoutes: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [notifsData, routesData] = await Promise.all([
        getNotifications(),
        getRoutes()
      ]);
      setNotifications(notifsData);
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
      await sendNotification(formData);
      await loadData();
      resetForm();
      alert('Notification sent successfully!');
    } catch (err) {
      alert('Failed to send notification');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setFormData({ type: 'delay', title: '', message: '', targetRoutes: [] });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
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

  const filteredNotifications = notifications.filter(notif =>
    !searchTerm || 
    notif.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notif.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notif.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading">Loading notifications...</div>;

  return (
    <div className="notification-center ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">📢</span>
              Notification Command Center
            </h2>
            <p className="ultra-subtitle">Broadcast alerts and updates to passengers and drivers</p>
          </div>
          <div className="header-stats">
            <div className="stat-pill delay">
              <span className="stat-value">{notifications.filter(n => n.type === 'delay').length}</span>
              <span className="stat-label">Delays</span>
            </div>
            <div className="stat-pill alert">
              <span className="stat-value">{notifications.filter(n => n.type === 'alert').length}</span>
              <span className="stat-label">Alerts</span>
            </div>
            <div className="stat-pill total">
              <span className="stat-value">{notifications.length}</span>
              <span className="stat-label">Total Sent</span>
            </div>
          </div>
        </div>
        <button className="ultra-btn primary" onClick={() => setShowForm(true)}>
          <span className="btn-icon">📤</span>
          Send Notification
        </button>
      </div>

      {/* Advanced Search Bar */}
      <div className="ultra-filter-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search notifications by title, message, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ultra-search-input"
            />
          </div>
        </div>
        <div className="notification-stats">
          <span className="result-count">{filteredNotifications.length} notifications</span>
        </div>
      </div>

      {/* Ultra-Modern Send Notification Modal */}
      {showForm && (
        <div className="ultra-modal-overlay">
          <div className="ultra-modal notification-modal">
            <div className="modal-header">
              <div className="modal-title-section">
                <h3 className="modal-title">
                  <span className="modal-icon">📤</span>
                  Broadcast Notification
                </h3>
                <p className="modal-subtitle">Send alerts and updates to users</p>
              </div>
              <button className="modal-close" onClick={resetForm}>✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="ultra-form">
              <div className="form-sections">
                <div className="form-section">
                  <h4 className="section-title">📋 Notification Details</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Notification Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="ultra-select"
                      >
                        <option value="delay">🕐 Delay Alert</option>
                        <option value="diversion">🚧 Route Diversion</option>
                        <option value="alert">⚠️ General Alert</option>
                        <option value="info">ℹ️ Information</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Priority Level</label>
                      <select className="ultra-select">
                        <option value="normal">📢 Normal</option>
                        <option value="high">🔔 High Priority</option>
                        <option value="urgent">🚨 Urgent</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Notification Title</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Bus 101A Delayed"
                      required
                      className="ultra-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Message Content</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Enter detailed notification message..."
                      rows={4}
                      required
                      className="ultra-textarea"
                    />
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">🎯 Target Audience</h4>
                  <div className="form-group">
                    <label>Target Routes (optional)</label>
                    <select
                      multiple
                      value={formData.targetRoutes}
                      onChange={(e) => setFormData({
                        ...formData,
                        targetRoutes: Array.from(e.target.selectedOptions, o => o.value)
                      })}
                      className="ultra-select multi"
                    >
                      {routes.map(route => (
                        <option key={route.id} value={route.id}>🛣️ {route.name}</option>
                      ))}
                    </select>
                    <small className="form-hint">Leave empty to send to all users</small>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">👁️ Preview</h4>
                  <div className="notification-preview">
                    <div className="preview-card">
                      <div className="preview-header">
                        <span className="preview-icon">{getTypeIcon(formData.type)}</span>
                        <strong className="preview-title">{formData.title || 'Notification Title'}</strong>
                      </div>
                      <p className="preview-message">{formData.message || 'Notification message will appear here...'}</p>
                      <div className="preview-meta">
                        <span className="preview-time">Just now</span>
                        <span className="preview-type">{formData.type}</span>
                      </div>
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
                  Send Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ultra-Modern Notifications History */}
      <div className="ultra-notifications-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">📋</span>
            Notification History
          </h3>
        </div>
        
        {filteredNotifications.length === 0 ? (
          <div className="ultra-empty-state">
            <div className="empty-icon">📭</div>
            <h3>No notifications found</h3>
            <p>
              {searchTerm 
                ? `No notifications match "${searchTerm}"`
                : "No notifications have been sent yet"
              }
            </p>
          </div>
        ) : (
          <div className="ultra-notifications-grid">
            {filteredNotifications.map((notif, index) => (
              <div 
                key={notif.id} 
                className={`ultra-notification-card ${notif.type}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="notification-card-header">
                  <div className="notification-type-section">
                    <span className="notification-icon">{getTypeIcon(notif.type)}</span>
                    <div className="notification-meta">
                      <span className={`type-badge ${notif.type}`}>{notif.type}</span>
                      <span className="notification-time">{formatTime(notif.sentAt)}</span>
                    </div>
                  </div>
                  <div className="notification-status">
                    <span className="sent-badge">✓ Sent</span>
                  </div>
                </div>
                
                <div className="notification-card-body">
                  <h4 className="notification-title">{notif.title}</h4>
                  <p className="notification-message">{notif.message}</p>
                  
                  <div className="notification-details">
                    <div className="detail-item">
                      <span className="detail-label">Sent by:</span>
                      <span className="detail-value">{notif.sentBy}</span>
                    </div>
                    {notif.targetRoutes?.length > 0 && (
                      <div className="detail-item">
                        <span className="detail-label">Routes:</span>
                        <span className="detail-value">{notif.targetRoutes.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationCenter;
