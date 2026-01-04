import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAlerts } from '../services/busService'

function Alerts() {
  const { t } = useTranslation()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)

  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchAlerts()
      setAlerts(data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Failed to load alerts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
    intervalRef.current = setInterval(loadAlerts, 10000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [loadAlerts])

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="dark-search-container">
        <div className="dark-search-card" style={{ textAlign: 'center', padding: '60px 30px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16, animation: 'spin 1s linear infinite' }}>🔄</div>
          <p style={{ color: '#757575' }}>Loading alerts...</p>
        </div>
      </div>
    )
  }

  if (alerts.length === 0) {
    return (
      <div className="dark-search-container">
        <div className="dark-no-results">
          <div className="icon">✅</div>
          <p>All Clear!</p>
          <small>No active alerts. All routes operating normally.</small>
        </div>
        
        <div className="dark-info-card">
          <div className="info-header">
            <span className="info-icon">🔔</span>
            <div className="info-content">
              <h4>Stay Informed</h4>
              <p>Alerts appear here when there are delays, diversions, or service disruptions.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dark-search-container">
      <div className="dark-section-header">
        <h3>🔔 Service Alerts</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="section-meta">{alerts.length} active</span>
          <span className="dark-live-indicator">
            <span className="live-dot"></span>
            Live
          </span>
        </div>
      </div>

      {alerts.map((alert) => (
        <div 
          key={alert.id} 
          className={`dark-alert-card ${alert.type === 'diversion' ? 'danger' : ''}`}
        >
          <div className="alert-header">
            <span className="alert-icon">
              {alert.type === 'diversion' ? '🚧' : alert.type === 'delay' ? '⏰' : '⚠️'}
            </span>
            <div className="alert-content">
              <div className="alert-title">{alert.title}</div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-time">🕐 {formatTime(alert.timestamp)}</div>
            </div>
          </div>
        </div>
      ))}

      <div className="dark-info-card">
        <div className="info-header">
          <span className="info-icon">ℹ️</span>
          <div className="info-content">
            <h4>Alert Types</h4>
            <p>
              ⚠️ <strong>Traffic:</strong> Delays due to congestion<br/>
              🚧 <strong>Diversion:</strong> Route changes<br/>
              ⏰ <strong>Delay:</strong> Service delays
            </p>
            <small style={{ marginTop: 10, display: 'block', opacity: 0.6 }}>
              Auto-refreshes every 10 seconds {lastUpdate && `• Last: ${lastUpdate.toLocaleTimeString()}`}
            </small>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Alerts
