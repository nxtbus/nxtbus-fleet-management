import { useState, useEffect, useRef } from 'react';
import {
  getCallAlerts,
  acknowledgeCallAlert,
  subscribeToCallAlerts
} from '../../services/callDetectionService';
import { getOwnerBusIds } from '../services/ownerService';
import { getCurrentOwnerId } from '../services/ownerAuth';

function OwnerCallAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [ownerBusIds, setOwnerBusIds] = useState([]);
  const prevAlertCount = useRef(0);

  useEffect(() => {
    // Load owner's bus IDs first
    const loadOwnerBuses = async () => {
      const busIds = await getOwnerBusIds();
      setOwnerBusIds(busIds);
    };
    loadOwnerBuses();
  }, []);

  useEffect(() => {
    if (ownerBusIds.length === 0) return;
    
    loadAlerts();
    
    // Poll for new alerts every 5 seconds
    const interval = setInterval(loadAlerts, 5000);
    
    // Subscribe to real-time updates
    const unsubscribe = subscribeToCallAlerts((newAlerts) => {
      const ownerAlerts = newAlerts.filter(a => ownerBusIds.includes(a.busId));
      setAlerts(ownerAlerts);
      // Play sound if new alert
      if (ownerAlerts.length > prevAlertCount.current) {
        playAlertSound();
      }
      prevAlertCount.current = ownerAlerts.length;
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [ownerBusIds]);

  const loadAlerts = async () => {
    try {
      const allAlerts = await getCallAlerts();
      // Filter alerts for this owner's buses
      const ownerAlerts = allAlerts.filter(a => ownerBusIds.includes(a.busId));
      setAlerts(ownerAlerts);
      prevAlertCount.current = ownerAlerts.length;
    } catch (error) {
      console.error('Failed to load call alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAlertSound = () => {
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
      await acknowledgeCallAlert(alertId, 'Owner');
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

  const getFilteredAlerts = () => {
    let filtered = [...alerts];
    
    if (filter === 'active') {
      filtered = filtered.filter(a => !a.acknowledged);
    } else if (filter === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(a => new Date(a.timestamp).toDateString() === today);
    }
    
    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const filteredAlerts = getFilteredAlerts();
  const activeCount = alerts.filter(a => !a.acknowledged).length;

  if (loading) {
    return <div className="loading">Loading call alerts...</div>;
  }

  return (
    <div className="owner-call-alerts ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">📞</span>
              Driver Call Alerts
            </h2>
            <p className="ultra-subtitle">Real-time driver communication monitoring</p>
          </div>
        </div>
        <div className="header-stats">
          {activeCount > 0 && (
            <div className="stat-pill active alert-pulse">
              <span className="stat-value">{activeCount}</span>
              <span className="stat-label">Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Ultra-Modern Control Panel */}
      <div className="ultra-control-panel">
        <div className="filter-section">
          <div className="filter-pills">
            <button 
              className={`filter-pill ${filter === 'active' ? 'active' : ''}`}
              onClick={() => setFilter('active')}
            >
              Active ({alerts.filter(a => !a.acknowledged).length})
            </button>
            <button 
              className={`filter-pill ${filter === 'today' ? 'active' : ''}`}
              onClick={() => setFilter('today')}
            >
              Today
            </button>
            <button 
              className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Ultra-Modern Alerts Section */}
      <div className="ultra-alerts-section">
        <div className="section-header">
          <h3 className="section-title">
            <span className="section-icon">📋</span>
            Call Alerts ({filteredAlerts.length})
          </h3>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="ultra-empty-state">
            <span className="empty-icon">✅</span>
            <h4>No {filter === 'active' ? 'active ' : ''}call alerts</h4>
            <p>All driver communications are normal</p>
          </div>
        ) : (
          <div className="ultra-alerts-grid">
            {filteredAlerts.map(alert => (
              <div 
                key={alert.id} 
                className={`ultra-alert-card ${!alert.acknowledged ? 'urgent' : ''}`}
              >
                <div className="alert-card-header">
                  <div className="alert-icon">
                    {alert.callStatus === 'ringing' ? '📳' : 
                     alert.callStatus === 'answered' ? '📞' : '📴'}
                  </div>
                  <div className="alert-info">
                    <div className="alert-header">
                      <span className="driver-name">👤 {alert.driverName}</span>
                      <span className={`status-badge ${alert.callStatus}`}>
                        {alert.callStatus}
                      </span>
                    </div>
                    <div className="alert-details">
                      <div className="detail-row">
                        <span className="detail-icon">🚌</span>
                        <span className="detail-label">Bus:</span>
                        <span className="detail-value">{alert.busNumber}</span>
                      </div>
                      <div className="detail-row">
                        <span className="detail-icon">🕐</span>
                        <span className="detail-label">Time:</span>
                        <span className="detail-value">{formatTime(alert.timestamp)}</span>
                      </div>
                    </div>
                    {alert.acknowledged && (
                      <div className="ack-info">✓ Acknowledged</div>
                    )}
                  </div>
                  {!alert.acknowledged && (
                    <button 
                      className="ultra-ack-btn"
                      onClick={() => handleAcknowledge(alert.id)}
                      title="Acknowledge Alert"
                    >
                      ✓
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerCallAlerts;
