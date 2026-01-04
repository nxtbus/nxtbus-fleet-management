/**
 * Real GPS Tracker Component for Drivers
 * Uses actual device GPS instead of simulated data
 */

import { useState, useEffect, useRef } from 'react';
import gpsService from '../../services/gpsService';
import websocketService from '../../services/websocketService';
import './RealGPSTracker.css';

function RealGPSTracker({ tripId, onGPSUpdate, onError }) {
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // idle, requesting, active, error
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const intervalRef = useRef(null);

  // Check GPS availability on mount
  useEffect(() => {
    if (!gpsService.isGPSAvailable()) {
      setError({
        code: 'GPS_NOT_AVAILABLE',
        message: 'GPS is not available on this device'
      });
      setGpsStatus('error');
    }
  }, []);

  // Set up GPS callbacks
  useEffect(() => {
    const handleGPSUpdate = (gpsData) => {
      setCurrentPosition(gpsData);
      setStats(gpsService.getTrackingStats());
      
      if (onGPSUpdate) {
        onGPSUpdate(gpsData);
      }
    };

    const handleGPSError = (error) => {
      setError(error);
      setGpsStatus('error');
      
      if (onError) {
        onError(error);
      }
    };

    const handleGPSStopped = (finalStats) => {
      setIsTracking(false);
      setGpsStatus('idle');
      setStats(finalStats);
    };

    // Add callbacks
    gpsService.addCallback('update', handleGPSUpdate);
    gpsService.addCallback('error', handleGPSError);
    gpsService.addCallback('stopped', handleGPSStopped);

    // Cleanup callbacks
    return () => {
      gpsService.removeCallback('update', handleGPSUpdate);
      gpsService.removeCallback('error', handleGPSError);
      gpsService.removeCallback('stopped', handleGPSStopped);
    };
  }, [onGPSUpdate, onError]);

  // Update stats periodically
  useEffect(() => {
    if (isTracking) {
      intervalRef.current = setInterval(() => {
        setStats(gpsService.getTrackingStats());
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isTracking]);

  /**
   * Request GPS permissions
   */
  const requestPermissions = async () => {
    setGpsStatus('requesting');
    setError(null);

    try {
      const permissionResult = await gpsService.requestPermissions();
      setPermissions(permissionResult);
      setGpsStatus('idle');
      
      return permissionResult;
    } catch (error) {
      setError(error);
      setGpsStatus('error');
      throw error;
    }
  };

  /**
   * Start GPS tracking
   */
  const startTracking = async () => {
    if (isTracking) return;

    setGpsStatus('requesting');
    setError(null);

    try {
      // Request permissions if not already granted
      if (!permissions) {
        await requestPermissions();
      }

      // Start tracking
      const initialPosition = await gpsService.startTracking(tripId, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000
      });

      setIsTracking(true);
      setGpsStatus('active');
      setCurrentPosition(initialPosition);
      setStats(gpsService.getTrackingStats());

      console.log('📍 Real GPS tracking started:', initialPosition);
    } catch (error) {
      setError(error);
      setGpsStatus('error');
      setIsTracking(false);
      
      console.error('GPS tracking failed:', error);
    }
  };

  /**
   * Stop GPS tracking
   */
  const stopTracking = () => {
    if (!isTracking) return;

    gpsService.stopTracking();
    setIsTracking(false);
    setGpsStatus('idle');
    
    console.log('📍 GPS tracking stopped');
  };

  /**
   * Get current position (one-time)
   */
  const getCurrentPosition = async () => {
    setGpsStatus('requesting');
    setError(null);

    try {
      const position = await gpsService.getCurrentPosition();
      setCurrentPosition(position);
      setGpsStatus('idle');
      
      return position;
    } catch (error) {
      setError(error);
      setGpsStatus('error');
      throw error;
    }
  };

  /**
   * Format GPS quality for display
   */
  const formatGPSQuality = (quality) => {
    const qualityMap = {
      excellent: { text: 'Excellent', color: '#10B981', icon: '🟢' },
      good: { text: 'Good', color: '#059669', icon: '🟢' },
      fair: { text: 'Fair', color: '#F59E0B', icon: '🟡' },
      poor: { text: 'Poor', color: '#EF4444', icon: '🟠' },
      very_poor: { text: 'Very Poor', color: '#DC2626', icon: '🔴' }
    };
    
    return qualityMap[quality] || { text: 'Unknown', color: '#6B7280', icon: '⚪' };
  };

  /**
   * Format duration
   */
  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  /**
   * Format distance
   */
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    } else {
      return `${Math.round(meters)} m`;
    }
  };

  return (
    <div className="real-gps-tracker">
      <div className="gps-header">
        <h3>🛰️ Real GPS Tracking</h3>
        <div className={`gps-status ${gpsStatus}`}>
          {gpsStatus === 'idle' && '⚪ Ready'}
          {gpsStatus === 'requesting' && '🟡 Requesting...'}
          {gpsStatus === 'active' && '🟢 Active'}
          {gpsStatus === 'error' && '🔴 Error'}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="gps-error">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <div className="error-title">{error.code}</div>
            <div className="error-message">{error.message}</div>
          </div>
        </div>
      )}

      {/* Permission Status */}
      {permissions && (
        <div className="gps-permissions">
          <div className="permission-item">
            <span className="permission-label">GPS Access:</span>
            <span className="permission-value">
              {permissions.granted ? '✅ Granted' : '❌ Denied'}
            </span>
          </div>
          {permissions.accuracy && (
            <div className="permission-item">
              <span className="permission-label">Initial Accuracy:</span>
              <span className="permission-value">±{Math.round(permissions.accuracy)}m</span>
            </div>
          )}
        </div>
      )}

      {/* Current Position */}
      {currentPosition && (
        <div className="gps-position">
          <div className="position-header">📍 Current Position</div>
          <div className="position-grid">
            <div className="position-item">
              <span className="position-label">Latitude:</span>
              <span className="position-value">{currentPosition.lat.toFixed(6)}</span>
            </div>
            <div className="position-item">
              <span className="position-label">Longitude:</span>
              <span className="position-value">{currentPosition.lon.toFixed(6)}</span>
            </div>
            <div className="position-item">
              <span className="position-label">Accuracy:</span>
              <span className="position-value">±{Math.round(currentPosition.accuracy)}m</span>
            </div>
            <div className="position-item">
              <span className="position-label">Speed:</span>
              <span className="position-value">{Math.round(currentPosition.speedKmh)} km/h</span>
            </div>
            <div className="position-item">
              <span className="position-label">Heading:</span>
              <span className="position-value">{Math.round(currentPosition.heading)}°</span>
            </div>
            <div className="position-item">
              <span className="position-label">Quality:</span>
              <span className="position-value">
                {(() => {
                  const quality = formatGPSQuality(currentPosition.quality);
                  return (
                    <span style={{ color: quality.color }}>
                      {quality.icon} {quality.text}
                    </span>
                  );
                })()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Statistics */}
      {stats && isTracking && (
        <div className="gps-stats">
          <div className="stats-header">📊 Tracking Statistics</div>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Duration:</span>
              <span className="stat-value">{formatDuration(stats.duration)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Distance:</span>
              <span className="stat-value">{formatDistance(stats.totalDistance)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Points:</span>
              <span className="stat-value">{stats.positionCount}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Avg Accuracy:</span>
              <span className="stat-value">±{Math.round(stats.averageAccuracy)}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="gps-controls">
        {!permissions && gpsStatus !== 'error' && (
          <button 
            className="gps-btn permission-btn"
            onClick={requestPermissions}
            disabled={gpsStatus === 'requesting'}
          >
            {gpsStatus === 'requesting' ? '🔄 Requesting...' : '🔐 Request GPS Access'}
          </button>
        )}

        {permissions && !isTracking && gpsStatus !== 'error' && (
          <>
            <button 
              className="gps-btn start-btn"
              onClick={startTracking}
              disabled={gpsStatus === 'requesting'}
            >
              {gpsStatus === 'requesting' ? '🔄 Starting...' : '▶️ Start Tracking'}
            </button>
            
            <button 
              className="gps-btn position-btn"
              onClick={getCurrentPosition}
              disabled={gpsStatus === 'requesting'}
            >
              📍 Get Current Position
            </button>
          </>
        )}

        {isTracking && (
          <button 
            className="gps-btn stop-btn"
            onClick={stopTracking}
          >
            ⏹️ Stop Tracking
          </button>
        )}

        {error && (
          <button 
            className="gps-btn retry-btn"
            onClick={() => {
              setError(null);
              setGpsStatus('idle');
            }}
          >
            🔄 Retry
          </button>
        )}
      </div>

      {/* WebSocket Status */}
      <div className="websocket-status">
        <span className="ws-label">WebSocket:</span>
        <span className={`ws-status ${websocketService.isSocketConnected() ? 'connected' : 'disconnected'}`}>
          {websocketService.isSocketConnected() ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>
    </div>
  );
}

export default RealGPSTracker;