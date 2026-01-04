import { useState, useEffect, useRef, useCallback } from 'react';
import { getAllBusesWithLocation } from '../services/ownerService';

// Cache for road routes to avoid repeated API calls
const routeCache = {};

// Fetch road route from OSRM
async function fetchRoadRoute(stops) {
  if (!stops || stops.length < 2) return null;
  
  // Create cache key from stop coordinates
  const cacheKey = stops.map(s => `${s.lat},${s.lon}`).join('|');
  if (routeCache[cacheKey]) return routeCache[cacheKey];
  
  try {
    // Build coordinates string for OSRM (lon,lat format)
    const coords = stops.map(s => `${s.lon},${s.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
      // Convert from [lon, lat] to [lat, lon] for Leaflet
      const routeCoords = data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
      routeCache[cacheKey] = routeCoords;
      return routeCoords;
    }
  } catch (err) {
    console.error('Failed to fetch road route:', err);
  }
  return null;
}

function FleetTracking() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLive, setIsLive] = useState(true);
  const [updateInterval, setUpdateInterval] = useState(3);
  const [showRoutes, setShowRoutes] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const routeLinesRef = useRef({});
  const stopMarkersRef = useRef({});
  const trailLinesRef = useRef({});
  const intervalRef = useRef(null);

  const loadBuses = useCallback(async () => {
    try {
      const data = await getAllBusesWithLocation();
      setBuses(prevBuses => {
        return data.map(newBus => {
          const oldBus = prevBuses.find(b => b.busId === newBus.busId);
          return { ...newBus, prevLat: oldBus?.currentLat, prevLon: oldBus?.currentLon };
        });
      });
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to load buses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuses();
    if (isLive) {
      intervalRef.current = setInterval(loadBuses, updateInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [loadBuses, isLive, updateInterval]);

  useEffect(() => {
    if (!loading && !mapInstanceRef.current && mapRef.current) initMap();
  }, [loading]);

  useEffect(() => {
    if (mapInstanceRef.current && buses.length > 0) updateMapElements();
  }, [buses, showRoutes, filterStatus]);

  useEffect(() => {
    if (selectedBus) {
      const updated = buses.find(b => b.busId === selectedBus.busId);
      if (updated) setSelectedBus(updated);
    }
  }, [buses]);

  // Filter buses based on status
  const getFilteredBuses = () => {
    if (filterStatus === 'active') return buses.filter(b => b.tripStatus === 'active');
    if (filterStatus === 'inactive') return buses.filter(b => b.tripStatus === 'inactive');
    return buses;
  };

  const filteredBuses = getFilteredBuses();
  const activeBuses = buses.filter(b => b.tripStatus === 'active');
  const inactiveBuses = buses.filter(b => b.tripStatus === 'inactive');

  const initMap = () => {
    try {
      if (!window.L) { setMapError(true); return; }
      const defaultCenter = [12.9716, 77.5946];
      mapInstanceRef.current = window.L.map(mapRef.current).setView(defaultCenter, 12);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapInstanceRef.current);
    } catch (err) {
      console.error('Map init error:', err);
      setMapError(true);
    }
  };


  const updateMapElements = async () => {
    if (!mapInstanceRef.current || !window.L) return;
    const map = mapInstanceRef.current;
    const L = window.L;

    // Clear old route lines and stop markers
    Object.values(routeLinesRef.current).forEach(line => map.removeLayer(line));
    Object.values(stopMarkersRef.current).forEach(markers => markers.forEach(m => map.removeLayer(m)));
    Object.values(trailLinesRef.current).forEach(line => map.removeLayer(line));
    routeLinesRef.current = {};
    stopMarkersRef.current = {};
    trailLinesRef.current = {};

    // Remove markers for buses that no longer exist
    const currentBusIds = filteredBuses.map(b => b.busId);
    Object.keys(markersRef.current).forEach(busId => {
      if (!currentBusIds.includes(busId)) {
        map.removeLayer(markersRef.current[busId]);
        delete markersRef.current[busId];
      }
    });

    // Track positions to offset overlapping buses
    const positionCounts = {};
    const routeColors = ['#1a73e8', '#e94560', '#4caf50', '#ff9800', '#9c27b0'];

    for (let index = 0; index < filteredBuses.length; index++) {
      const bus = filteredBuses[index];
      const { busId, currentLat, currentLon, busNumber, speed, route, prevLat, prevLon, tripStatus } = bus;
      if (!currentLat || !currentLon) continue;

      // Calculate offset for overlapping buses
      const posKey = `${currentLat.toFixed(4)},${currentLon.toFixed(4)}`;
      positionCounts[posKey] = (positionCounts[posKey] || 0);
      const offset = positionCounts[posKey] * 0.0003;
      positionCounts[posKey]++;
      
      const displayLat = currentLat + offset;
      const displayLon = currentLon + offset;
      
      // Use different colors for active vs inactive buses
      const isActive = tripStatus === 'active';
      const routeColor = isActive ? routeColors[index % routeColors.length] : '#9e9e9e';

      // Draw route line and stops if showRoutes is enabled and bus is active
      if (showRoutes && isActive && route?.stops?.length > 1) {
        const validStops = route.stops.filter(s => s.lat && s.lon);
        
        if (validStops.length > 1) {
          let routeCoords = await fetchRoadRoute(validStops);
          
          if (!routeCoords) {
            routeCoords = validStops.map(s => [s.lat, s.lon]);
          }
          
          const routeLine = L.polyline(routeCoords, {
            color: routeColor, 
            weight: 5, 
            opacity: 0.85,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);
          routeLinesRef.current[busId] = routeLine;

          const stopMarkers = validStops.map((stop) => {
            const isStart = stop.isStart || stop.id === 'START';
            const isEnd = stop.isEnd || stop.id === 'END';
            const size = isStart || isEnd ? 18 : 14;
            const color = isStart ? '#4caf50' : isEnd ? '#f44336' : routeColor;
            const icon = L.divIcon({
              className: 'stop-marker-icon',
              html: `<div style="width:${size}px;height:${size}px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`,
              iconSize: [size, size], iconAnchor: [size/2, size/2]
            });
            const popupContent = isStart 
              ? `<b>🟢 Start: ${stop.name}</b><br/><small>Bus: ${busNumber}</small>` 
              : isEnd 
                ? `<b>🔴 End: ${stop.name}</b><br/><small>Bus: ${busNumber}</small>` 
                : `<b>🔵 ${stop.name}</b><br/>Stop ${stop.order}<br/><small>Bus: ${busNumber}</small>`;
            return L.marker([stop.lat, stop.lon], { icon })
              .bindPopup(popupContent)
              .addTo(map);
          });
          stopMarkersRef.current[busId] = stopMarkers;
        }
      }

      // Draw trail line from previous position (only for active buses)
      if (isActive && prevLat && prevLon && (prevLat !== currentLat || prevLon !== currentLon)) {
        const trailLine = L.polyline([[prevLat, prevLon], [currentLat, currentLon]], {
          color: '#ff9800', weight: 3, opacity: 0.6
        }).addTo(map);
        trailLinesRef.current[busId] = trailLine;
      }

      // Update or create bus marker
      const isOverspeed = speed > 60;
      let busColor = routeColor;
      if (isOverspeed) busColor = '#f44336';
      if (!isActive) busColor = '#9e9e9e';
      
      const statusIcon = isActive ? '🚌' : '🅿️';
      const busIcon = L.divIcon({
        className: 'bus-marker-icon',
        html: `<div style="background:${busColor};color:white;padding:6px 10px;border-radius:20px;font-weight:bold;font-size:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;z-index:${1000 + index};${!isActive ? 'opacity:0.8;' : ''}">${statusIcon} ${busNumber}</div>`,
        iconSize: [80, 30], iconAnchor: [40, 15]
      });

      const popupContent = isActive 
        ? `<b>🚌 ${busNumber}</b><br/>Speed: ${speed} km/h<br/>Route: ${bus.routeName}<br/>Driver: ${bus.driverName}<br/><span style="color:#4caf50">● Active Trip</span>`
        : `<b>🅿️ ${busNumber}</b><br/>Status: Parked/Inactive<br/>Last Route: ${bus.routeName || 'N/A'}<br/><span style="color:#9e9e9e">● Last Known Location</span>`;

      if (markersRef.current[busId]) {
        markersRef.current[busId].setLatLng([displayLat, displayLon]);
        markersRef.current[busId].setIcon(busIcon);
        markersRef.current[busId].setPopupContent(popupContent);
      } else {
        const marker = L.marker([displayLat, displayLon], { icon: busIcon, zIndexOffset: isActive ? 1000 + index : index })
          .bindPopup(popupContent)
          .addTo(map);
        markersRef.current[busId] = marker;
      }
    }

    // Fit bounds to show all buses and routes
    const validBuses = filteredBuses.filter(b => b.currentLat && b.currentLon);
    if (validBuses.length > 0) {
      const bounds = L.latLngBounds(validBuses.map(b => [b.currentLat, b.currentLon]));
      validBuses.forEach(b => {
        if (b.route?.stops) b.route.stops.forEach(s => {
          if (s.lat && s.lon) bounds.extend([s.lat, s.lon]);
        });
      });
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  };

  const formatTime = (date) => {
    if (!date) return '--';
    return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatLastUpdate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="fleet-tracking"><div className="loading">Loading fleet data...</div></div>;
  }


  return (
    <div className="fleet-tracking ultra-modern">
      {/* Ultra-Modern Header */}
      <div className="ultra-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="ultra-title">
              <span className="title-icon">🗺️</span>
              Live Fleet Tracking
            </h2>
            <p className="ultra-subtitle">Real-time GPS monitoring and route visualization</p>
          </div>
          <div className="header-stats">
            <div className="stat-pill active">
              <span className="stat-value">{activeBuses.length}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-pill parked">
              <span className="stat-value">{inactiveBuses.length}</span>
              <span className="stat-label">Parked</span>
            </div>
            <div className="stat-pill overspeed">
              <span className="stat-value">{activeBuses.filter(b => b.speed > 60).length}</span>
              <span className="stat-label">Overspeed</span>
            </div>
          </div>
        </div>
        <div className="live-indicator">
          <div className="live-dot"></div>
          <span>Live Updates</span>
          <small>• {formatTime(lastUpdate)}</small>
        </div>
      </div>

      {/* Advanced Control Panel */}
      <div className="ultra-control-panel">
        <div className="control-section">
          <div className="control-group">
            <label className="ultra-toggle">
              <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Show Routes</span>
            </label>
            <label className="ultra-toggle">
              <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Live Updates</span>
            </label>
          </div>
          {isLive && (
            <div className="update-interval-control">
              <label>Update Interval:</label>
              <select 
                value={updateInterval} 
                onChange={(e) => setUpdateInterval(Number(e.target.value))}
                className="ultra-select"
              >
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </div>
          )}
        </div>
        <div className="filter-section">
          <div className="filter-pills">
            <button
              className={`filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
            >
              All Buses ({buses.length})
            </button>
            <button
              className={`filter-pill ${filterStatus === 'active' ? 'active' : ''}`}
              onClick={() => setFilterStatus('active')}
            >
              🟢 Active ({activeBuses.length})
            </button>
            <button
              className={`filter-pill ${filterStatus === 'inactive' ? 'active' : ''}`}
              onClick={() => setFilterStatus('inactive')}
            >
              🅿️ Parked ({inactiveBuses.length})
            </button>
          </div>
        </div>
      </div>

      <div className="ultra-tracking-layout">
        <div className="ultra-map-section">
          {mapError ? (
            <div className="ultra-map-fallback">
              <div className="fallback-icon">🗺️</div>
              <h3>Map Service Unavailable</h3>
              <p>Real-time map visualization requires Leaflet library</p>
              <small>Add Leaflet CSS and JS to enable interactive maps</small>
            </div>
          ) : (
            <div className="map-container">
              <div ref={mapRef} className="ultra-tracking-map"></div>
              {showRoutes && buses.length > 0 && (
                <div className="ultra-map-legend">
                  <div className="legend-item">
                    <span className="legend-dot start"></span>
                    <span>Start Point</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot end"></span>
                    <span>End Point</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-line active"></span>
                    <span>Active Route</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot parked"></span>
                    <span>Parked Bus</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="ultra-bus-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              <span className="panel-icon">🚌</span>
              Fleet Status ({filteredBuses.length})
            </h3>
            <div className="panel-controls">
              <button className="refresh-btn" onClick={loadBuses}>
                <span>🔄</span>
              </button>
            </div>
          </div>
          <div className="ultra-bus-list">
            {filteredBuses.length === 0 ? (
              <div className="ultra-empty-state">
                <div className="empty-icon">🚌</div>
                <h4>No buses found</h4>
                <p>No buses match the current filter</p>
              </div>
            ) : (
              filteredBuses.map((bus, index) => (
                <div
                  key={bus.busId}
                  className={`ultra-bus-card ${selectedBus?.busId === bus.busId ? 'selected' : ''} ${bus.speed > 60 ? 'overspeed' : ''} ${bus.tripStatus === 'inactive' ? 'inactive' : ''}`}
                  onClick={() => setSelectedBus(bus)}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="bus-card-header">
                    <div className="bus-identity">
                      <div className="bus-number">
                        {bus.busNumber}
                      </div>
                      <div className="route-name">{bus.routeName || 'Unassigned'}</div>
                    </div>
                    <div className="bus-status-section">
                      {bus.tripStatus === 'active' ? (
                        <div className={`speed-indicator ${bus.speed > 60 ? 'danger' : bus.speed > 40 ? 'warning' : 'safe'}`}>
                          {bus.speed} km/h
                        </div>
                      ) : (
                        <div className="status-badge parked">Parked</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bus-card-body">
                    <div className="bus-info-grid">
                      <div className="bus-info-item">
                        <div className="bus-info-label">Driver</div>
                        <div className="bus-info-value">{bus.driverName || 'Unassigned'}</div>
                      </div>
                      <div className="bus-info-item">
                        <div className="bus-info-label">Speed</div>
                        <div className={`bus-info-value ${bus.speed > 60 ? 'highlight' : ''}`}>{bus.speed} km/h</div>
                      </div>
                      <div className="bus-info-item">
                        <div className="bus-info-label">Status</div>
                        <div className="bus-info-value">{bus.tripStatus}</div>
                      </div>
                    </div>

                    {bus.tripStatus === 'active' ? (
                      <div className="progress-section">
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${bus.progress}%` }}></div>
                        </div>
                        <div className="progress-text">Trip Progress: {bus.progress}%</div>
                      </div>
                    ) : (
                      <div className="bus-detail-row">
                        <span className="detail-label">Last seen:</span>
                        <span className="detail-value">{formatLastUpdate(bus.lastUpdate)}</span>
                      </div>
                    )}
                  </div>
                  
                  {bus.tripStatus === 'active' && (
                    <div className="bus-card-footer">
                      <div className="live-indicator-small">
                        <div className="live-dot-small"></div>
                        <span>Live</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {selectedBus && (
        <div className="ultra-selected-bus-panel">
          <div className="selected-panel-header">
            <div className="selected-bus-title">
              <h3>
                {selectedBus.tripStatus === 'active' ? '🚌' : '🅿️'} {selectedBus.busNumber}
              </h3>
              <span className={`bus-status-badge ${selectedBus.tripStatus}`}>
                {selectedBus.tripStatus === 'active' ? '● Live Tracking' : '● Parked'}
              </span>
            </div>
            <button className="ultra-close-btn" onClick={() => setSelectedBus(null)}>✕</button>
          </div>
          
          <div className="selected-panel-body">
            <div className="ultra-details-grid">
              <div className="detail-card primary">
                <div className="detail-icon">🚌</div>
                <div className="detail-content">
                  <span className="detail-label">Bus Status</span>
                  <span className={`detail-value ${selectedBus.tripStatus === 'active' ? 'active' : 'inactive'}`}>
                    {selectedBus.tripStatus === 'active' ? 'Active Trip' : 'Parked/Inactive'}
                  </span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">🏷️</div>
                <div className="detail-content">
                  <span className="detail-label">Bus Type</span>
                  <span className="detail-value">{selectedBus.type || 'Standard'}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">👥</div>
                <div className="detail-content">
                  <span className="detail-label">Capacity</span>
                  <span className="detail-value">{selectedBus.capacity || 'N/A'} seats</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">👤</div>
                <div className="detail-content">
                  <span className="detail-label">Driver</span>
                  <span className="detail-value">{selectedBus.driverName}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">📞</div>
                <div className="detail-content">
                  <span className="detail-label">Phone</span>
                  <span className="detail-value">{selectedBus.driverPhone || 'N/A'}</span>
                </div>
              </div>
              
              <div className="detail-card">
                <div className="detail-icon">🛣️</div>
                <div className="detail-content">
                  <span className="detail-label">Route</span>
                  <span className="detail-value">{selectedBus.routeName || 'Unassigned'}</span>
                </div>
              </div>
              
              {selectedBus.tripStatus === 'active' ? (
                <>
                  <div className={`detail-card ${selectedBus.speed > 60 ? 'danger' : ''}`}>
                    <div className="detail-icon">⚡</div>
                    <div className="detail-content">
                      <span className="detail-label">Current Speed</span>
                      <span className={`detail-value speed ${selectedBus.speed > 60 ? 'danger' : ''}`}>
                        {selectedBus.speed} km/h
                      </span>
                    </div>
                  </div>
                  
                  <div className="detail-card">
                    <div className="detail-icon">📊</div>
                    <div className="detail-content">
                      <span className="detail-label">Progress</span>
                      <span className="detail-value">{selectedBus.progress}%</span>
                    </div>
                  </div>
                  
                  <div className="detail-card wide">
                    <div className="detail-icon">📍</div>
                    <div className="detail-content">
                      <span className="detail-label">GPS Coordinates</span>
                      <span className="detail-value coords">
                        {selectedBus.currentLat?.toFixed(6)}, {selectedBus.currentLon?.toFixed(6)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="detail-card wide">
                  <div className="detail-icon">🕐</div>
                  <div className="detail-content">
                    <span className="detail-label">Last Update</span>
                    <span className="detail-value">{formatLastUpdate(selectedBus.lastUpdate)}</span>
                  </div>
                </div>
              )}
            </div>
            
            {selectedBus.route && (
              <div className="route-info-section">
                <h4 className="section-title">
                  <span className="section-icon">🗺️</span>
                  Route Information
                </h4>
                <div className="route-details">
                  <div className="route-detail">
                    <span className="route-label">From:</span>
                    <span className="route-value">{selectedBus.route.startPoint}</span>
                  </div>
                  <div className="route-detail">
                    <span className="route-label">To:</span>
                    <span className="route-value">{selectedBus.route.endPoint}</span>
                  </div>
                  <div className="route-detail">
                    <span className="route-label">Stops:</span>
                    <span className="route-value">{selectedBus.route.stops?.length || 0} stops</span>
                  </div>
                  <div className="route-detail">
                    <span className="route-label">Duration:</span>
                    <span className="route-value">{selectedBus.route.estimatedDuration} min</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FleetTracking;
