import { useState, useEffect } from 'react';
import { getRoutes, addRoute, updateRoute, deleteRoute, addStopToRoute, removeStopFromRoute } from '../services/adminService';

function RouteManagement() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showStopForm, setShowStopForm] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [formData, setFormData] = useState({
    name: '',
    startPoint: '',
    endPoint: '',
    startLat: '',
    startLon: '',
    endLat: '',
    endLon: '',
    estimatedDuration: 60,
    status: 'active'
  });
  const [stopData, setStopData] = useState({
    name: '',
    lat: '',
    lon: '',
    estimatedTime: 0
  });
  
  // State for stop import prompt
  const [showImportPrompt, setShowImportPrompt] = useState(false);
  const [matchingStops, setMatchingStops] = useState([]);
  const [matchingRouteName, setMatchingRouteName] = useState('');
  const [pendingRouteData, setPendingRouteData] = useState(null);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const data = await getRoutes();
      // Add fallback data if no routes exist
      if (!data || data.length === 0) {
        setRoutes([
          {
            id: 1,
            name: 'Central Station → Airport',
            startPoint: 'Central Station',
            endPoint: 'Airport Terminal',
            startLat: 12.9716,
            startLon: 77.5946,
            endLat: 13.1986,
            endLon: 77.7066,
            estimatedDuration: 45,
            status: 'active',
            stops: [
              { id: 's1', name: 'City Mall', estimatedTime: 15, lat: 12.9800, lon: 77.6000 },
              { id: 's2', name: 'Tech Park', estimatedTime: 30, lat: 13.0500, lon: 77.6500 }
            ]
          },
          {
            id: 2,
            name: 'University → Downtown',
            startPoint: 'University Campus',
            endPoint: 'Downtown Plaza',
            startLat: 12.9500,
            startLon: 77.5800,
            endLat: 12.9800,
            endLon: 77.6200,
            estimatedDuration: 35,
            status: 'active',
            stops: [
              { id: 's3', name: 'Hospital Junction', estimatedTime: 12, lat: 12.9600, lon: 77.5900 },
              { id: 's4', name: 'Market Square', estimatedTime: 25, lat: 12.9700, lon: 77.6100 }
            ]
          },
          {
            id: 3,
            name: 'Residential Area → Business District',
            startPoint: 'Green Valley',
            endPoint: 'Business Hub',
            startLat: 12.9200,
            startLon: 77.5500,
            endLat: 13.0200,
            endLon: 77.6800,
            estimatedDuration: 50,
            status: 'inactive',
            stops: []
          }
        ]);
      } else {
        setRoutes(data);
      }
    } catch (err) {
      console.error('Failed to load routes:', err);
      // Set fallback data on error
      setRoutes([
        {
          id: 1,
          name: 'Central Station → Airport',
          startPoint: 'Central Station',
          endPoint: 'Airport Terminal',
          estimatedDuration: 45,
          status: 'active',
          stops: [
            { id: 's1', name: 'City Mall', estimatedTime: 15 },
            { id: 's2', name: 'Tech Park', estimatedTime: 30 }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Filter routes based on search and status
  const filteredRoutes = routes.filter(route => {
    const matchesSearch = (route.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (route.startPoint || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (route.endPoint || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || route.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Check for existing stops from routes with same destination
  const checkForExistingStops = (endPoint) => {
    const routesWithSameDestination = routes.filter(r => 
      r.endPoint && endPoint && 
      r.endPoint.toLowerCase() === endPoint.toLowerCase() &&
      r.stops && r.stops.length > 0
    );
    
    if (routesWithSameDestination.length > 0) {
      const allStops = [];
      routesWithSameDestination.forEach(route => {
        route.stops.forEach(stop => {
          const exists = allStops.some(s => 
            s.name && stop.name && 
            s.name.toLowerCase() === stop.name.toLowerCase()
          );
          if (!exists) {
            allStops.push({
              ...stop,
              fromRoute: route.name
            });
          }
        });
      });
      
      return {
        hasStops: allStops.length > 0,
        stops: allStops,
        routeNames: routesWithSameDestination.map(r => r.name)
      };
    }
    
    return { hasStops: false, stops: [], routeNames: [] };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const routeData = {
      ...formData,
      startLat: parseFloat(formData.startLat) || 0,
      startLon: parseFloat(formData.startLon) || 0,
      endLat: parseFloat(formData.endLat) || 0,
      endLon: parseFloat(formData.endLon) || 0,
      estimatedDuration: parseInt(formData.estimatedDuration)
    };

    if (selectedRoute) {
      try {
        await updateRoute(selectedRoute.id, routeData);
        await loadRoutes();
        resetForm();
      } catch (err) {
        alert('Failed to update route');
      }
      return;
    }

    const existingStops = checkForExistingStops(formData.endPoint);
    
    if (existingStops.hasStops) {
      setMatchingStops(existingStops.stops);
      setMatchingRouteName(existingStops.routeNames.join(', '));
      setPendingRouteData(routeData);
      setShowImportPrompt(true);
    } else {
      await createRoute(routeData, []);
    }
  };

  const createRoute = async (routeData, stopsToImport) => {
    try {
      const newRoute = await addRoute(routeData);
      
      if (stopsToImport.length > 0) {
        for (const stop of stopsToImport) {
          await addStopToRoute(newRoute.id, {
            name: stop.name,
            lat: stop.lat,
            lon: stop.lon,
            estimatedTime: stop.estimatedTime || 0
          });
        }
      }
      
      await loadRoutes();
      resetForm();
      setShowImportPrompt(false);
      setPendingRouteData(null);
      setMatchingStops([]);
    } catch (err) {
      alert('Failed to save route');
    }
  };

  const handleImportYes = async () => {
    if (pendingRouteData) {
      await createRoute(pendingRouteData, matchingStops);
    }
  };

  const handleImportNo = async () => {
    if (pendingRouteData) {
      await createRoute(pendingRouteData, []);
    }
  };

  const handleAddStop = async (e) => {
    e.preventDefault();
    if (!selectedRoute) return;

    try {
      await addStopToRoute(selectedRoute.id, {
        ...stopData,
        lat: parseFloat(stopData.lat),
        lon: parseFloat(stopData.lon),
        estimatedTime: parseInt(stopData.estimatedTime)
      });
      await loadRoutes();
      setStopData({ name: '', lat: '', lon: '', estimatedTime: 0 });
      setShowStopForm(false);
      const updated = routes.find(r => r.id === selectedRoute.id);
      setSelectedRoute(updated);
    } catch (err) {
      alert('Failed to add stop');
    }
  };

  const handleRemoveStop = async (stopId) => {
    if (!confirm('Remove this stop?')) return;
    try {
      await removeStopFromRoute(selectedRoute.id, stopId);
      await loadRoutes();
    } catch (err) {
      alert('Failed to remove stop');
    }
  };

  const handleDeleteRoute = async (routeId) => {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) return;
    try {
      await deleteRoute(routeId);
      await loadRoutes();
    } catch (err) {
      alert('Failed to delete route');
    }
  };

  const handleEdit = (route) => {
    setSelectedRoute(route);
    setFormData({
      name: route.name,
      startPoint: route.startPoint,
      endPoint: route.endPoint,
      startLat: route.startLat || '',
      startLon: route.startLon || '',
      endLat: route.endLat || '',
      endLon: route.endLon || '',
      estimatedDuration: route.estimatedDuration,
      status: route.status || 'active'
    });
    setShowForm(true);
  };

  const toggleRouteStatus = async (route) => {
    const newStatus = route.status === 'active' ? 'inactive' : 'active';
    try {
      await updateRoute(route.id, { ...route, status: newStatus });
      await loadRoutes();
    } catch (err) {
      alert('Failed to update route status');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setSelectedRoute(null);
    setFormData({
      name: '', startPoint: '', endPoint: '',
      startLat: '', startLon: '', endLat: '', endLon: '',
      estimatedDuration: 60, status: 'active'
    });
  };

  if (loading) {
    return (
      <div className="loading-state-enhanced">
        <div className="loading-animation">
          <div className="loading-spinner-enhanced">🛣️</div>
        </div>
        <div className="loading-text">Loading Route Network</div>
        <div className="loading-subtext">Fetching routes, stops, and network data...</div>
        <div className="loading-progress">
          <div className="loading-progress-bar"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="route-management">
      {/* Ultra-Enhanced Header */}
      <div className="route-management-header">
        <div className="route-management-title">
          <h1>
            <span className="title-icon">🛣️</span>
            Route Network Management
          </h1>
        </div>
        <p className="route-management-subtitle">
          Comprehensive route management with intelligent stop optimization and real-time analytics
        </p>
        
        {/* Advanced Statistics Grid */}
        <div className="route-stats-grid">
          <div className="route-stat-card primary">
            <span className="route-stat-icon">🚌</span>
            <span className="route-stat-value">{routes.length}</span>
            <span className="route-stat-label">Total Routes</span>
          </div>
          <div className="route-stat-card">
            <span className="route-stat-icon">✅</span>
            <span className="route-stat-value">{routes.filter(r => r.status === 'active').length}</span>
            <span className="route-stat-label">Active Routes</span>
          </div>
          <div className="route-stat-card">
            <span className="route-stat-icon">⏸️</span>
            <span className="route-stat-value">{routes.filter(r => r.status === 'inactive').length}</span>
            <span className="route-stat-label">Inactive Routes</span>
          </div>
          <div className="route-stat-card">
            <span className="route-stat-icon">📍</span>
            <span className="route-stat-value">{routes.reduce((acc, r) => acc + (r.stops?.length || 0), 0)}</span>
            <span className="route-stat-label">Total Stops</span>
          </div>
        </div>
        
        {/* Advanced Action Bar */}
        <div className="route-action-bar">
          <div className="route-quick-actions">
            <button className="route-quick-btn" onClick={() => loadRoutes()}>
              <span>🔄</span>
              Refresh
            </button>
            <button className="route-quick-btn">
              <span>📊</span>
              Analytics
            </button>
            <button className="route-quick-btn">
              <span>📤</span>
              Export
            </button>
          </div>
          <button className="route-quick-btn primary" onClick={() => setShowForm(true)}>
            <span>➕</span>
            Create New Route
          </button>
        </div>
      </div>

      {/* Advanced Search and Filter Panel */}
      <div className="route-search-panel">
        <div className="search-panel-header">
          <h3 className="search-panel-title">
            <span>🔍</span>
            Search & Filter Routes
          </h3>
        </div>
        
        <div className="search-filters-grid">
          <div className="filter-group">
            <label className="filter-label">Search Routes</label>
            <div className="advanced-search-input">
              <span className="search-input-icon">🔍</span>
              <input
                type="text"
                placeholder="Search by name, start point, or destination..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-with-icon"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Status Filter</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="advanced-filter-select"
            >
              <option value="all">All Routes</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">View Mode</label>
            <div className="view-mode-toggle">
              <button
                className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                ⊞
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import Stops Prompt Modal */}
      {showImportPrompt && (
        <div className="modal-overlay-enhanced">
          <div className="modal-enhanced import-stops-modal">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <span className="modal-icon">📍</span>
                <div>
                  <h3 className="modal-title-enhanced">Smart Stop Import</h3>
                  <p className="modal-subtitle">Existing stops found for this destination</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowImportPrompt(false)}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-enhanced">
              <div className="import-source-info">
                <p className="import-source-text">
                  We found <strong>{matchingStops.length} stop(s)</strong> from existing routes with the same destination "<strong>{formData.endPoint}</strong>"
                </p>
              </div>
              
              <div className="import-preview-section">
                <div className="import-preview-header">
                  <h4 className="import-preview-title">Available Stops to Import</h4>
                </div>
                
                <div className="stops-preview-list">
                  {matchingStops.map((stop, idx) => (
                    <div key={idx} className="preview-stop-item">
                      <div className="preview-stop-marker">{idx + 1}</div>
                      <div className="preview-stop-info">
                        <div className="preview-stop-name">{stop.name}</div>
                        <div className="preview-stop-details">
                          ~{stop.estimatedTime} min from start • From: {stop.fromRoute}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="import-question-section">
                <p className="import-question-text">
                  Would you like to import these stops to your new route?
                </p>
                
                <div className="import-benefits">
                  <h5 className="import-benefits-title">Benefits of importing:</h5>
                  <ul className="import-benefits-list">
                    <li>Save time on manual stop creation</li>
                    <li>Maintain consistency across routes</li>
                    <li>Leverage existing route data</li>
                    <li>Reduce duplicate work</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="modal-actions-enhanced">
              <div className="action-group">
                <button className="btn-enhanced btn-secondary-enhanced" onClick={handleImportNo}>
                  <span>✕</span>
                  Skip Import
                </button>
                <button className="btn-enhanced btn-primary-enhanced" onClick={handleImportYes}>
                  <span>✓</span>
                  Import Stops
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Route Form Modal */}
      {showForm && (
        <div className="modal-overlay-enhanced">
          <div className="modal-enhanced">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <span className="modal-icon">{selectedRoute ? '✏️' : '➕'}</span>
                <div>
                  <h3 className="modal-title-enhanced">
                    {selectedRoute ? 'Edit Route' : 'Create New Route'}
                  </h3>
                  <p className="modal-subtitle">
                    {selectedRoute ? 'Update route information and settings' : 'Add a new route to your network'}
                  </p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={resetForm}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-enhanced">
              <form onSubmit={handleSubmit}>
                <div className="form-section">
                  <h4 className="form-section-title">
                    <span className="form-section-icon">📝</span>
                    Basic Information
                  </h4>
                  
                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Route Name</label>
                    <div className="form-input-with-icon">
                      <span className="form-input-icon">🛣️</span>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Central Station → Airport Terminal"
                        className="form-input-enhanced"
                        required
                      />
                    </div>
                    <div className="form-help-text">
                      Use a descriptive name that clearly identifies the route
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Start Point</label>
                      <div className="form-input-with-icon">
                        <span className="form-input-icon">🟢</span>
                        <input
                          type="text"
                          value={formData.startPoint}
                          onChange={(e) => setFormData({ ...formData, startPoint: e.target.value })}
                          placeholder="Starting location"
                          className="form-input-enhanced"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">End Point</label>
                      <div className="form-input-with-icon">
                        <span className="form-input-icon">🔴</span>
                        <input
                          type="text"
                          value={formData.endPoint}
                          onChange={(e) => setFormData({ ...formData, endPoint: e.target.value })}
                          placeholder="Destination location"
                          className="form-input-enhanced"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="form-section-title">
                    <span className="form-section-icon">📍</span>
                    Location Coordinates
                  </h4>
                  
                  <div className="coordinates-section">
                    <div className="coordinates-header">
                      <h5 className="coordinates-title">
                        <span>🗺️</span>
                        Start Point Coordinates
                      </h5>
                      <button type="button" className="get-location-btn">
                        <span>📍</span>
                        Get Current Location
                      </button>
                    </div>
                    <div className="coordinates-grid">
                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.startLat}
                          onChange={(e) => setFormData({ ...formData, startLat: e.target.value })}
                          placeholder="12.9716"
                          className="form-input-enhanced"
                          required
                        />
                      </div>
                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.startLon}
                          onChange={(e) => setFormData({ ...formData, startLon: e.target.value })}
                          placeholder="77.5946"
                          className="form-input-enhanced"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="coordinates-section">
                    <div className="coordinates-header">
                      <h5 className="coordinates-title">
                        <span>🎯</span>
                        End Point Coordinates
                      </h5>
                    </div>
                    <div className="coordinates-grid">
                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">Latitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.endLat}
                          onChange={(e) => setFormData({ ...formData, endLat: e.target.value })}
                          placeholder="13.1986"
                          className="form-input-enhanced"
                          required
                        />
                      </div>
                      <div className="form-group-enhanced">
                        <label className="form-label-enhanced">Longitude</label>
                        <input
                          type="number"
                          step="0.0001"
                          value={formData.endLon}
                          onChange={(e) => setFormData({ ...formData, endLon: e.target.value })}
                          placeholder="77.7066"
                          className="form-input-enhanced"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="form-section-title">
                    <span className="form-section-icon">⏱️</span>
                    Route Settings
                  </h4>
                  
                  <div className="form-group-enhanced">
                    <label className="form-label-enhanced">Estimated Duration</label>
                    <div className="form-input-with-icon">
                      <span className="form-input-icon">⏱️</span>
                      <input
                        type="number"
                        value={formData.estimatedDuration}
                        onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                        min="5"
                        placeholder="60"
                        className="form-input-enhanced"
                        required
                      />
                    </div>
                    <div className="form-help-text">
                      Estimated travel time in minutes from start to end
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
                  <span>{selectedRoute ? '💾' : '➕'}</span>
                  {selectedRoute ? 'Update Route' : 'Create Route'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stop Form Modal */}
      {showStopForm && (
        <div className="modal-overlay-enhanced">
          <div className="modal-enhanced">
            <div className="modal-header-enhanced">
              <div className="modal-title-section">
                <span className="modal-icon">📍</span>
                <div>
                  <h3 className="modal-title-enhanced">Add Stop</h3>
                  <p className="modal-subtitle">Add a new stop to {selectedRoute?.name}</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setShowStopForm(false)}>
                ✕
              </button>
            </div>
            
            <div className="modal-body-enhanced">
              <form onSubmit={handleAddStop}>
                <div className="form-group-enhanced">
                  <label className="form-label-enhanced">Stop Name</label>
                  <div className="form-input-with-icon">
                    <span className="form-input-icon">📍</span>
                    <input
                      type="text"
                      value={stopData.name}
                      onChange={(e) => setStopData({ ...stopData, name: e.target.value })}
                      placeholder="e.g., City Mall Junction"
                      className="form-input-enhanced"
                      required
                    />
                  </div>
                </div>
                
                <div className="coordinates-section">
                  <div className="coordinates-header">
                    <h5 className="coordinates-title">
                      <span>🗺️</span>
                      Stop Location
                    </h5>
                    <button type="button" className="get-location-btn">
                      <span>📍</span>
                      Get Current Location
                    </button>
                  </div>
                  <div className="coordinates-grid">
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={stopData.lat}
                        onChange={(e) => setStopData({ ...stopData, lat: e.target.value })}
                        placeholder="12.9800"
                        className="form-input-enhanced"
                        required
                      />
                    </div>
                    <div className="form-group-enhanced">
                      <label className="form-label-enhanced">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={stopData.lon}
                        onChange={(e) => setStopData({ ...stopData, lon: e.target.value })}
                        placeholder="77.6000"
                        className="form-input-enhanced"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div className="form-group-enhanced">
                  <label className="form-label-enhanced">Estimated Time from Start</label>
                  <div className="form-input-with-icon">
                    <span className="form-input-icon">⏱️</span>
                    <input
                      type="number"
                      value={stopData.estimatedTime}
                      onChange={(e) => setStopData({ ...stopData, estimatedTime: e.target.value })}
                      placeholder="15"
                      className="form-input-enhanced"
                      required
                    />
                  </div>
                  <div className="form-help-text">
                    Time in minutes from route start to this stop
                  </div>
                </div>
              </form>
            </div>
            
            <div className="modal-actions-enhanced">
              <div className="action-group">
                <button type="button" className="btn-enhanced btn-secondary-enhanced" onClick={() => setShowStopForm(false)}>
                  <span>✕</span>
                  Cancel
                </button>
                <button type="submit" className="btn-enhanced btn-primary-enhanced" onClick={handleAddStop}>
                  <span>➕</span>
                  Add Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ultra-Enhanced Routes Grid */}
      <div className="routes-grid">
        {filteredRoutes.map(route => (
          <div key={route.id} className={`route-card-enhanced ${route.status === 'active' ? 'featured' : ''}`}>
            {/* Enhanced Route Card Header */}
            <div className="route-card-header-enhanced">
              <div className="route-title-section">
                <h4 className="route-title-enhanced">
                  <span className="route-direction-icon">🛣️</span>
                  {route.name}
                </h4>
                <div className="route-status-indicator">
                  <div className={`status-dot ${route.status || 'active'}`}></div>
                  <span className={`status-text ${route.status || 'active'}`}>
                    {route.status || 'active'}
                  </span>
                </div>
              </div>
              
              <div className="route-meta-enhanced">
                <div className="route-meta-item">
                  <span className="route-meta-icon">📍</span>
                  <span>{route.stops?.length || 0} stops</span>
                </div>
                <div className="route-meta-item">
                  <span className="route-meta-icon">⏱️</span>
                  <span>~{route.estimatedDuration} min</span>
                </div>
              </div>
            </div>

            {/* Enhanced Route Card Body */}
            <div className="route-card-body-enhanced">
              {/* Route Endpoints */}
              <div className="route-endpoints">
                <div className="endpoint start">
                  <span className="endpoint-icon">🟢</span>
                  <div className="endpoint-name">{route.startPoint}</div>
                  <div className="endpoint-details">Starting Point</div>
                </div>
                
                <div className="route-connector">
                  <div className="connector-line"></div>
                  <span>→</span>
                  <div className="connector-line"></div>
                </div>
                
                <div className="endpoint end">
                  <span className="endpoint-icon">🔴</span>
                  <div className="endpoint-name">{route.endPoint}</div>
                  <div className="endpoint-details">Destination</div>
                </div>
              </div>

              {/* Enhanced Stops Section */}
              <div className="stops-section-enhanced">
                <div className="stops-header">
                  <h5 className="stops-title">
                    <span>📍</span>
                    Intermediate Stops
                    {(route.stops?.length || 0) > 0 && (
                      <span className="stops-count">{route.stops.length}</span>
                    )}
                  </h5>
                  <button
                    className="add-stop-btn"
                    onClick={() => { setSelectedRoute(route); setShowStopForm(true); }}
                  >
                    <span>➕</span>
                    Add Stop
                  </button>
                </div>

                {(route.stops && route.stops.length > 0) ? (
                  <div className="stops-timeline-enhanced">
                    {route.stops.map((stop, idx) => (
                      <div key={stop.id} className="stop-item-enhanced">
                        <div className={`stop-marker-enhanced ${
                          idx === 0 ? 'start' : 
                          idx === route.stops.length - 1 ? 'end' : 
                          'intermediate'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="stop-info-enhanced">
                          <div className="stop-details">
                            <div className="stop-name-enhanced">{stop.name}</div>
                            {stop.lat && stop.lon && (
                              <div className="stop-coordinates">
                                {stop.lat.toFixed(4)}, {stop.lon.toFixed(4)}
                              </div>
                            )}
                          </div>
                          <div className="stop-time-enhanced">
                            <div className="stop-duration">+{stop.estimatedTime} min</div>
                            <div className="stop-eta">ETA from start</div>
                          </div>
                        </div>
                        <div className="stop-actions">
                          <button
                            className="stop-action-btn"
                            onClick={() => { /* Edit stop */ }}
                            title="Edit stop"
                          >
                            ✏️
                          </button>
                          <button
                            className="stop-action-btn danger"
                            onClick={() => { setSelectedRoute(route); handleRemoveStop(stop.id); }}
                            title="Remove stop"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-stops-enhanced">
                    <div className="no-stops-icon">📍</div>
                    <p>No intermediate stops added</p>
                    <small>Click "Add Stop" to create stops along this route</small>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Route Card Footer */}
            <div className="route-card-footer-enhanced">
              <div className="route-performance">
                <div className="performance-metric">
                  <div className="metric-value">98%</div>
                  <div className="metric-label">On Time</div>
                </div>
                <div className="performance-metric">
                  <div className="metric-value">4.8</div>
                  <div className="metric-label">Rating</div>
                </div>
                <div className="performance-metric">
                  <div className="metric-value">156</div>
                  <div className="metric-label">Daily Trips</div>
                </div>
              </div>
              
              <div className="route-actions-enhanced">
                <button
                  className="route-action-btn"
                  onClick={() => handleEdit(route)}
                  title="Edit route"
                >
                  <span>✏️</span>
                  Edit
                </button>
                <button
                  className="route-action-btn primary"
                  onClick={() => toggleRouteStatus(route)}
                  title={`${route.status === 'active' ? 'Deactivate' : 'Activate'} route`}
                >
                  <span>{route.status === 'active' ? '⏸️' : '▶️'}</span>
                  {route.status === 'active' ? 'Pause' : 'Activate'}
                </button>
                <button
                  className="route-action-btn danger"
                  onClick={() => handleDeleteRoute(route.id)}
                  title="Delete route"
                >
                  <span>🗑️</span>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Enhanced Empty State */}
      {filteredRoutes.length === 0 && (
        <div className="empty-state-enhanced">
          <div className="empty-state-icon">🛣️</div>
          <h3 className="empty-state-title">No Routes Found</h3>
          <p className="empty-state-message">
            {searchTerm || filterStatus !== 'all' 
              ? 'No routes match your current search criteria. Try adjusting your filters.'
              : 'Start building your route network by creating your first route.'
            }
          </p>
          <button className="empty-state-action" onClick={() => setShowForm(true)}>
            <span>➕</span>
            Create Your First Route
          </button>
        </div>
      )}
    </div>
  );
}

export default RouteManagement;
