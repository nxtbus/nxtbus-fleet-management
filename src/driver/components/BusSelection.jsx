import { useState, useEffect } from 'react';
import { authService } from '../services/authService';

function BusSelection({ driver, onBusSelected, onBack }) {
  const [todaySchedules, setTodaySchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('trips'); // 'trips' or 'manual'
  
  // Manual selection state (fallback)
  const [buses, setBuses] = useState([]);
  const [selectedBusId, setSelectedBusId] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load today's scheduled trips
      const schedules = await authService.getTodaySchedules();
      setTodaySchedules(schedules);
      
      // Also load buses for manual selection
      const assignedBuses = await authService.getAssignedBuses();
      setBuses(assignedBuses);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  // Format time to 12-hour format
  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Check if a schedule is currently active (within time window)
  const getScheduleStatus = (schedule) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinutes < schedule.startTimeMinutes - 30) {
      return 'upcoming';
    } else if (currentMinutes >= schedule.startTimeMinutes - 30 && 
               currentMinutes <= schedule.endTimeMinutes + 30) {
      return 'active';
    } else {
      return 'passed';
    }
  };

  const handleScheduleSelect = async (scheduleId) => {
    setSelectedScheduleId(scheduleId);
    const result = await authService.selectSchedule(scheduleId);
    if (!result.success) {
      alert(result.message);
    }
  };

  const handleBusSelect = async (busId) => {
    setSelectedBusId(busId);
    setSelectedRouteId(null);

    const result = await authService.selectBus(busId);
    if (result.success) {
      const busRoutes = await authService.getRoutesForBus();
      setRoutes(busRoutes);
    }
  };

  const handleRouteSelect = async (routeId) => {
    setSelectedRouteId(routeId);
    await authService.selectRoute(routeId);
  };

  const handleContinue = () => {
    const verification = authService.verifyReadyToStart();
    if (verification.ready) {
      onBusSelected(verification);
    }
  };

  const canContinue = viewMode === 'trips' 
    ? selectedScheduleId !== null 
    : (selectedBusId && selectedRouteId);

  if (loading) {
    return (
      <div className="bus-selection">
        <div className="loading-state">
          <div className="spinner">🔄</div>
          <p>Loading your trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bus-selection">
      <div className="selection-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h2>Select Trip</h2>
      </div>

      <div className="driver-info-card">
        <div className="driver-avatar">👤</div>
        <div className="driver-details">
          <div className="driver-name">{driver.name}</div>
          <div className="driver-id">ID: {driver.id}</div>
        </div>
      </div>

      {/* View Mode Toggle */}
      {todaySchedules.length > 0 && buses.length > 0 && (
        <div className="view-toggle">
          <button 
            className={viewMode === 'trips' ? 'active' : ''} 
            onClick={() => setViewMode('trips')}
          >
            📅 Today's Trips ({todaySchedules.length})
          </button>
          <button 
            className={viewMode === 'manual' ? 'active' : ''} 
            onClick={() => setViewMode('manual')}
          >
            🔧 Manual Selection
          </button>
        </div>
      )}

      {/* Trip Selection View */}
      {viewMode === 'trips' && todaySchedules.length > 0 && (
        <div className="selection-section">
          <h3>📅 Your Scheduled Trips Today</h3>
          <p className="section-hint">Select the trip you want to start</p>
          
          <div className="trip-list">
            {todaySchedules.map((schedule) => {
              const status = getScheduleStatus(schedule);
              return (
                <div
                  key={schedule.id}
                  className={`trip-card ${selectedScheduleId === schedule.id ? 'selected' : ''} ${status}`}
                  onClick={() => handleScheduleSelect(schedule.id)}
                >
                  <div className="trip-time-badge">
                    <span className="start-time">{formatTime(schedule.startTime)}</span>
                    <span className="time-separator">→</span>
                    <span className="end-time">{formatTime(schedule.endTime)}</span>
                  </div>
                  
                  <div className="trip-details">
                    <div className="trip-route">
                      <span className="route-icon">🛣️</span>
                      <span className="route-name">{schedule.route?.name || schedule.routeName}</span>
                    </div>
                    <div className="trip-bus">
                      <span className="bus-icon">🚌</span>
                      <span className="bus-number">{schedule.bus?.number || schedule.busNumber}</span>
                      {schedule.bus?.type && (
                        <span className={`bus-type ${schedule.bus.type.toLowerCase()}`}>
                          {schedule.bus.type}
                        </span>
                      )}
                    </div>
                    <div className="trip-meta">
                      <span className="duration">⏱️ ~{schedule.route?.estimatedDuration || 60} min</span>
                      {status === 'active' && <span className="status-badge active">Ready to Start</span>}
                      {status === 'upcoming' && <span className="status-badge upcoming">Upcoming</span>}
                      {status === 'passed' && <span className="status-badge passed">Time Passed</span>}
                    </div>
                  </div>
                  
                  {selectedScheduleId === schedule.id && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Selection View */}
      {(viewMode === 'manual' || todaySchedules.length === 0) && (
        <>
          <div className="selection-section">
            <h3>🚌 Select Your Bus</h3>
            <div className="bus-list">
              {buses.length === 0 ? (
                <div className="no-data">No buses assigned to you</div>
              ) : (
                buses.map((bus) => (
                  <div
                    key={bus.id}
                    className={`bus-option ${selectedBusId === bus.id ? 'selected' : ''}`}
                    onClick={() => handleBusSelect(bus.id)}
                  >
                    <div className="bus-number">{bus.number}</div>
                    <div className="bus-meta">
                      <span className={`bus-type ${bus.type.toLowerCase()}`}>{bus.type}</span>
                      <span className="bus-capacity">{bus.capacity} seats</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedBusId && routes.length > 0 && (
            <div className="selection-section">
              <h3>🛣️ Select Route</h3>
              <div className="route-list">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className={`route-option ${selectedRouteId === route.id ? 'selected' : ''}`}
                    onClick={() => handleRouteSelect(route.id)}
                  >
                    <div className="route-name">{route.name}</div>
                    <div className="route-duration">⏱️ ~{route.estimatedDuration} min</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedBusId && routes.length === 0 && (
            <div className="no-routes-message">
              <p>⚠️ No routes scheduled for this bus today</p>
              <small>Contact admin to assign routes</small>
            </div>
          )}
        </>
      )}

      <button
        className="btn btn-primary"
        disabled={!canContinue}
        onClick={handleContinue}
      >
        Continue to Trip →
      </button>
    </div>
  );
}

export default BusSelection;
