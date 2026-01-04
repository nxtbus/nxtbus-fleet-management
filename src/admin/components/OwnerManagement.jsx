import { useState, useEffect, useCallback } from 'react';
import { getOwners, addOwner, updateOwner, deleteOwner, getBuses, updateBus } from '../services/adminService';

function OwnerManagement() {
  const [owners, setOwners] = useState([]);
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOwner, setEditingOwner] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', status: 'active'
  });

  const loadData = useCallback(async () => {
    try {
      const [ownersData, busesData] = await Promise.all([getOwners(), getBuses()]);
      setOwners(ownersData);
      setBuses(busesData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingOwner) {
        await updateOwner(editingOwner.id, formData);
      } else {
        await addOwner({ ...formData, createdAt: new Date().toISOString().split('T')[0] });
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error('Failed to save owner:', err);
    }
  };

  const handleEdit = (owner) => {
    setEditingOwner(owner);
    setFormData({ 
      name: owner.name, 
      email: owner.email, 
      phone: owner.phone, 
      address: owner.address, 
      status: owner.status 
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this owner? Buses will be unassigned.')) return;
    try {
      // Unassign buses first
      const ownerBuses = buses.filter(b => b.ownerId === id);
      await Promise.all(ownerBuses.map(b => updateBus(b.id, { ownerId: null })));
      await deleteOwner(id);
      loadData();
    } catch (err) {
      console.error('Failed to delete owner:', err);
    }
  };

  const handleAssignBus = async (busId, ownerId) => {
    try {
      await updateBus(busId, { ownerId });
      loadData();
    } catch (err) {
      console.error('Failed to assign bus:', err);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingOwner(null);
    setFormData({ name: '', email: '', phone: '', address: '', status: 'active' });
  };

  const getOwnerBuses = (ownerId) => buses.filter(b => b.ownerId === ownerId);
  const getUnassignedBuses = () => buses.filter(b => !b.ownerId);

  const getOwnerInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOwnerAvatarColor = (name) => {
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
      'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'owner-status-active', icon: '✅', label: 'Active' },
      inactive: { class: 'owner-status-inactive', icon: '⏸️', label: 'Inactive' }
    };
    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`owner-status-badge ${config.class}`}>
        <span className="status-icon">{config.icon}</span>
        {config.label}
      </span>
    );
  };

  const filteredOwners = owners.filter(owner => {
    const matchesStatus = filterStatus === 'all' || owner.status === filterStatus;
    const matchesSearch = owner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         owner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         owner.phone.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const getOwnershipStats = () => {
    const total = owners.length;
    const active = owners.filter(o => o.status === 'active').length;
    const inactive = owners.filter(o => o.status === 'inactive').length;
    const assignedBuses = buses.filter(b => b.ownerId).length;
    const unassignedBuses = getUnassignedBuses().length;
    
    return { total, active, inactive, assignedBuses, unassignedBuses };
  };

  const stats = getOwnershipStats();

  if (loading) {
    return (
      <div className="owner-management-loading-state">
        <div className="owner-loading-animation">
          <div className="owner-loading-spinner">👤</div>
        </div>
        <div className="owner-loading-text">Loading Owner Management</div>
        <div className="owner-loading-subtext">Fetching owners, bus assignments, and ownership data...</div>
      </div>
    );
  }

  return (
    <div className="owner-management">
      {/* Ultra-Enhanced Header */}
      <div className="owner-management-header">
        <div className="owner-management-title">
          <h1>
            <span className="title-icon">👤</span>
            Owner Management System
          </h1>
        </div>
        <p className="owner-management-subtitle">
          Comprehensive owner management with bus assignments, contact information, and ownership analytics
        </p>
        
        {/* Advanced Statistics Grid */}
        <div className="owner-stats-grid">
          <div className="owner-stat-card primary">
            <span className="owner-stat-icon">👥</span>
            <span className="owner-stat-value">{stats.total}</span>
            <span className="owner-stat-label">Total Owners</span>
          </div>
          <div className="owner-stat-card success">
            <span className="owner-stat-icon">✅</span>
            <span className="owner-stat-value">{stats.active}</span>
            <span className="owner-stat-label">Active Owners</span>
          </div>
          <div className="owner-stat-card">
            <span className="owner-stat-icon">🚌</span>
            <span className="owner-stat-value">{stats.assignedBuses}</span>
            <span className="owner-stat-label">Assigned Buses</span>
          </div>
          <div className="owner-stat-card warning">
            <span className="owner-stat-icon">📋</span>
            <span className="owner-stat-value">{stats.unassignedBuses}</span>
            <span className="owner-stat-label">Unassigned Buses</span>
          </div>
        </div>
        
        {/* Advanced Action Bar */}
        <div className="owner-action-bar">
          <div className="owner-quick-actions">
            <button className="owner-quick-btn" onClick={loadData}>
              <span>🔄</span>
              Refresh
            </button>
            <button className="owner-quick-btn">
              <span>📊</span>
              Analytics
            </button>
            <button className="owner-quick-btn">
              <span>📤</span>
              Export
            </button>
          </div>
          <div className="last-update-info">
            <span className="update-icon">🕒</span>
            <span className="update-text">Updated: {lastUpdate?.toLocaleTimeString()}</span>
          </div>
          <button className="owner-quick-btn primary" onClick={() => { setShowForm(true); setEditingOwner(null); setFormData({ name: '', email: '', phone: '', address: '', status: 'active' }); }}>
            <span>➕</span>
            Add New Owner
          </button>
        </div>
      </div>

      {/* Enhanced Filter & Search Bar */}
      <div className="owner-filter-bar">
        <div className="filter-section">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search owners, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="owner-search-input"
            />
          </div>
          
          <div className="filter-controls">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="owner-filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        
        <div className="view-controls">
          <div className="results-count">
            {filteredOwners.length} of {owners.length} owners
          </div>
        </div>
      </div>

      {/* Enhanced Modal */}
      {showForm && (
        <div className="modal-overlay-enhanced">
          <div className="modal-enhanced owner-form-modal">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <span className="modal-icon">👤</span>
                <div>
                  <h3 className="modal-title-enhanced">
                    {editingOwner ? 'Edit Owner Details' : 'Add New Owner'}
                  </h3>
                  <p className="modal-subtitle">
                    {editingOwner ? 'Update owner information and contact details' : 'Register a new bus owner in the system'}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={resetForm}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-enhanced">
              <form onSubmit={handleSubmit}>
                <div className="owner-form-section">
                  <h4 className="owner-form-section-title">
                    <span className="owner-form-section-icon">👤</span>
                    Owner Information
                  </h4>
                  
                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Owner Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Sharma Transport, Patel Bus Services"
                      className="form-input-enhanced"
                      required
                    />
                    <div className="form-help-text">
                      Enter the full name or company name
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="owner@example.com"
                        className="form-input-enhanced"
                        required
                      />
                      <div className="form-help-text">
                        Primary contact email address
                      </div>
                    </div>

                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="9876543210"
                        className="form-input-enhanced"
                        required
                      />
                      <div className="form-help-text">
                        Contact phone number
                      </div>
                    </div>
                  </div>
                </div>

                <div className="owner-form-section">
                  <h4 className="owner-form-section-title">
                    <span className="owner-form-section-icon">📍</span>
                    Location & Status
                  </h4>
                  
                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Address</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="City, State, Country"
                      className="form-input-enhanced"
                    />
                    <div className="form-help-text">
                      Business or residential address
                    </div>
                  </div>

                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Owner Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="form-input-enhanced"
                    >
                      <option value="active">✅ Active - Can own buses</option>
                      <option value="inactive">⏸️ Inactive - Cannot own buses</option>
                    </select>
                    <div className="form-help-text">
                      Set the owner's operational status
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
                  <span>{editingOwner ? '💾' : '➕'}</span>
                  {editingOwner ? 'Update Owner' : 'Add Owner'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Owners Grid */}
      <div className="owner-grid-container">
        {filteredOwners.length === 0 ? (
          <div className="owner-empty-state">
            <div className="owner-empty-icon">👤</div>
            <h3 className="owner-empty-title">No Owners Found</h3>
            <p className="owner-empty-message">
              {searchTerm || filterStatus !== 'all' 
                ? 'No owners match your current filters. Try adjusting your search criteria.'
                : 'No bus owners registered yet. Add your first owner to get started with ownership management.'
              }
            </p>
            {(!searchTerm && filterStatus === 'all') && (
              <button className="owner-empty-action" onClick={() => { setShowForm(true); setEditingOwner(null); setFormData({ name: '', email: '', phone: '', address: '', status: 'active' }); }}>
                <span>➕</span>
                Add First Owner
              </button>
            )}
          </div>
        ) : (
          <div className="owners-grid">
            {filteredOwners.map(owner => (
              <div 
                key={owner.id} 
                className={`owner-card ${selectedOwner?.id === owner.id ? 'selected' : ''} ${owner.status}`} 
                onClick={() => setSelectedOwner(owner)}
              >
                <div className="owner-card-header">
                  <div className="owner-avatar" style={{ background: getOwnerAvatarColor(owner.name) }}>
                    <span className="avatar-initials">{getOwnerInitials(owner.name)}</span>
                  </div>
                  <div className="owner-info">
                    <h3 className="owner-name">{owner.name}</h3>
                    {getStatusBadge(owner.status)}
                  </div>
                  <div className="owner-actions">
                    <button className="owner-action-btn" onClick={(e) => { e.stopPropagation(); handleEdit(owner); }} title="Edit owner">
                      <span>✏️</span>
                    </button>
                    <button className="owner-action-btn danger" onClick={(e) => { e.stopPropagation(); handleDelete(owner.id); }} title="Delete owner">
                      <span>🗑️</span>
                    </button>
                  </div>
                </div>
                
                <div className="owner-card-body">
                  <div className="owner-detail">
                    <span className="detail-icon">📧</span>
                    <span className="detail-text">{owner.email}</span>
                  </div>
                  <div className="owner-detail">
                    <span className="detail-icon">📱</span>
                    <span className="detail-text">{owner.phone}</span>
                  </div>
                  <div className="owner-detail">
                    <span className="detail-icon">📍</span>
                    <span className="detail-text">{owner.address || 'No address provided'}</span>
                  </div>
                </div>
                
                <div className="owner-card-footer">
                  <div className="bus-count-display">
                    <span className="bus-count-value">{getOwnerBuses(owner.id).length}</span>
                    <span className="bus-count-label">Buses Owned</span>
                  </div>
                  <button 
                    className="manage-buses-btn" 
                    onClick={(e) => { e.stopPropagation(); setSelectedOwner(owner); setShowAssignModal(true); }}
                  >
                    <span>🚌</span>
                    Manage Buses
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Assign Buses Modal */}
      {showAssignModal && selectedOwner && (
        <div className="modal-overlay-enhanced">
          <div className="modal-enhanced bus-assign-modal">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <span className="modal-icon">🚌</span>
                <div>
                  <h3 className="modal-title-enhanced">
                    Bus Assignment - {selectedOwner.name}
                  </h3>
                  <p className="modal-subtitle">
                    Manage bus ownership and assignments for this owner
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAssignModal(false)}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-enhanced">
              <div className="bus-assignment-layout">
                <div className="assignment-section">
                  <div className="section-header">
                    <h4 className="section-title">
                      <span className="section-icon">🚌</span>
                      Owned Buses ({getOwnerBuses(selectedOwner.id).length})
                    </h4>
                  </div>
                  <div className="bus-assignment-list">
                    {getOwnerBuses(selectedOwner.id).length === 0 ? (
                      <div className="assignment-empty-state">
                        <div className="empty-icon">🚌</div>
                        <p>No buses assigned to this owner</p>
                      </div>
                    ) : (
                      getOwnerBuses(selectedOwner.id).map(bus => (
                        <div key={bus.id} className="bus-assignment-item owned">
                          <div className="bus-assignment-info">
                            <span className="bus-number">{bus.number}</span>
                            <span className="bus-type">{bus.type}</span>
                            <span className="bus-capacity">{bus.capacity} seats</span>
                            {getStatusBadge(bus.status)}
                          </div>
                          <button 
                            className="assignment-action-btn remove" 
                            onClick={() => handleAssignBus(bus.id, null)} 
                            title="Remove from owner"
                          >
                            <span>✕</span>
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div className="assignment-section">
                  <div className="section-header">
                    <h4 className="section-title">
                      <span className="section-icon">📋</span>
                      Available Buses ({getUnassignedBuses().length})
                    </h4>
                  </div>
                  <div className="bus-assignment-list">
                    {getUnassignedBuses().length === 0 ? (
                      <div className="assignment-empty-state">
                        <div className="empty-icon">📋</div>
                        <p>All buses are currently assigned</p>
                      </div>
                    ) : (
                      getUnassignedBuses().map(bus => (
                        <div key={bus.id} className="bus-assignment-item available">
                          <div className="bus-assignment-info">
                            <span className="bus-number">{bus.number}</span>
                            <span className="bus-type">{bus.type}</span>
                            <span className="bus-capacity">{bus.capacity} seats</span>
                            {getStatusBadge(bus.status)}
                          </div>
                          <button 
                            className="assignment-action-btn assign" 
                            onClick={() => handleAssignBus(bus.id, selectedOwner.id)} 
                            title="Assign to owner"
                          >
                            <span>➕</span>
                            Assign
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OwnerManagement;
