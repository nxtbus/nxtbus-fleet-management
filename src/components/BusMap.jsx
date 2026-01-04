import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateDistance, formatDistance } from '../utils/geoUtils';
import { getSnappedPosition } from '../services/routeDiversionService';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom bus icon
const busIcon = new L.DivIcon({
  className: 'bus-marker',
  html: '<div class="bus-icon">🚌</div>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Custom stop icon
const stopIcon = new L.DivIcon({
  className: 'stop-marker',
  html: '<div class="stop-icon">📍</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// User location icon
const userIcon = new L.DivIcon({
  className: 'user-marker',
  html: '<div class="user-icon">📱</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// Component to fit map bounds
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

// Fetch road route from OSRM
async function fetchRoadRoute(startLat, startLon, endLat, endLon) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const route = data.routes[0];
      // Convert GeoJSON coordinates [lon, lat] to Leaflet [lat, lon]
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      return {
        coordinates,
        distance: route.distance / 1000, // Convert to km
        duration: route.duration / 60 // Convert to minutes
      };
    }
  } catch (error) {
    console.error('Failed to fetch road route:', error);
  }
  return null;
}

// Component to display road route
function RoadRoute({ bus, userLocation, onRouteLoaded }) {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bus.currentGps && userLocation) {
      setLoading(true);
      fetchRoadRoute(
        bus.currentGps.lat, bus.currentGps.lon,
        userLocation.lat, userLocation.lon
      ).then(data => {
        setRouteData(data);
        setLoading(false);
        if (onRouteLoaded && data) {
          onRouteLoaded(bus.id, data);
        }
      });
    }
  }, [bus.currentGps?.lat, bus.currentGps?.lon, userLocation?.lat, userLocation?.lon]);

  if (!routeData || !routeData.coordinates) {
    // Fallback to straight line
    return (
      <Polyline
        positions={[
          [bus.currentGps.lat, bus.currentGps.lon],
          [userLocation.lat, userLocation.lon]
        ]}
        color="#e53935"
        weight={3}
        opacity={0.8}
        dashArray="5, 10"
      />
    );
  }

  // Find midpoint of route for tooltip
  const midIndex = Math.floor(routeData.coordinates.length / 2);
  const midPoint = routeData.coordinates[midIndex];

  return (
    <>
      {/* Road route line */}
      <Polyline
        positions={routeData.coordinates}
        color="#e53935"
        weight={4}
        opacity={0.9}
      />
    </>
  );
}

// GPS Smoothing - keeps history of positions and smooths movement
const gpsHistory = new Map();
const SMOOTHING_FACTOR = 0.3; // Lower = smoother but slower response
const HISTORY_SIZE = 5;

function smoothGpsPosition(busId, newLat, newLon) {
  if (!gpsHistory.has(busId)) {
    gpsHistory.set(busId, []);
  }
  
  const history = gpsHistory.get(busId);
  history.push({ lat: newLat, lon: newLon, timestamp: Date.now() });
  
  // Keep only recent history
  while (history.length > HISTORY_SIZE) {
    history.shift();
  }
  
  if (history.length < 2) {
    return { lat: newLat, lon: newLon };
  }
  
  // Weighted average - more recent positions have higher weight
  let totalWeight = 0;
  let smoothedLat = 0;
  let smoothedLon = 0;
  
  history.forEach((pos, idx) => {
    const weight = Math.pow(SMOOTHING_FACTOR, history.length - 1 - idx);
    smoothedLat += pos.lat * weight;
    smoothedLon += pos.lon * weight;
    totalWeight += weight;
  });
  
  return {
    lat: smoothedLat / totalWeight,
    lon: smoothedLon / totalWeight
  };
}

// Find nearest point on road route to snap bus position
function snapToRoad(busLat, busLon, routeCoordinates) {
  if (!routeCoordinates || routeCoordinates.length === 0) {
    return { lat: busLat, lon: busLon };
  }
  
  let nearestPoint = routeCoordinates[0];
  let minDistance = Infinity;
  
  for (const coord of routeCoordinates) {
    const dist = Math.pow(coord[0] - busLat, 2) + Math.pow(coord[1] - busLon, 2);
    if (dist < minDistance) {
      minDistance = dist;
      nearestPoint = coord;
    }
  }
  
  return { lat: nearestPoint[0], lon: nearestPoint[1] };
}

