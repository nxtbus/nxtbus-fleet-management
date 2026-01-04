import { useState, useEffect, useRef } from 'react';
import {
  getCallAlerts,
  getActiveCallAlerts,
  acknowledgeCallAlert,
  subscribeToCallAlerts
} from '../../services/callDetectionService';

function CallAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('active'); // active, all, today
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const audioRef = useRef(null);
  const prevAlertCount = useRef(0);

  useEffect(() => {
    loadAlerts();
    
    // Poll for new alerts every 5 seconds
    const interval = setInterval(loadAlerts, 5000);
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToCallAlerts((newAlerts) => {
      setAlerts(newAlerts);
      // Play sound if new alert
      if (newAlerts.length > prevAlertCount.current) {
        playAlertSound();
      }
      prevAlertCount.current = newAlerts.length;
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await getCallAlerts();
      setAlerts(data);
      prevAlertCount.current = data.length;
    } catch (error) {
      console.error('Failed to load call alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAlertSound = () => {
    // Create a simple beep sound
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 300);
    } catch (e) {
      console.log('Could not play alert sound');
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await acknowledgeCallAlert(alertId, 'Admin');
      loadAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFilteredAlerts = () => {
    let filtered = [...alerts];
    
    if (filter === 'active') {
      filtered = filtered.filter(a => !a.acknowledged);
    } else if (filter === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(a => new Date(a.timestamp).toDateString() === today);
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.busNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.routeName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const filteredAlerts = getFilteredAlerts();
  const activeCount = alerts.filter(a => !a.acknowledged).length;

  if (loading) {
    return <div className="loading">Loading call alerts...</div>;
  }

  return (
    <div className="call-alerts-container ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">📞</span>
              Driver Call Alert Center
            </h2>
            <p className="ultra-subtitle">Real-time monitoring of driver phone activity during trips</p>
          </div>
          <div className="header-stats">
            <div className="stat-pill active">
              <span className="stat-value">{activeCount}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-pill today">
              <span className="stat-value">{alerts.filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString()).length}</span>
              <span className="stat-label">Today</span>
            </div>
            <div className="stat-pill total">
              <span className="stat-value">{alerts.length}</span>
              <span className="stat-label">Total</span>
            </div>
          </div>
        </div>
        {activeCount > 0 && (
          <div className="alert-indicator pulse">
            <span className="alert-badge">{activeCount} Active Alerts</span>
          </div>
        )}
      </div>

      {/* Advanced Search & Filter Bar */}
      <div className="ultra-filter-bar">
        <div className="search-section">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by driver, bus, or route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ultra-search-input"
            />
          </div>
        </div>
        <div className="filter-pills">
          <button 
            className={`filter-pill ${filter === 'active' ? 'active' : ''}`} 
            onClick={() => setFilter('active')}
          >
            🔴 Active ({alerts.filter(a => !a.acknowledged).length})
          </button>
          <button 
            className={`filter-pill ${filter === 'today' ? 'active' : ''}`} 
            onClick={() => setFilter('today')}
          >
            📅 Today ({alerts.filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString()).length})
          </button>
          <button 
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`} 
            onClick={() => setFilter('all')}
          >
            📋 All ({alerts.length})
          </button>
        </div>
      </div>

      {/* Ultra-Modern Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="ultra-empty-state">
          <div className="empty-icon">✅</div>
          <h3>No {filter === 'active' ? 'active ' : ''}call alerts</h3>
          <p>
            {searchTerm 
              ? `No alerts match "${searchTerm}"`
              : "Alerts will appear here when drivers receive calls during trips"
            }
          </p>
        </div>
      ) : (
        <div className="ultra-alerts-grid">
          {filteredAlerts.map((alert, index) => (
            <div 
              key={alert.id} 
              className={`ultra-alert-card ${!alert.acknowledged ? 'unacknowledged' : ''}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="alert-card-header">
                <div className="alert-icon-section">
                  <div className={`alert-icon ${alert.callStatus}`}>
                    {alert.callStatus === 'ringing' ? '📳' : 
                     alert.callStatus === 'answered' ? '📞' : '📴'}
                  </div>
                  <div className="call-type-indicator">
                    {alert.callType === 'incoming' ? (
                      <span className="call-type incoming">📥 Incoming</span>
                    ) : (
                      <span className="call-type outgoing">📤 Outgoing</span>
                    )}
                  </div>
                </div>
                <div className="alert-status-section">
                  <span className={`call-status ${alert.callStatus}`}>
                    {alert.callStatus === 'ringing' ? '🔔 Ringing' :
                     alert.callStatus === 'answered' ? '📞 On Call' : '✓ Ended'}
                  </span>
                  {!alert.acknowledged && (
                    <span className="urgent-badge pulse">URGENT</span>
                  )}
                </div>
              </div>
              
              <div className="alert-card-body">
                <div className="driver-info-section">
                  <h3 className="driver-name">👤 {alert.driverName}</h3>
                  <div className="vehicle-info">
                    <span className="bus-info">🚌 Bus: {alert.busNumber}</span>
                    <span className="route-info">🛣️ Route: {alert.routeName}</span>
                  </div>
                </div>
                
                <div className="alert-meta-section">
                  <div className="meta-item">
                    <span className="meta-label">Time</span>
                    <span className="meta-value">
                      🕐 {formatTime(alert.timestamp)} • {formatDate(alert.timestamp)}
                    </span>
                  </div>
                </div>

                {alert.acknowledged && (
                  <div className="acknowledged-section">
                    <div className="acknowledged-info">
                      ✓ Acknowledged by {alert.acknowledgedBy} at {formatTime(alert.acknowledgedAt)}
                    </div>
                  </div>
                )}
              </div>

              {!alert.acknowledged && (
                <div className="alert-card-actions">
                  <button 
                    className="ultra-btn success"
                    onClick={() => handleAcknowledge(alert.id)}
                  >
                    <span className="btn-icon">✓</span>
                    Acknowledge Alert
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Information Section */}
      <div className="ultra-info-section">
        <div className="info-card">
          <div className="info-header">
            <h4 className="info-title">
              <span className="info-icon">ℹ️</span>
              About Call Monitoring
            </h4>
          </div>
          <p className="info-text">
            This system monitors driver phone activity during active trips for safety compliance. 
            When a driver receives or makes a call while driving, an alert is generated requiring 
            administrative acknowledgment to ensure proper safety protocols are followed.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CallAlerts;
