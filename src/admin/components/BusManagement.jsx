import { useState, useEffect } from 'react';
import { getBuses, addBus, updateBus, deleteBus, getDrivers, getOwners } from '../services/adminService';

function BusManagement() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBus, setEditingBus] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    number: '',
    type: 'AC',
    capacity: 40,
    status: 'active',
    ownerId: '',
    assignedDrivers: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [busesData, driversData, ownersData] = await Promise.all([
        getBuses(),
        getDrivers(),
        getOwners()
      ]);
      setBuses(busesData);
      setDrivers(driversData);
      setOwners(ownersData);
    } catch (err) {
      console.error('Failed to load buses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBus) {
        await updateBus(editingBus.id, formData);
      } else {
        await addBus(formData);
      }
      await loadData();
      resetForm();
    } catch (err) {
      alert('Failed to save bus');
    }
  };

  const handleEdit = (bus) => {
    setEditingBus(bus);
    setFormData({
      number: bus.number,
      type: bus.type,
      capacity: bus.capacity,
      status: bus.status,
      ownerId: bus.ownerId || '',
      assignedDrivers: bus.assignedDrivers || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this bus?')) return;
    try {
      await deleteBus(id);
      await loadData();
    } catch (err) {
      alert('Failed to delete bus');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBus(null);
    setFormData({ number: '', type: 'AC', capacity: 40, status: 'active', ownerId: '', assignedDrivers: [] });
  };

  const getOwnerName = (ownerId) => {
    if (!ownerId) return '-';
    const owner = owners.find(o => o.id === ownerId);
    return owner ? owner.name : '-';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'bus-status-active', icon: '✅', label: 'Active' },
      maintenance: { class: 'bus-status-maintenance', icon: '🔧', label: 'Maintenance' },
      inactive: { class: 'bus-status-inactive', icon: '⏸️', label: 'Inactive' }
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`bus-status-badge ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    const typeIcons = {
      'AC': '❄️',
      'Non-AC': '🌡️',
      'Electric': '⚡',
      'Diesel': '⛽'
    };
    return typeIcons[type] || '🚌';
  };

  const filteredBuses = buses.filter(bus => {
    const matchesStatus = filterStatus === 'all' || bus.status === filterStatus;
    const matchesType = filterType === 'all' || bus.type === filterType;
    const matchesSearch = bus.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getOwnerName(bus.ownerId).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const getFleetStats = () => {
    const total = buses.length;
    const active = buses.filter(b => b.status === 'active').length;
    const maintenance = buses.filter(b => b.status === 'maintenance').length;
    const inactive = buses.filter(b => b.status === 'inactive').length;
    const totalCapacity = buses.reduce((sum, bus) => sum + bus.capacity, 0);
    
    return { total, active, maintenance, inactive, totalCapacity };
  };

  const stats = getFleetStats();

  if (loading) {
    return (
      <div className="bus-management-loading-state">
        <div className="bus-loading-animation">
          <div className="bus-loading-spinner">🚌</div>
        </div>
        <div className="bus-loading-text">Loading Fleet Management</div>
        <div className="bus-loading-subtext">Fetching buses, drivers, and owner information...</div>
      </div>
    );
  }

  return (
    <div className="bus-management">
      {/* Ultra-Enhanced Header */}
      <div className="bus-management-header">
        <div className="bus-management-title">
          <h1>
            <span className="title-icon">🚌</span>
            Fleet Management System
          </h1>
        </div>
        <p className="bus-management-subtitle">
          Comprehensive bus fleet management with real-time status monitoring, driver assignments, and operational analytics
        </p>
        
        {/* Advanced Statistics Grid */}
        <div className="bus-stats-grid">
          <div className="bus-stat-card primary">
            <span className="bus-stat-icon">🚌</span>
            <span className="bus-stat-value">{stats.total}</span>
            <span className="bus-stat-label">Total Fleet</span>
          </div>
          <div className="bus-stat-card success">
            <span className="bus-stat-icon">✅</span>
            <span className="bus-stat-value">{stats.active}</span>
            <span className="bus-stat-label">Active Buses</span>
          </div>
          <div className="bus-stat-card warning">
            <span className="bus-stat-icon">🔧</span>
            <span className="bus-stat-value">{stats.maintenance}</span>
            <span className="bus-stat-label">In Maintenance</span>
          </div>
          <div className="bus-stat-card">
            <span className="bus-stat-icon">👥</span>
            <span className="bus-stat-value">{stats.totalCapacity}</span>
            <span className="bus-stat-label">Total Capacity</span>
          </div>
        </div>
        
        {/* Advanced Action Bar */}
        <div className="bus-action-bar">
          <div className="bus-quick-actions">
            <button className="bus-quick-btn" onClick={loadData}>
              <span>🔄</span>
              Refresh
            </button>
            <button className="bus-quick-btn">
              <span>📊</span>
              Analytics
            </button>
            <button className="bus-quick-btn">
              <span>📤</span>
              Export
            </button>
          </div>
          <button className="bus-quick-btn primary" onClick={() => setShowForm(true)}>
            <span>➕</span>
            Add New Bus
          </button>
        </div>
      </div>

      {/* Enhanced Filter & Search Bar */}
      <div className="bus-filter-bar">
        <div className="filter-section">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search buses, owners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bus-search-input"
            />
          </div>
          
          <div className="filter-controls">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bus-filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bus-filter-select"
            >
              <option value="all">All Types</option>
              <option value="AC">AC</option>
              <option value="Non-AC">Non-AC</option>
              <option value="Electric">Electric</option>
              <option value="Diesel">Diesel</option>
            </select>
          </div>
        </div>
        
        <div className="view-controls">
          <div className="results-count">
            {filteredBuses.length} of {buses.length} buses
          </div>
        </div>
      </div>

      {/* Enhanced Modal */}
      {showForm && (
        <div className="modal-overlay-enhanced">
          <div className="modal-enhanced bus-form-modal">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <span className="modal-icon">🚌</span>
                <div>
                  <h3 className="modal-title-enhanced">
                    {editingBus ? 'Edit Bus Details' : 'Add New Bus to Fleet'}
                  </h3>
                  <p className="modal-subtitle">
                    {editingBus ? 'Update bus information and assignments' : 'Register a new bus in the fleet management system'}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={resetForm}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-enhanced">
              <form onSubmit={handleSubmit}>
                <div className="bus-form-section">
                  <h4 className="bus-form-section-title">
                    <span className="bus-form-section-icon">🚌</span>
                    Bus Information
                  </h4>
                  
                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Bus Number</label>
                    <input
                      type="text"
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      placeholder="e.g., 101A, KA-01-AB-1234"
                      className="form-input-enhanced"
                      required
                    />
                    <div className="form-help-text">
                      Enter unique bus registration number
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Bus Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="form-input-enhanced"
                      >
                        <option value="AC">❄️ AC Bus</option>
                        <option value="Non-AC">🌡️ Non-AC Bus</option>
                        <option value="Electric">⚡ Electric Bus</option>
                        <option value="Diesel">⛽ Diesel Bus</option>
                      </select>
                      <div className="form-help-text">
                        Select the bus type and fuel system
                      </div>
                    </div>

                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Seating Capacity</label>
                      <input
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        min="10"
                        max="100"
                        className="form-input-enhanced"
                      />
                      <div className="form-help-text">
                        Total passenger seating capacity
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bus-form-section">
                  <h4 className="bus-form-section-title">
                    <span className="bus-form-section-icon">⚙️</span>
                    Operational Status
                  </h4>
                  
                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Current Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="form-input-enhanced"
                    >
                      <option value="active">✅ Active - Ready for service</option>
                      <option value="maintenance">🔧 Under Maintenance</option>
                      <option value="inactive">⏸️ Inactive - Out of service</option>
                    </select>
                    <div className="form-help-text">
                      Set the current operational status
                    </div>
                  </div>
                </div>

                <div className="bus-form-section">
                  <h4 className="bus-form-section-title">
                    <span className="bus-form-section-icon">👤</span>
                    Ownership & Assignment
                  </h4>
                  
                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Bus Owner</label>
                    <select
                      value={formData.ownerId}
                      onChange={(e) => setFormData({ ...formData, ownerId: e.target.value || null })}
                      className="form-input-enhanced"
                    >
                      <option value="">-- No Owner Assigned --</option>
                      {owners.filter(o => o.status === 'active').map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <div className="form-help-text">
                      Assign bus to a registered owner
                    </div>
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Assigned Drivers</label>
                    <select
                      multiple
                      value={formData.assignedDrivers}
                      onChange={(e) => setFormData({
                        ...formData,
                        assignedDrivers: Array.from(e.target.selectedOptions, o => o.value)
                      })}
                      className="form-input-enhanced driver-select"
                    >
                      {drivers.filter(d => d.status === 'active').map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    <div className="form-help-text">
                      Hold Ctrl/Cmd to select multiple drivers
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
                  <span>{editingBus ? '💾' : '➕'}</span>
                  {editingBus ? 'Update Bus' : 'Add Bus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Bus Table */}
      <div className="bus-table-container">
        {filteredBuses.length === 0 ? (
          <div className="bus-empty-state">
            <div className="bus-empty-icon">🚌</div>
            <h3 className="bus-empty-title">No Buses Found</h3>
            <p className="bus-empty-message">
              {searchTerm || filterStatus !== 'all' || filterType !== 'all' 
                ? 'No buses match your current filters. Try adjusting your search criteria.'
                : 'Your fleet is empty. Add your first bus to get started with fleet management.'
              }
            </p>
            {(!searchTerm && filterStatus === 'all' && filterType === 'all') && (
              <button className="bus-empty-action" onClick={() => setShowForm(true)}>
                <span>➕</span>
                Add First Bus
              </button>
            )}
          </div>
        ) : (
          <div className="bus-table-wrapper">
            <table className="bus-table">
              <thead>
                <tr>
                  <th>Bus Details</th>
                  <th>Type & Capacity</th>
                  <th>Status</th>
                  <th>Owner</th>
                  <th>Assigned Drivers</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuses.map(bus => (
                  <tr key={bus.id} className={`bus-table-row ${bus.status}`}>
                    <td className="bus-details-cell">
                      <div className="bus-number-display">
                        <span className="bus-type-icon">{getTypeIcon(bus.type)}</span>
                        <strong className="bus-number-strong">{bus.number}</strong>
                      </div>
                    </td>
                    <td className="bus-type-cell">
                      <div className="type-capacity-info">
                        <span className="bus-type-text">{bus.type}</span>
                        <span className="bus-capacity-text">{bus.capacity} seats</span>
                      </div>
                    </td>
                    <td className="bus-status-cell">
                      {getStatusBadge(bus.status)}
                    </td>
                    <td className="bus-owner-cell">
                      {getOwnerName(bus.ownerId)}
                    </td>
                    <td className="bus-drivers-cell">
                      <div className="drivers-list">
                        {bus.assignedDrivers?.map(dId => {
                          const driver = drivers.find(d => d.id === dId);
                          return driver ? (
                            <span key={dId} className="driver-tag">{driver.name}</span>
                          ) : null;
                        }) || <span className="no-drivers">None assigned</span>}
                      </div>
                    </td>
                    <td className="bus-actions-cell">
                      <div className="table-actions">
                        <button className="bus-action-btn" onClick={() => handleEdit(bus)} title="Edit bus">
                          <span>✏️</span>
                        </button>
                        <button className="bus-action-btn danger" onClick={() => handleDelete(bus.id)} title="Delete bus">
                          <span>🗑️</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default BusManagement;
