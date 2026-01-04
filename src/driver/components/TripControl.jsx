import { useState, useEffect } from 'react';
import { tripService, TripStatus } from '../services/tripService';
import { gpsTracker } from '../services/gpsTracker';
import { formatDistance } from '../../utils/geoUtils';
import RealGPSTracker from './RealGPSTracker';

function TripControl({ tripConfig, onTripEnd, onBack }) {
  const { driver, bus, route } = tripConfig;

  const [tripStatus, setTripStatus] = useState(TripStatus.NOT_STARTED);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [gpsStatus, setGpsStatus] = useState({ tracking: false, position: null });
  const [gpsStats, setGpsStats] = useState(null);
  const [tripSummary, setTripSummary] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Subscribe to GPS updates
  useEffect(() => {
    const unsubscribe = gpsTracker.subscribe((event, data) => {
      if (event === 'position_update') {
        setGpsStatus(prev => ({ ...prev, position: data, tracking: true }));
        // Update GPS stats
        const stats = gpsTracker.getTrackingStats();
        setGpsStats(stats);
      } else if (event === 'tracking_started') {
        setGpsStatus(prev => ({ ...prev, tracking: true }));
      } else if (event === 'tracking_stopped') {
        setGpsStatus(prev => ({ ...prev, tracking: false }));
        setGpsStats(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to trip updates
  useEffect(() => {
    const unsubscribe = tripService.subscribe((event, data) => {
      if (event === 'trip_started') {
        setCurrentTrip(data);
        setTripStatus(TripStatus.IN_PROGRESS);
      } else if (event === 'trip_ended') {
        setTripStatus(TripStatus.COMPLETED);
        setTripSummary(data.summary);
      }
    });

    return () => unsubscribe();
  }, []);

  // Elapsed time counter
  useEffect(() => {
    let interval;
    if (tripStatus === TripStatus.IN_PROGRESS && currentTrip) {
      interval = setInterval(() => {
        const start = new Date(currentTrip.startTime).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tripStatus, currentTrip]);

  const handleStartTrip = async () => {
    const result = await tripService.startTrip({
      driverId: driver.id,
      busId: bus.id,
      routeId: route.id,
      route
    });

    if (!result.success) {
      alert(result.message);
    }
  };

  const handleEndTrip = async () => {
    if (!confirm('Are you sure you want to end this trip?')) {
      return;
    }

    const result = await tripService.endTrip();
    if (result.success) {
      setTripSummary(result.summary);
    }
  };

  const formatElapsedTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Trip Summary View
  if (tripSummary) {
    return (
      <div className="trip-summary">
        <div className="summary-header">
          <div className="summary-icon">✅</div>
          <h2>Trip Completed</h2>
        </div>

        <div className="summary-card">
          <div className="summary-row">
            <span>Bus</span>
            <strong>{tripSummary.busNumber}</strong>
          </div>
          <div className="summary-row">
            <span>Route</span>
            <strong>{tripSummary.routeName}</strong>
          </div>
          <div className="summary-row">
            <span>Departure</span>
            <strong>{tripSummary.departureTime}</strong>
          </div>
          <div className="summary-row">
            <span>Arrival</span>
            <strong>{tripSummary.arrivalTime}</strong>
          </div>
          <div className="summary-row">
            <span>Duration</span>
            <strong>{tripSummary.totalDuration}</strong>
          </div>
          <div className="summary-row">
            <span>Distance</span>
            <strong>{tripSummary.totalDistance}</strong>
          </div>
          <div className="summary-row">
            <span>Avg Speed</span>
            <strong>{tripSummary.averageSpeed}</strong>
          </div>
          <div className="summary-row">
            <span>GPS Points</span>
            <strong>{tripSummary.positionsRecorded}</strong>
          </div>
        </div>

        <button className="btn btn-primary" onClick={onTripEnd}>
          Start New Trip
        </button>
      </div>
    );
  }

  return (
    <div className="trip-control">
      {/* Trip Info Header */}
      <div className="trip-info-header">
        <div className="trip-bus">
          <span className="bus-icon">🚌</span>
          <span className="bus-num">{bus.number}</span>
        </div>
        <div className="trip-route">{route.name}</div>
      </div>

      {/* GPS Status */}
      <div className={`gps-status ${gpsStatus.tracking ? 'active' : 'inactive'}`}>
        <div className="gps-indicator"></div>
        <span>
          {gpsStatus.tracking ? 'GPS Active' : 'GPS Inactive'}
          {gpsStats?.source === 'simulation' && ' (Simulated)'}
          {gpsStats?.source !== 'simulation' && gpsStatus.tracking && ' (Real GPS)'}
        </span>
        {gpsStatus.position && (
          <span className="gps-accuracy">
            ±{Math.round(gpsStatus.position.accuracy)}m
          </span>
        )}
      </div>

      {/* Trip Status Card */}
      <div className="trip-status-card">
        {tripStatus === TripStatus.NOT_STARTED && (
          <>
            <div className="status-icon">🚏</div>
            <h3>Ready to Start</h3>
            <p>Press the button below to begin your trip</p>
            <button className="btn btn-start" onClick={handleStartTrip}>
              ▶️ Start Trip
            </button>
          </>
        )}

        {tripStatus === TripStatus.IN_PROGRESS && (
          <>
            <div className="status-icon pulsing">🚌</div>
            <h3>Trip In Progress</h3>

            <div className="trip-metrics">
              <div className="metric">
                <div className="metric-value">{formatElapsedTime(elapsedTime)}</div>
                <div className="metric-label">Duration</div>
              </div>
              <div className="metric">
                <div className="metric-value">
                  {currentTrip ? formatDistance(currentTrip.distanceCovered) : '0 m'}
                </div>
                <div className="metric-label">Distance</div>
              </div>
              <div className="metric">
                <div className="metric-value">
                  {gpsStatus.position?.speedKmh
                    ? `${Math.round(gpsStatus.position.speedKmh)}`
                    : '--'}
                </div>
                <div className="metric-label">km/h</div>
              </div>
            </div>

            {gpsStatus.position && (
              <div className="current-location">
                <small>
                  📍 {gpsStatus.position.lat.toFixed(5)}, {gpsStatus.position.lon.toFixed(5)}
                  {gpsStatus.position.accuracy && ` (±${Math.round(gpsStatus.position.accuracy)}m)`}
                  {gpsStatus.position.quality && ` - ${gpsStatus.position.quality}`}
                </small>
              </div>
            )}

            {/* Real GPS Tracker Component */}
            <div className="gps-tracker-section">
              <RealGPSTracker
                tripId={currentTrip?.tripId || currentTrip?.id}
                onGPSUpdate={(gpsData) => {
                  console.log('GPS Update from RealGPSTracker:', gpsData);
                }}
                onError={(error) => {
                  console.error('GPS Error from RealGPSTracker:', error);
                }}
              />
              
              {/* GPS Mode Toggle (for testing) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="gps-mode-controls">
                  <button 
                    className="btn btn-secondary gps-toggle-btn"
                    onClick={async () => {
                      const result = await gpsTracker.toggleGPSMode();
                      console.log('GPS mode toggle result:', result);
                    }}
                    disabled={!gpsStatus.tracking}
                  >
                    🔄 Toggle GPS Mode
                  </button>
                  <small className="gps-mode-info">
                    Current: {gpsStats?.source === 'simulation' ? '🛰️ Simulation' : '📍 Real GPS'}
                  </small>
                </div>
              )}
            </div>

            <button className="btn btn-end" onClick={handleEndTrip}>
              ⏹️ End Trip
            </button>
          </>
        )}
      </div>

      {/* Back button (only when not in progress) */}
      {tripStatus === TripStatus.NOT_STARTED && (
        <button className="btn btn-secondary" onClick={onBack}>
          ← Change Bus/Route
        </button>
      )}
    </div>
  );
}

export default TripControl;