// Smoothed Bus Marker Component
function SmoothedBusMarker({ bus, routeCoordinates }) {
  const [smoothedPosition, setSmoothedPosition] = useState(null);
  const [displayPosition, setDisplayPosition] = useState(null);
  
  useEffect(() => {
    if (!bus.currentGps) return;
    
    // Step 1: Smooth the GPS position
    const smoothed = smoothGpsPosition(bus.id, bus.currentGps.lat, bus.currentGps.lon);
    
    // Step 2: Use route diversion service for map-matching (snap to official route)
    let finalPosition;
    if (bus.route) {
      finalPosition = getSnappedPosition(bus.id, smoothed.lat, smoothed.lon, bus.route);
    } else if (routeCoordinates && routeCoordinates.length > 0) {
      finalPosition = snapToRoad(smoothed.lat, smoothed.lon, routeCoordinates);
    } else {
      finalPosition = smoothed;
    }
    
    setSmoothedPosition(finalPosition);
    
    // Animate to new position
    if (displayPosition) {
      // Smooth transition
      const animationDuration = 1000; // 1 second
      const startTime = Date.now();
      const startPos = { ...displayPosition };
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Ease-out animation
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        setDisplayPosition({
          lat: startPos.lat + (finalPosition.lat - startPos.lat) * easeProgress,
          lon: startPos.lon + (finalPosition.lon - startPos.lon) * easeProgress
        });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    } else {
      setDisplayPosition(finalPosition);
    }
  }, [bus.currentGps?.lat, bus.currentGps?.lon, routeCoordinates, bus.route]);
  
  if (!displayPosition) return null;
  
  return (
    <Marker
      position={[displayPosition.lat, displayPosition.lon]}
      icon={busIcon}
    >
      <Popup>
        <div className="bus-popup">
          <strong>🚌 Bus {bus.busNumber}</strong>
          <br />
          <span>{bus.route?.name}</span>
          {bus.schedule && (
            <>
              <br />
              <small>🕐 {bus.schedule.startTime} - {bus.schedule.endTime}</small>
            </>
          )}
          {bus.isLive && <span className="live-tag">LIVE</span>}
          <br />
          <small style={{ color: '#4CAF50' }}>📍 Route-Locked Position</small>
        </div>
      </Popup>
    </Marker>
  );
}

function BusMap({ buses, stops, userLocation, selectedRoute, busResults, trafficAlerts = [] }) {
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]); // Default: Bangalore
  const [roadDistances, setRoadDistances] = useState({});
  const [routeCoordinates, setRouteCoordinates] = useState({});

  // Calculate bounds from all points
  const allPoints = [
    ...buses.filter(b => b.currentGps).map(b => [b.currentGps.lat, b.currentGps.lon]),
    ...stops.map(s => [s.lat, s.lon]),
    ...(userLocation ? [[userLocation.lat, userLocation.lon]] : [])
  ];

  // Get route path from stops
  const routePath = stops.map(s => [s.lat, s.lon]);

  // Get ETA info for a bus
  const getBusETA = (busId) => {
    if (!busResults) return null;
    const result = busResults.find(r => r.bus.id === busId);
    return result?.eta;
  };

  // Handle road route loaded
  const handleRouteLoaded = (busId, routeData) => {
    setRoadDistances(prev => ({
      ...prev,
      [busId]: routeData
    }));
    setRouteCoordinates(prev => ({
      ...prev,
      [busId]: routeData.coordinates
    }));
  };

  // Get road distance for a bus (or fallback to straight line)
  const getRoadDistance = (bus) => {
    if (roadDistances[bus.id]) {
      return roadDistances[bus.id].distance;
    }
    // Fallback to straight line distance
    return calculateDistance(
      bus.currentGps.lat, bus.currentGps.lon,
      userLocation.lat, userLocation.lon
    );
  };

  return (
    <div className="map-container">
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '400px', width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Fit bounds to show all markers */}
        {allPoints.length > 0 && <FitBounds bounds={allPoints} />}

        {/* Traffic congestion overlay */}
        {trafficAlerts.map((alert, idx) => {
          if (!alert.fromStop || !alert.toStop) return null;
          const trafficColor = alert.severity === 'HIGH' ? '#D32F2F' : 
                              alert.severity === 'MEDIUM' ? '#FF9800' : '#FFC107';
          return (
            <Polyline
              key={`traffic-${idx}`}
              positions={[
                [alert.fromStop.lat, alert.fromStop.lon],
                [alert.toStop.lat, alert.toStop.lon]
              ]}
              color={trafficColor}
              weight={8}
              opacity={0.7}
            >
              <Tooltip permanent direction="center">
                ⚠️ {alert.severity} Traffic - {alert.avgSpeed} km/h
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Road route from each bus to user location */}
        {userLocation && buses.filter(b => b.currentGps).map((bus, idx) => (
          <RoadRoute
            key={`route-${bus.id || idx}`}
            bus={bus}
            userLocation={userLocation}
            onRouteLoaded={handleRouteLoaded}
          />
        ))}

        {/* Smoothed Bus markers with road snapping */}
        {buses.filter(b => b.currentGps).map((bus, idx) => (
          <SmoothedBusMarker
            key={bus.id || idx}
            bus={bus}
            routeCoordinates={routeCoordinates[bus.id]}
          />
        ))}

        {/* Stop markers */}
        {stops.map((stop, idx) => (
          <Marker
            key={stop.id || idx}
            position={[stop.lat, stop.lon]}
            icon={stopIcon}
          >
            <Popup>
              <div className="stop-popup">
                <strong>📍 {stop.name}</strong>
                {stop.estimatedTime !== undefined && (
                  <>
                    <br />
                    <small>~{stop.estimatedTime} min from start</small>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* User location */}
        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lon]}
            icon={userIcon}
          >
            <Popup>
              <strong>📱 Your Location</strong>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="map-legend">
        <span><span className="legend-icon">🚌</span> Bus</span>
        <span><span className="legend-icon">📍</span> Stop</span>
        <span><span className="legend-icon">📱</span> You</span>
        <span><span className="legend-line road">━━</span> Distance</span>
      </div>
    </div>
  );
}

export default BusMap;
