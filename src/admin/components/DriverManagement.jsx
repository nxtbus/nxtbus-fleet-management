import { useState, useEffect } from 'react';
import { getDrivers, addDriver, updateDriver, deleteDriver, getBuses } from '../services/adminService';

function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    pin: '',
    status: 'active',
    assignedBuses: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [driversData, busesData] = await Promise.all([
        getDrivers(),
        getBuses()
      ]);
      setDrivers(driversData);
      setBuses(busesData);
    } catch (err) {
      console.error('Failed to load drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await updateDriver(editingDriver.id, formData);
      } else {
        await addDriver(formData);
      }
      await loadData();
      resetForm();
    } catch (err) {
      alert('Failed to save driver');
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      pin: driver.pin,
      status: driver.status,
      assignedBuses: driver.assignedBuses || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;
    try {
      await deleteDriver(id);
      await loadData();
    } catch (err) {
      alert('Failed to delete driver');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingDriver(null);
    setFormData({ name: '', phone: '', pin: '', status: 'active', assignedBuses: [] });
  };

  const getStatusBadge = (status) => {
    const classes = {
      active: 'badge-success',
      inactive: 'badge-danger',
      onLeave: 'badge-warning'
    };
    return <span className={`badge ${classes[status] || 'badge-secondary'}`}>{status}</span>;
  };

  if (loading) {
    return (
      <div className="driver-loading-state">
        <div className="driver-loading-animation">
          <div className="driver-loading-spinner">👤</div>
        </div>
        <div className="driver-loading-text">Loading Driver Database</div>
        <div className="driver-loading-subtext">Fetching driver profiles and assignments...</div>
      </div>
    );
  }

  return (
    <div className="driver-management">
      {/* Ultra-Enhanced Header */}
      <div className="driver-management-header">
        <div className="driver-management-title">
          <h1>
            <span className="title-icon">👤</span>
            Driver Management
          </h1>
        </div>
        <p className="driver-management-subtitle">
          Comprehensive driver management with profile tracking, bus assignments, and performance analytics
        </p>
        
        {/* Advanced Statistics Grid */}
        <div className="driver-stats-grid">
          <div className="driver-stat-card primary">
            <span className="driver-stat-icon">👥</span>
            <span className="driver-stat-value">{drivers.length}</span>
            <span className="driver-stat-label">Total Drivers</span>
          </div>
          <div className="driver-stat-card">
            <span className="driver-stat-icon">✅</span>
            <span className="driver-stat-value">{drivers.filter(d => d.status === 'active').length}</span>
            <span className="driver-stat-label">Active Drivers</span>
          </div>
          <div className="driver-stat-card">
            <span className="driver-stat-icon">🚌</span>
            <span className="driver-stat-value">{drivers.reduce((acc, d) => acc + (d.assignedBuses?.length || 0), 0)}</span>
            <span className="driver-stat-label">Bus Assignments</span>
          </div>
          <div className="driver-stat-card">
            <span className="driver-stat-icon">🏖️</span>
            <span className="driver-stat-value">{drivers.filter(d => d.status === 'onLeave').length}</span>
            <span className="driver-stat-label">On Leave</span>
          </div>
        </div>
        
        {/* Advanced Action Bar */}
        <div className="driver-action-bar">
          <div className="driver-quick-actions">
            <button className="driver-quick-btn" onClick={loadData}>
              <span>🔄</span>
              Refresh
            </button>
            <button className="driver-quick-btn">
              <span>📊</span>
              Analytics
            </button>
            <button className="driver-quick-btn">
              <span>📤</span>
              Export
            </button>
          </div>
          <button className="driver-quick-btn primary" onClick={() => setShowForm(true)}>
            <span>➕</span>
            Add New Driver
          </button>
        </div>
      </div>

      {/* Enhanced Driver Form Modal */}
      {showForm && (
        <div className="modal-overlay-enhanced">
          <div className="modal-enhanced driver-form-modal">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <span className="modal-icon">👤</span>
                <div>
                  <h3 className="modal-title-enhanced">
                    {editingDriver ? 'Edit Driver Profile' : 'Add New Driver'}
                  </h3>
                  <p className="modal-subtitle">
                    {editingDriver ? 'Update driver information and assignments' : 'Create a new driver profile with bus assignments'}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={resetForm}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-enhanced">
              <form onSubmit={handleSubmit}>
                <div className="driver-form-section">
                  <h4 className="driver-form-section-title">
                    <span className="driver-form-section-icon">📝</span>
                    Personal Information
                  </h4>
                  
                  <div className="driver-form-group">
                    <label className="driver-form-label">Full Name</label>
                    <div className="driver-form-input-with-icon">
                      <span className="driver-form-input-icon">👤</span>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Rajesh Kumar Singh"
                        className="driver-form-input"
                        required
                      />
                    </div>
                    <div className="driver-form-help">
                      Enter the driver's complete legal name as per official documents
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="driver-form-group">
                      <label className="driver-form-label">Phone Number</label>
                      <div className="driver-form-input-with-icon">
                        <span className="driver-form-input-icon">📱</span>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="e.g., 9876543210"
                          pattern="[0-9]{10}"
                          className="driver-form-input"
                          required
                        />
                      </div>
                      <div className="driver-form-help">
                        10-digit mobile number for app login and communication
                      </div>
                    </div>

                    <div className="driver-form-group">
                      <label className="driver-form-label">Security PIN</label>
                      <div className="driver-form-input-with-icon">
                        <span className="driver-form-input-icon">🔒</span>
                        <input
                          type="password"
                          value={formData.pin}
                          onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                          placeholder="4-digit PIN"
                          pattern="[0-9]{4}"
                          maxLength="4"
                          className="driver-form-input"
                          required
                        />
                      </div>
                      <div className="driver-form-help">
                        4-digit PIN for secure app access
                      </div>
                    </div>
                  </div>
                </div>

                <div className="driver-form-section">
                  <h4 className="driver-form-section-title">
                    <span className="driver-form-section-icon">⚙️</span>
                    Status & Settings
                  </h4>
                  
                  <div className="driver-form-group">
                    <label className="driver-form-label">Driver Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="driver-form-input"
                    >
                      <option value="active">Active - Available for assignments</option>
                      <option value="inactive">Inactive - Not available</option>
                      <option value="onLeave">On Leave - Temporarily unavailable</option>
                    </select>
                    <div className="driver-form-help">
                      Current availability status for route assignments
                    </div>
                  </div>
                </div>

                <div className="driver-form-section">
                  <h4 className="driver-form-section-title">
                    <span className="driver-form-section-icon">🚌</span>
                    Bus Assignments
                  </h4>
                  
                  <div className="bus-assignment-section">
                    <div className="bus-assignment-title">
                      <span>🚌</span>
                      Select Assigned Buses
                    </div>
                    
                    <div className="bus-selection-grid">
                      {buses.map(bus => (
                        <div
                          key={bus.id}
                          className={`bus-option ${formData.assignedBuses.includes(bus.id) ? 'selected' : ''}`}
                          onClick={() => {
                            const isSelected = formData.assignedBuses.includes(bus.id);
                            const newAssignments = isSelected
                              ? formData.assignedBuses.filter(id => id !== bus.id)
                              : [...formData.assignedBuses, bus.id];
                            setFormData({ ...formData, assignedBuses: newAssignments });
                          }}
                        >
                          <div className="bus-checkbox">
                            {formData.assignedBuses.includes(bus.id) && '✓'}
                          </div>
                          <div className="bus-info">
                            <div className="bus-number">{bus.number}</div>
                            <div className="bus-type">{bus.type}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="driver-form-help">
                      Select one or more buses that this driver is authorized to operate
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
                  <span>{editingDriver ? '💾' : '➕'}</span>
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Driver Table */}
      {drivers.length > 0 ? (
        <div className="driver-table-container">
          <div className="driver-table-header">
            <h3 className="driver-table-title">
              <span>👥</span>
              Driver Database
            </h3>
            <p className="driver-table-subtitle">
              Manage driver profiles, assignments, and access credentials
            </p>
          </div>
          
          <table className="driver-table">
            <thead>
              <tr>
                <th>Driver Profile</th>
                <th>Contact</th>
                <th>Security</th>
                <th>Status</th>
                <th>Assigned Buses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map(driver => (
                <tr key={driver.id}>
                  <td>
                    <div className="driver-name">
                      <div className="driver-avatar">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {driver.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          ID: #{driver.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="driver-phone">{driver.phone}</div>
                  </td>
                  <td>
                    <div className="driver-pin">****</div>
                  </td>
                  <td>
                    <div className={`driver-status-badge ${driver.status}`}>
                      <div className={`status-dot ${driver.status}`}></div>
                      {driver.status}
                    </div>
                  </td>
                  <td>
                    <div className="assigned-buses">
                      {(driver.assignedBuses || []).length > 0 ? (
                        (driver.assignedBuses || []).map(bId => {
                          const bus = buses.find(b => b.id === bId);
                          return bus ? (
                            <span key={bId} className="bus-tag">
                              {bus.number}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="no-buses">No assignments</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="driver-actions">
                      <button 
                        className="driver-action-btn" 
                        onClick={() => handleEdit(driver)}
                        title="Edit driver"
                      >
                        <span>✏️</span>
                        Edit
                      </button>
                      <button 
                        className="driver-action-btn danger" 
                        onClick={() => handleDelete(driver.id)}
                        title="Delete driver"
                      >
                        <span>🗑️</span>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="driver-empty-state">
          <div className="driver-empty-icon">👤</div>
          <h3 className="driver-empty-title">No Drivers Found</h3>
          <p className="driver-empty-message">
            Start building your driver database by adding your first driver profile.
            Drivers can use their phone number and PIN to access the driver app.
          </p>
          <button className="driver-empty-action" onClick={() => setShowForm(true)}>
            <span>➕</span>
            Add Your First Driver
          </button>
        </div>
      )}

      {/* Enhanced Driver Info Card */}
      <div className="driver-info-card">
        <div className="driver-info-header">
          <span className="driver-info-icon">📱</span>
          <h4 className="driver-info-title">Driver App Access Information</h4>
        </div>
        
        <div className="driver-info-content">
          <p>
            Drivers can access the <strong>Driver Mobile App</strong> using their registered phone number and 4-digit PIN.
            The app provides real-time trip management, passenger updates, and route navigation.
          </p>
          <p>
            <strong>Driver App URL:</strong> <code>/driver</code>
          </p>
        </div>
        
        <div className="driver-login-steps">
          <h5>
            <span>🔐</span>
            Login Process
          </h5>
          <ol>
            <li>Driver opens the Driver App on their mobile device</li>
            <li>Enters their registered 10-digit phone number</li>
            <li>Inputs their secure 4-digit PIN</li>
            <li>Gets access to assigned routes and trip management</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default DriverManagement;
