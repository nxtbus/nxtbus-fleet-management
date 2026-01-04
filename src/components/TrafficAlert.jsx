/**
 * Traffic Alert Component
 * Displays traffic congestion alerts in the bus timeline view
 */

import { getSeverityColor, getSeverityIcon, TrafficSeverity } from '../services/trafficService';

function TrafficAlert({ alert, compact = false }) {
  if (!alert) return null;

  const severityColor = getSeverityColor(alert.severity);
  const severityIcon = getSeverityIcon(alert.severity);
  
  const getSeverityLabel = (severity) => {
    switch (severity) {
      case TrafficSeverity.HIGH: return 'Heavy Traffic';
      case TrafficSeverity.MEDIUM: return 'Moderate Traffic';
      case TrafficSeverity.LOW: return 'Slow Traffic';
      default: return 'Traffic';
    }
  };

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (compact) {
    return (
      <div 
        className="traffic-alert-compact"
        style={{ borderLeftColor: severityColor }}
      >
        <span className="traffic-icon">{severityIcon}</span>
        <span className="traffic-text">{alert.segmentName}</span>
        <span className="traffic-speed">{alert.avgSpeed} km/h</span>
      </div>
    );
  }

  return (
    <div 
      className="traffic-alert"
      style={{ borderLeftColor: severityColor, backgroundColor: `${severityColor}15` }}
    >
      <div className="traffic-alert-header">
        <span className="traffic-severity-badge" style={{ backgroundColor: severityColor }}>
          {severityIcon} {getSeverityLabel(alert.severity)}
        </span>
        <span className="traffic-time">Detected {formatTime(alert.detectedAt)}</span>
      </div>
      
      <div className="traffic-alert-body">
        <p className="traffic-message">{alert.message}</p>
        <div className="traffic-details">
          <span className="traffic-segment">📍 {alert.segmentName}</span>
          <span className="traffic-speed">🚗 Avg: {alert.avgSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
}

export function TrafficAlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  // Sort by severity (HIGH first)
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return (order[a.severity] || 3) - (order[b.severity] || 3);
  });

  const highestSeverity = sortedAlerts[0]?.severity;
  const bannerColor = getSeverityColor(highestSeverity);

  return (
    <div 
      className="traffic-alert-banner"
      style={{ backgroundColor: `${bannerColor}20`, borderColor: bannerColor }}
    >
      <div className="banner-icon">⚠️</div>
      <div className="banner-content">
        <strong>{alerts.length} Traffic Alert{alerts.length > 1 ? 's' : ''}</strong>
        <span className="banner-summary">
          {sortedAlerts.map(a => a.segmentName).join(', ')}
        </span>
      </div>
    </div>
  );
}

export default TrafficAlert;
