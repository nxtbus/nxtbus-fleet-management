/**
 * NxtBus Backend Server
 * Stores data in JSON files instead of localStorage
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Data directory
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Default data
const defaultData = {
  owners: [
    { id: 'OWN001', name: 'Sharma Transport', email: 'sharma@transport.com', phone: '9876500001', address: 'Bangalore', status: 'active', createdAt: '2024-01-01' },
    { id: 'OWN002', name: 'Patel Bus Services', email: 'patel@busservices.com', phone: '9876500002', address: 'Mangalore', status: 'active', createdAt: '2024-01-10' }
  ],
  buses: [
    { id: 'BUS001', number: '101A', type: 'AC', capacity: 40, status: 'active', ownerId: 'OWN001', assignedDrivers: ['DRV001', 'DRV003'], assignedRoutes: [], createdAt: '2024-01-15' },
    { id: 'BUS002', number: '102B', type: 'Non-AC', capacity: 50, status: 'active', ownerId: 'OWN001', assignedDrivers: ['DRV001'], assignedRoutes: [], createdAt: '2024-01-20' },
    { id: 'BUS003', number: '103C', type: 'AC', capacity: 40, status: 'maintenance', ownerId: 'OWN002', assignedDrivers: ['DRV002'], assignedRoutes: [], createdAt: '2024-02-01' },
    { id: 'BUS004', number: '104D', type: 'Electric', capacity: 35, status: 'active', ownerId: 'OWN002', assignedDrivers: ['DRV002'], assignedRoutes: [], createdAt: '2024-02-15' },
    { id: 'BUS005', number: '105E', type: 'Diesel', capacity: 45, status: 'inactive', ownerId: null, assignedDrivers: [], assignedRoutes: [], createdAt: '2024-03-01' }
  ],
  routes: [
    {
      id: 'ROUTE001', name: 'Central Station → Airport', startPoint: 'Central Station', endPoint: 'Airport Terminal',
      startLat: 12.9716, startLon: 77.5946, endLat: 13.1989, endLon: 77.7068, estimatedDuration: 90, status: 'active',
      stops: [
        { id: 'S1', name: 'Central Station', lat: 12.9716, lon: 77.5946, order: 1, estimatedTime: 0 },
        { id: 'S2', name: 'MG Road', lat: 13.0100, lon: 77.6000, order: 2, estimatedTime: 15 },
        { id: 'S3', name: 'Indiranagar', lat: 13.0200, lon: 77.6400, order: 3, estimatedTime: 30 },
        { id: 'S4', name: 'Whitefield', lat: 13.0500, lon: 77.7000, order: 4, estimatedTime: 55 },
        { id: 'S5', name: 'Airport Terminal', lat: 13.1989, lon: 77.7068, order: 5, estimatedTime: 90 }
      ]
    }
  ],
  drivers: [
    { id: 'DRV001', name: 'Rajesh Kumar', phone: '9876543210', pin: '1234', status: 'active', assignedBuses: ['BUS001', 'BUS002'] },
    { id: 'DRV002', name: 'Suresh Patel', phone: '9876543211', pin: '5678', status: 'active', assignedBuses: ['BUS003', 'BUS004'] },
    { id: 'DRV003', name: 'Amit Singh', phone: '9876543212', pin: '9012', status: 'active', assignedBuses: ['BUS001', 'BUS005'] }
  ],
  delays: [],
  notifications: [],
  feedbacks: [],
  activeTrips: [],
  schedules: [],
  callAlerts: []
};

// Helper functions
function getFilePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readData(collection) {
  const filePath = getFilePath(collection);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${collection}:`, error);
  }
  // Return default data if file doesn't exist
  return defaultData[collection] || [];
}

function writeData(collection, data) {
  const filePath = getFilePath(collection);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error writing ${collection}:`, error);
    return false;
  }
}

// Initialize data files if they don't exist
Object.keys(defaultData).forEach(collection => {
  const filePath = getFilePath(collection);
  if (!fs.existsSync(filePath)) {
    writeData(collection, defaultData[collection]);
    console.log(`Created ${collection}.json`);
  }
});

// ============ API ROUTES ============

// ============ AUTHENTICATION ENDPOINTS ============

// Owner login with phone and PIN
app.post('/api/auth/owner/login', (req, res) => {
  const { phone, pin } = req.body;
  const owners = readData('owners');
  
  const owner = owners.find(o => o.phone === phone && o.pin === pin);
  
  if (!owner) {
    res.status(401).json({ success: false, message: 'Invalid phone number or PIN' });
    return;
  }
  
  if (owner.status !== 'active') {
    res.status(401).json({ success: false, message: 'Account is not active' });
    return;
  }
  
  // Return owner without PIN
  const { pin: _, ...ownerData } = owner;
  res.json({ success: true, owner: ownerData });
});

// Admin login with username and password
app.post('/api/auth/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admins = readData('admins');
  
  const admin = admins.find(a => a.username === username && a.password === password);
  
  if (!admin) {
    res.status(401).json({ success: false, message: 'Invalid username or password' });
    return;
  }
  
  if (admin.status !== 'active') {
    res.status(401).json({ success: false, message: 'Account is not active' });
    return;
  }
  
  // Return admin without password
  const { password: _, ...adminData } = admin;
  res.json({ success: true, admin: adminData });
});

// ============ OWNER PORTAL SPECIFIC ENDPOINTS (must be before generic routes) ============

// Helper function to build complete route path with start, stops, and end
function buildRouteWithFullPath(dbRoute, tripRoute) {
  const route = dbRoute || tripRoute;
  if (!route) return null;
  
  // Build complete stops array including start and end points
  const allStops = [];
  
  // Add start point
  if (route.startLat && route.startLon) {
    allStops.push({
      id: 'START',
      name: route.startPoint || 'Start',
      lat: route.startLat,
      lon: route.startLon,
      order: 0,
      estimatedTime: 0,
      isStart: true
    });
  }
  
  // Add intermediate stops (sorted by order)
  const intermediateStops = (route.stops || [])
    .filter(s => s.lat && s.lon)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((s, idx) => ({
      ...s,
      order: idx + 1
    }));
  allStops.push(...intermediateStops);
  
  // Add end point
  if (route.endLat && route.endLon) {
    allStops.push({
      id: 'END',
      name: route.endPoint || 'End',
      lat: route.endLat,
      lon: route.endLon,
      order: allStops.length,
      estimatedTime: route.estimatedDuration || 0,
      isEnd: true
    });
  }
  
  return {
    id: route.id,
    name: route.name,
    startPoint: route.startPoint,
    endPoint: route.endPoint,
    startLat: route.startLat,
    startLon: route.startLon,
    endLat: route.endLat,
    endLon: route.endLon,
    estimatedDuration: route.estimatedDuration,
    stops: allStops
  };
}

// Get real-time fleet locations with enhanced data
app.get('/api/owner/fleet-locations', (req, res) => {
  const trips = readData('activeTrips');
  const buses = readData('buses');
  const drivers = readData('drivers');
  const routes = readData('routes');
  
  const fleetLocations = trips.map(trip => {
    const bus = buses.find(b => b.id === trip.busId);
    const driver = drivers.find(d => d.id === trip.driverId);
    const route = routes.find(r => r.id === trip.routeId);
    
    // Calculate speed from GPS data
    let speed = 0;
    if (trip.currentGps?.speed) {
      speed = Math.round(trip.currentGps.speed * 3.6);
    } else if (trip.currentGps && trip.previousGps) {
      const timeDiff = (trip.currentGps.timestamp - trip.previousGps.timestamp) / 1000;
      if (timeDiff > 0) {
        const distance = calculateDistance(
          trip.previousGps.lat, trip.previousGps.lon,
          trip.currentGps.lat, trip.currentGps.lon
        );
        speed = Math.round((distance / timeDiff) * 3600);
      }
    }
    
    // Calculate progress
    let progress = 0;
    if (trip.startTime && (route?.estimatedDuration || trip.route?.estimatedDuration)) {
      const duration = route?.estimatedDuration || trip.route?.estimatedDuration;
      const elapsed = (Date.now() - new Date(trip.startTime).getTime()) / 60000;
      progress = Math.min(100, Math.round((elapsed / duration) * 100));
    }
    
    return {
      tripId: trip.tripId || trip.id,
      busId: trip.busId,
      busNumber: bus?.number || trip.busNumber || 'Unknown',
      driverId: trip.driverId,
      driverName: driver?.name || trip.driverName || 'Unknown',
      driverPhone: driver?.phone || '',
      routeId: trip.routeId,
      routeName: route?.name || trip.route?.name || 'Unknown Route',
      currentLat: trip.currentGps?.lat || trip.route?.startLat,
      currentLon: trip.currentGps?.lon || trip.route?.startLon,
      speed: speed,
      maxSpeed: trip.maxSpeed || speed,
      avgSpeed: trip.avgSpeed || speed,
      heading: trip.currentGps?.heading || 0,
      accuracy: trip.currentGps?.accuracy || 0,
      progress: progress,
      startTime: trip.startTime,
      lastUpdate: trip.lastUpdate || trip.currentGps?.timestamp || Date.now(),
      status: 'active',
      estimatedArrival: trip.route?.tripEndTime,
      route: buildRouteWithFullPath(route, trip.route)
    };
  });
  
  res.json(fleetLocations);
});

// Get owner dashboard stats
app.get('/api/owner/dashboard', (req, res) => {
  const buses = readData('buses');
  const drivers = readData('drivers');
  const routes = readData('routes');
  const trips = readData('activeTrips');
  const delays = readData('delays');
  const schedules = readData('schedules');
  
  let overspeedCount = 0;
  trips.forEach(trip => {
    let speed = 0;
    if (trip.currentGps?.speed) {
      speed = trip.currentGps.speed * 3.6;
    }
    if (speed > 60) overspeedCount++;
  });
  
  const now = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = dayNames[now.getDay()];
  const todaySchedules = schedules.filter(s => 
    s.status === 'active' && s.days?.includes(today)
  );
  
  res.json({
    totalBuses: buses.length,
    activeBuses: buses.filter(b => b.status === 'active').length,
    busesOnTrip: trips.length,
    totalDrivers: drivers.length,
    activeDrivers: drivers.filter(d => d.status === 'active').length,
    totalRoutes: routes.length,
    activeRoutes: routes.filter(r => r.status === 'active').length,
    activeDelays: delays.filter(d => d.status === 'active').length,
    overspeedAlerts: overspeedCount,
    todaySchedules: todaySchedules.length,
    timestamp: Date.now()
  });
});

// Update trip GPS with speed tracking
app.put('/api/trips/:tripId/gps', (req, res) => {
  const { tripId } = req.params;
  const gpsData = req.body;
  
  let trips = readData('activeTrips');
  const index = trips.findIndex(t => t.tripId === tripId || t.id === tripId);
  
  if (index === -1) {
    res.status(404).json({ error: 'Trip not found' });
    return;
  }
  
  const trip = trips[index];
  const previousGps = trip.currentGps;
  
  let speed = gpsData.speed || 0;
  if (!speed && previousGps && gpsData.lat && gpsData.lon) {
    const timeDiff = (gpsData.timestamp - previousGps.timestamp) / 1000;
    if (timeDiff > 0) {
      const distance = calculateDistance(
        previousGps.lat, previousGps.lon,
        gpsData.lat, gpsData.lon
      );
      speed = (distance / timeDiff) * 3600;
    }
  }
  
  const speedKmh = speed * 3.6;
  trip.maxSpeed = Math.max(trip.maxSpeed || 0, speedKmh);
  
  const updateCount = (trip.gpsUpdateCount || 0) + 1;
  trip.avgSpeed = ((trip.avgSpeed || 0) * (updateCount - 1) + speedKmh) / updateCount;
  trip.gpsUpdateCount = updateCount;
  
  if (speedKmh > 60) {
    trip.overspeedCount = (trip.overspeedCount || 0) + 1;
    trip.lastOverspeed = Date.now();
  }
  
  trips[index] = {
    ...trip,
    previousGps: previousGps,
    currentGps: { ...gpsData, speed: speed },
    lastUpdate: Date.now()
  };
  
  writeData('activeTrips', trips);
  res.json(trips[index]);
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ============ ADMIN SPECIFIC ROUTES (must be before generic routes) ============

// Admin buses endpoints
app.get('/api/admin/buses', (req, res) => {
  const data = readData('buses');
  res.json(data);
});

app.post('/api/admin/buses', (req, res) => {
  const data = readData('buses');
  const newItem = req.body;
  
  if (!newItem.id) {
    const maxId = data.reduce((max, item) => {
      const num = parseInt(item.id?.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    newItem.id = `BUS${String(maxId + 1).padStart(3, '0')}`;
  }
  
  data.push(newItem);
  writeData('buses', data);
  res.status(201).json(newItem);
});

app.put('/api/admin/buses/:id', (req, res) => {
  const { id } = req.params;
  const data = readData('buses');
  const index = data.findIndex(d => d.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  data[index] = { ...data[index], ...req.body };
  writeData('buses', data);
  res.json(data[index]);
});

app.delete('/api/admin/buses/:id', (req, res) => {
  const { id } = req.params;
  let data = readData('buses');
  const initialLength = data.length;
  
  data = data.filter(d => d.id !== id);
  
  if (data.length === initialLength) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  writeData('buses', data);
  res.json({ success: true });
});

// Admin routes endpoints
app.get('/api/admin/routes', (req, res) => {
  const data = readData('routes');
  res.json(data);
});

app.post('/api/admin/routes', (req, res) => {
  const data = readData('routes');
  const newItem = req.body;
  
  if (!newItem.id) {
    const maxId = data.reduce((max, item) => {
      const num = parseInt(item.id?.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    newItem.id = `ROUTE${String(maxId + 1).padStart(3, '0')}`;
  }
  
  data.push(newItem);
  writeData('routes', data);
  res.status(201).json(newItem);
});

app.put('/api/admin/routes/:id', (req, res) => {
  const { id } = req.params;
  const data = readData('routes');
  const index = data.findIndex(d => d.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  data[index] = { ...data[index], ...req.body };
  writeData('routes', data);
  res.json(data[index]);
});

app.delete('/api/admin/routes/:id', (req, res) => {
  const { id } = req.params;
  let data = readData('routes');
  const initialLength = data.length;
  
  data = data.filter(d => d.id !== id);
  
  if (data.length === initialLength) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  writeData('routes', data);
  res.json({ success: true });
});

// Admin drivers endpoints
app.get('/api/admin/drivers', (req, res) => {
  const data = readData('drivers');
  res.json(data);
});

app.post('/api/admin/drivers', (req, res) => {
  const data = readData('drivers');
  const newItem = req.body;
  
  if (!newItem.id) {
    const maxId = data.reduce((max, item) => {
      const num = parseInt(item.id?.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    newItem.id = `DRV${String(maxId + 1).padStart(3, '0')}`;
  }
  
  data.push(newItem);
  writeData('drivers', data);
  res.status(201).json(newItem);
});

app.put('/api/admin/drivers/:id', (req, res) => {
  const { id } = req.params;
  const data = readData('drivers');
  const index = data.findIndex(d => d.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  data[index] = { ...data[index], ...req.body };
  writeData('drivers', data);
  res.json(data[index]);
});

app.delete('/api/admin/drivers/:id', (req, res) => {
  const { id } = req.params;
  let data = readData('drivers');
  const initialLength = data.length;
  
  data = data.filter(d => d.id !== id);
  
  if (data.length === initialLength) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  writeData('drivers', data);
  res.json({ success: true });
});

// Admin delays endpoints
app.get('/api/admin/delays', (req, res) => {
  const data = readData('delays');
  res.json(data);
});

app.post('/api/admin/delays', (req, res) => {
  const data = readData('delays');
  const newItem = req.body;
  
  if (!newItem.id) {
    const maxId = data.reduce((max, item) => {
      const num = parseInt(item.id?.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    newItem.id = `DEL${String(maxId + 1).padStart(3, '0')}`;
  }
  
  data.push(newItem);
  writeData('delays', data);
  res.status(201).json(newItem);
});

app.put('/api/admin/delays/:id', (req, res) => {
  const { id } = req.params;
  const data = readData('delays');
  const index = data.findIndex(d => d.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  data[index] = { ...data[index], ...req.body };
  writeData('delays', data);
  res.json(data[index]);
});

app.delete('/api/admin/delays/:id', (req, res) => {
  const { id } = req.params;
  let data = readData('delays');
  const initialLength = data.length;
  
  data = data.filter(d => d.id !== id);
  
  if (data.length === initialLength) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  writeData('delays', data);
  res.json({ success: true });
});

// Admin notifications endpoints
app.get('/api/admin/notifications', (req, res) => {
  const data = readData('notifications');
  res.json(data);
});

app.post('/api/admin/notifications', (req, res) => {
  const data = readData('notifications');
  const newItem = req.body;
  
  if (!newItem.id) {
    const maxId = data.reduce((max, item) => {
      const num = parseInt(item.id?.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    newItem.id = `NOT${String(maxId + 1).padStart(3, '0')}`;
  }
  
  data.push(newItem);
  writeData('notifications', data);
  res.status(201).json(newItem);
});

app.delete('/api/admin/notifications/:id', (req, res) => {
  const { id } = req.params;
  let data = readData('notifications');
  const initialLength = data.length;
  
  data = data.filter(d => d.id !== id);
  
  if (data.length === initialLength) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  writeData('notifications', data);
  res.json({ success: true });
});

// Admin owners endpoints
app.get('/api/admin/owners', (req, res) => {
  const data = readData('owners');
  res.json(data);
});

app.get('/api/admin/owners/:id', (req, res) => {
  const { id } = req.params;
  const data = readData('owners');
  const item = data.find(d => d.id === id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.post('/api/admin/owners', (req, res) => {
  const data = readData('owners');
  const newItem = req.body;
  
  if (!newItem.id) {
    const maxId = data.reduce((max, item) => {
      const num = parseInt(item.id?.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    newItem.id = `OWN${String(maxId + 1).padStart(3, '0')}`;
  }
  
  data.push(newItem);
  writeData('owners', data);
  res.status(201).json(newItem);
});

app.put('/api/admin/owners/:id', (req, res) => {
  const { id } = req.params;
  const data = readData('owners');
  const index = data.findIndex(d => d.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  data[index] = { ...data[index], ...req.body };
  writeData('owners', data);
  res.json(data[index]);
});

app.delete('/api/admin/owners/:id', (req, res) => {
  const { id } = req.params;
  let data = readData('owners');
  const initialLength = data.length;
  
  data = data.filter(d => d.id !== id);
  
  if (data.length === initialLength) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  writeData('owners', data);
  res.json({ success: true });
});

// ============ GENERIC COLLECTION ROUTES ============

// Get all data for a collection
app.get('/api/:collection', (req, res) => {
  const { collection } = req.params;
  const data = readData(collection);
  res.json(data);
});

// Get single item by ID
app.get('/api/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const data = readData(collection);
  const item = data.find(d => d.id === id);
  if (item) {
    res.json(item);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Create new item
app.post('/api/:collection', (req, res) => {
  const { collection } = req.params;
  const data = readData(collection);
  const newItem = req.body;
  
  // Generate ID if not provided
  if (!newItem.id) {
    const prefix = collection.toUpperCase().slice(0, 3);
    const maxId = data.reduce((max, item) => {
      const num = parseInt(item.id?.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    newItem.id = `${prefix}${String(maxId + 1).padStart(3, '0')}`;
  }
  
  data.push(newItem);
  writeData(collection, data);
  res.status(201).json(newItem);
});

// Update item
app.put('/api/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  const data = readData(collection);
  const index = data.findIndex(d => d.id === id);
  
  if (index === -1) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  data[index] = { ...data[index], ...req.body };
  writeData(collection, data);
  res.json(data[index]);
});

// Delete item
app.delete('/api/:collection/:id', (req, res) => {
  const { collection, id } = req.params;
  let data = readData(collection);
  const initialLength = data.length;
  
  data = data.filter(d => d.id !== id);
  
  if (data.length === initialLength) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  
  writeData(collection, data);
  res.json({ success: true });
});

// Reset all data to defaults
app.post('/api/reset', (req, res) => {
  Object.keys(defaultData).forEach(collection => {
    writeData(collection, defaultData[collection]);
  });
  res.json({ success: true, message: 'All data reset to defaults' });
});

// Health check endpoint for mobile app testing
app.get('/api/health', (req, res) => {
  console.log('HEALTH CHECK from:', req.headers['user-agent'] || 'unknown');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'NxtBus API Server',
    ip: req.ip
  });
});

// Get all data (for initial load)
app.get('/api', (req, res) => {
  const allData = {};
  Object.keys(defaultData).forEach(collection => {
    allData[collection] = readData(collection);
  });
  res.json(allData);
});

// Add a catch-all route for debugging mobile app requests
app.all('*', (req, res, next) => {
  console.log(`CATCH-ALL: ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`NxtBus API Server running on http://localhost:${PORT}`);
  console.log(`Network access: http://10.104.193.222:${PORT}`);
  console.log(`Data stored in: ${DATA_DIR}`);
});
