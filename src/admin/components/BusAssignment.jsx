import { useState, useEffect } from 'react';
import { getBuses, getRoutes, getDrivers, updateBus } from '../services/adminService';
import { dataStore } from '../../services/sharedDataService';

function BusAssignment() {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [filterRoute, setFilterRoute] = useState('');
  
  const [formData, setFormData] = useState({
    busId: '',
    routeId: '',
    driverId: '',
    startTime: '06:00',
    endTime: '10:00',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [busesData, routesData, driversData, schedulesData] = await Promise.all([
        getBuses(),
        getRoutes(),
        getDrivers(),
        dataStore.getSchedules()
      ]);
      setBuses(busesData);
      setRoutes(routesData);
      setDrivers(driversData);
      setSchedules(schedulesData);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const bus = buses.find(b => b.id === formData.busId);
    const route = routes.find(r => r.id === formData.routeId);
    const driver = drivers.find(d => d.id === formData.driverId);

    try {
      if (editingSchedule) {
        await dataStore.updateSchedule(editingSchedule.id, {
          ...formData,
          busNumber: bus?.number,
          routeName: route?.name,
          driverName: driver?.name
        });
      } else {
        await dataStore.addSchedule({
          ...formData,
          busNumber: bus?.number,
          routeName: route?.name,
          driverName: driver?.name
        });
      }

      if (bus) {
        const currentRoutes = bus.assignedRoutes || [];
        if (!currentRoutes.includes(formData.routeId)) {
          await updateBus(formData.busId, {
            assignedRoutes: [...currentRoutes, formData.routeId]
          });
        }
      }

      await loadData();
      resetForm();
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
  };

  const handleEdit = (schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      busId: schedule.busId,
      routeId: schedule.routeId,
      driverId: schedule.driverId || '',
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      days: schedule.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      status: schedule.status || 'active'
    });
    setShowAddModal(true);
  };

  const handleDelete = async (scheduleId) => {
    if (!confirm('Delete this schedule?')) return;
    try {
      await dataStore.deleteSchedule(scheduleId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  const handleToggleStatus = async (schedule) => {
    try {
      await dataStore.updateSchedule(schedule.id, {
        status: schedule.status === 'active' ? 'inactive' : 'active'
      });
      await loadData();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setEditingSchedule(null);
    setFormData({
      busId: '',
      routeId: '',
      driverId: '',
      startTime: '06:00',
      endTime: '10:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      status: 'active'
    });
  };

  const toggleDay = (day) => {
    const days = formData.days.includes(day)
      ? formData.days.filter(d => d !== day)
      : [...formData.days, day];
    setFormData({ ...formData, days });
  };

  const getSchedulesForRoute = (routeId) => {
    return schedules.filter(s => s.routeId === routeId);
  };

  const filteredRoutes = filterRoute 
    ? routes.filter(r => r.id === filterRoute)
    : routes;

  const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const formatTime = (time) => {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const isCurrentlyActive = (schedule) => {
    const now = new Date();
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);
    
    return schedule.status === 'active' &&
           schedule.days.includes(currentDay) &&
           currentTime >= schedule.startTime &&
           currentTime <= schedule.endTime;
  };

  if (loading) {
    return (
      <div className="assignment-loading-state">
        <div className="assignment-loading-animation">
          <div className="assignment-loading-spinner">🔗</div>
        </div>
        <div className="assignment-loading-text">Loading Bus Assignments</div>
        <div className="assignment-loading-subtext">Fetching schedules, routes, and driver assignments...</div>
      </div>
    );
  }

  return (
    <div className="bus-assignment">
      {/* Ultra-Enhanced Header */}
      <div className="bus-assignment-header">
        <div className="bus-assignment-title">
          <h1>
            <span className="title-icon">🔗</span>
            Bus Schedules & Assignment
          </h1>
        </div>
        <p className="bus-assignment-subtitle">
          Comprehensive bus scheduling with route assignments, driver allocation, and shift management
        </p>
        
        {/* Advanced Statistics Grid */}
        <div className="assignment-stats-grid">
          <div className="assignment-stat-card primary">
            <span className="assignment-stat-icon">📅</span>
            <span className="assignment-stat-value">{schedules.length}</span>
            <span className="assignment-stat-label">Total Schedules</span>
          </div>
          <div className="assignment-stat-card">
            <span className="assignment-stat-icon">✅</span>
            <span className="assignment-stat-value">{schedules.filter(s => s.status === 'active').length}</span>
            <span className="assignment-stat-label">Active Schedules</span>
          </div>
          <div className="assignment-stat-card">
            <span className="assignment-stat-icon">🔴</span>
            <span className="assignment-stat-value">{schedules.filter(s => isCurrentlyActive(s)).length}</span>
            <span className="assignment-stat-label">Running Now</span>
          </div>
          <div className="assignment-stat-card">
            <span className="assignment-stat-icon">⚠️</span>
            <span className="assignment-stat-value">{routes.filter(r => getSchedulesForRoute(r.id).length === 0).length}</span>
            <span className="assignment-stat-label">Unscheduled Routes</span>
          </div>
        </div>
        
        {/* Advanced Action Bar */}
        <div className="assignment-action-bar">
          <div className="assignment-quick-actions">
            <button className="assignment-quick-btn" onClick={loadData}>
              <span>🔄</span>
              Refresh
            </button>
            <button className="assignment-quick-btn">
              <span>📊</span>
              Analytics
            </button>
            <button className="assignment-quick-btn">
              <span>📤</span>
              Export
            </button>
          </div>
          <button className="assignment-quick-btn primary" onClick={() => setShowAddModal(true)}>
            <span>➕</span>
            Create New Schedule
          </button>
        </div>
      </div>

      {/* Enhanced Filter Bar */}
      <div className="assignment-filter-bar">
        <div className="filter-section">
          <label className="filter-label">Filter by Route</label>
          <select
            value={filterRoute}
            onChange={(e) => setFilterRoute(e.target.value)}
            className="assignment-filter-select"
          >
            <option value="">All Routes</option>
            {routes.map(route => (
              <option key={route.id} value={route.id}>{route.name}</option>
            ))}
          </select>
        </div>
        <div className="assignment-stats-info">
          <span className="stats-badge">
            {schedules.length} total schedules
          </span>
          <span className="stats-badge">
            {routes.length} routes
          </span>
        </div>
      </div>

      {/* Enhanced Modal */}
      {showAddModal && (
        <div className="modal-overlay-enhanced">
          <div className="modal-enhanced assignment-modal-enhanced">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <span className="modal-icon">🔗</span>
                <div>
                  <h3 className="modal-title-enhanced">
                    {editingSchedule ? 'Edit Bus Schedule' : 'Create New Schedule'}
                  </h3>
                  <p className="modal-subtitle">
                    {editingSchedule ? 'Update schedule timing and assignments' : 'Assign a bus to a route with shift timings'}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={resetForm}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-enhanced">
              <form onSubmit={handleSubmit}>
                <div className="assignment-form-section">
                  <h4 className="assignment-form-section-title">
                    <span className="assignment-form-section-icon">🚌</span>
                    Bus & Route Assignment
                  </h4>
                  
                  <div className="form-grid">
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Select Bus</label>
                      <select
                        value={formData.busId}
                        onChange={(e) => setFormData({ ...formData, busId: e.target.value })}
                        className="form-input-enhanced"
                        required
                      >
                        <option value="">Choose a bus</option>
                        {buses.filter(b => b.status === 'active').map(bus => (
                          <option key={bus.id} value={bus.id}>
                            {bus.number} ({bus.type}, {bus.capacity} seats)
                          </option>
                        ))}
                      </select>
                      <div className="form-help-text">
                        Select an active bus for this schedule
                      </div>
                    </div>

                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Select Route</label>
                      <select
                        value={formData.routeId}
                        onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                        className="form-input-enhanced"
                        required
                      >
                        <option value="">Choose a route</option>
                        {routes.map(route => (
                          <option key={route.id} value={route.id}>
                            {route.name}
                          </option>
                        ))}
                      </select>
                      <div className="form-help-text">
                        Select the route for this bus assignment
                      </div>
                    </div>
                  </div>
                </div>

                <div className="assignment-form-section">
                  <h4 className="assignment-form-section-title">
                    <span className="assignment-form-section-icon">👤</span>
                    Driver & Status
                  </h4>
                  
                  <div className="form-grid">
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Assign Driver</label>
                      <select
                        value={formData.driverId}
                        onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                        className="form-input-enhanced"
                      >
                        <option value="">Select driver (optional)</option>
                        {drivers.filter(d => d.status === 'active').map(driver => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name}
                          </option>
                        ))}
                      </select>
                      <div className="form-help-text">
                        Optionally assign a driver to this schedule
                      </div>
                    </div>

                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Schedule Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="form-input-enhanced"
                      >
                        <option value="active">Active - Schedule is operational</option>
                        <option value="inactive">Inactive - Schedule is paused</option>
                      </select>
                      <div className="form-help-text">
                        Set the operational status of this schedule
                      </div>
                    </div>
                  </div>
                </div>

                <div className="assignment-form-section">
                  <h4 className="assignment-form-section-title">
                    <span className="assignment-form-section-icon">⏰</span>
                    Shift Timing
                  </h4>
                  
                  <div className="form-grid">
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Shift Start Time</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="form-input-enhanced"
                        required
                      />
                      <div className="form-help-text">
                        When the bus shift begins
                      </div>
                    </div>

                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Shift End Time</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="form-input-enhanced"
                        required
                      />
                      <div className="form-help-text">
                        When the bus shift ends
                      </div>
                    </div>
                  </div>
                </div>

                <div className="assignment-form-section">
                  <h4 className="assignment-form-section-title">
                    <span className="assignment-form-section-icon">📅</span>
                    Operating Days
                  </h4>
                  
                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Select Operating Days</label>
                    <div className="assignment-days-selector">
                      {allDays.map(day => (
                        <button
                          key={day}
                          type="button"
                          className={`assignment-day-btn ${formData.days.includes(day) ? 'selected' : ''}`}
                          onClick={() => toggleDay(day)}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className="form-help-text">
                      Select the days when this schedule is active
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="modal-actions-enhanced">
              <div className="action-group">
                <button type="button" className="btn-enhanced btn-secondary-enhanced" onClick={resetForm}>
                  <span>✕</span>
                  Cancel
                </button>
                <button type="submit" className="btn-enhanced btn-primary-enhanced" onClick={handleSubmit}>
                  <span>{editingSchedule ? '💾' : '➕'}</span>
                  {editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Schedules List */}
      <div className="assignment-schedules-list">
        {filteredRoutes.map(route => {
          const routeSchedules = getSchedulesForRoute(route.id);
          const hasActiveSchedules = routeSchedules.some(s => isCurrentlyActive(s));
          
          return (
            <div key={route.id} className={`assignment-route-card ${hasActiveSchedules ? 'featured' : ''}`}>
              <div className="assignment-route-header">
                <div className="assignment-route-info">
                  <h4 className="assignment-route-title">
                    <span className="assignment-route-icon">🛣️</span>
                    {route.name}
                  </h4>
                  <div className="assignment-route-meta">
                    <span>📍 {route.stops?.length || 0} stops</span>
                    <span>⏱️ ~{route.estimatedDuration} min</span>
                  </div>
                </div>
                <div className="assignment-route-stats">
                  <span className="assignment-stat-badge">
                    {routeSchedules.length} schedules
                  </span>
                  {routeSchedules.filter(s => isCurrentlyActive(s)).length > 0 && (
                    <span className="assignment-stat-badge active">
                      {routeSchedules.filter(s => isCurrentlyActive(s)).length} active now
                    </span>
                  )}
                </div>
              </div>

              {routeSchedules.length === 0 ? (
                <div className="assignment-no-schedules">
                  <div className="assignment-no-schedules-icon">📅</div>
                  <h5 className="assignment-no-schedules-title">No Schedules Created</h5>
                  <p className="assignment-no-schedules-message">
                    This route doesn't have any bus schedules yet. Create a schedule to assign buses and drivers.
                  </p>
                  <button 
                    className="assignment-no-schedules-action"
                    onClick={() => {
                      setFormData({ ...formData, routeId: route.id });
                      setShowAddModal(true);
                    }}
                  >
                    <span>➕</span>
                    Create First Schedule
                  </button>
                </div>
              ) : (
                <div className="assignment-schedule-table">
                  <div className="assignment-schedule-header">
                    <span>Bus</span>
                    <span>Driver</span>
                    <span>Shift Time</span>
                    <span>Days</span>
                    <span>Status</span>
                    <span>Actions</span>
                  </div>
                  {routeSchedules.map(schedule => (
                    <div 
                      key={schedule.id} 
                      className={`assignment-schedule-row ${isCurrentlyActive(schedule) ? 'currently-active' : ''}`}
                    >
                      <span className="assignment-bus-cell">
                        <span className="assignment-bus-icon">🚌</span>
                        <div>
                          <div className="assignment-bus-number">{schedule.busNumber}</div>
                          <div className="assignment-bus-details">Bus #{schedule.busId}</div>
                        </div>
                      </span>
                      <span className={`assignment-driver-cell ${schedule.driverName ? 'assigned' : ''}`}>
                        {schedule.driverName || 'No driver assigned'}
                      </span>
                      <span className="assignment-time-cell">
                        {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
                      </span>
                      <span className="assignment-days-cell">
                        {schedule.days?.join(', ') || 'All days'}
                      </span>
                      <span className="assignment-status-cell">
                        <button 
                          className={`assignment-status-toggle ${schedule.status}`}
                          onClick={() => handleToggleStatus(schedule)}
                        >
                          {schedule.status === 'active' ? '✓ Active' : '○ Inactive'}
                        </button>
                      </span>
                      <span className="assignment-actions-cell">
                        <button 
                          className="assignment-action-btn" 
                          onClick={() => handleEdit(schedule)}
                          title="Edit schedule"
                        >
                          <span>✏️</span>
                          Edit
                        </button>
                        <button 
                          className="assignment-action-btn danger" 
                          onClick={() => handleDelete(schedule.id)}
                          title="Delete schedule"
                        >
                          <span>🗑️</span>
                          Delete
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enhanced Assignment Summary */}
      <div className="assignment-summary-card">
        <div className="assignment-summary-header">
          <span className="assignment-summary-icon">📊</span>
          <h4 className="assignment-summary-title">Schedule Analytics Overview</h4>
        </div>
        <div className="assignment-summary-stats">
          <div className="assignment-summary-item">
            <span className="assignment-summary-value">{schedules.length}</span>
            <span className="assignment-summary-label">Total Schedules</span>
          </div>
          <div className="assignment-summary-item success">
            <span className="assignment-summary-value">
              {schedules.filter(s => s.status === 'active').length}
            </span>
            <span className="assignment-summary-label">Active Schedules</span>
          </div>
          <div className="assignment-summary-item highlight">
            <span className="assignment-summary-value">
              {schedules.filter(s => isCurrentlyActive(s)).length}
            </span>
            <span className="assignment-summary-label">Running Now</span>
          </div>
          <div className="assignment-summary-item warning">
            <span className="assignment-summary-value">
              {routes.filter(r => getSchedulesForRoute(r.id).length === 0).length}
            </span>
            <span className="assignment-summary-label">Unscheduled Routes</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusAssignment;
