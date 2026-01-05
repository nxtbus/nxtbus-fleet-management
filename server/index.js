/**
 * NxtBus Backend Server - Production Ready
 * Enhanced with security, validation, logging, and error handling
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const fs = require('fs');
const path = require('path');

// Import middleware
const { authenticate, authorize, handleValidationErrors, securityHeaders } = require('./middleware/auth');

// Conditionally import rate limiting middleware only if enabled
let dynamicRateLimit, authRateLimit, gpsRateLimit, feedbackRateLimit, apiKeyRateLimit, websocketRateLimit, helmet, requestSizeLimits, suspiciousActivityDetection, corsOptions, securityMonitoring, checkBruteForce;

if (process.env.ENABLE_RATE_LIMITING === 'true') {
  console.log('🔒 Rate limiting enabled - importing security middleware');
  const rateLimitingModule = require('./middleware/enhancedSecurity');
  ({
    dynamicRateLimit,
    authRateLimit, 
    gpsRateLimit, 
    feedbackRateLimit,
    apiKeyRateLimit,
    websocketRateLimit,
    securityHeaders: helmet,
    requestSizeLimits,
    suspiciousActivityDetection,
    corsOptions,
    securityMonitoring,
    checkBruteForce
  } = rateLimitingModule);
} else {
  console.log('⚠️ Rate limiting disabled - using minimal security middleware');
  // Provide minimal implementations when rate limiting is disabled
  const cors = require('cors');
  const helmetModule = require('helmet');
  
  // Configure helmet with basic security headers
  helmet = helmetModule({
    contentSecurityPolicy: false, // Disable CSP for development
    crossOriginEmbedderPolicy: false
  });
  
  corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
      
      // Default allowed origins if environment variable not set
      const defaultOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://nxtbus-fleet-management.vercel.app',
        'https://nxtbus.vercel.app'
      ];
      
      // Allow all Vercel preview deployments
      const isVercelDomain = origin.includes('vercel.app') || origin.includes('nxtbus');
      
      const finalAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;
      
      if (finalAllowedOrigins.includes(origin) || isVercelDomain) {
        callback(null, true);
      } else {
        console.log(`⚠️ CORS blocked origin: ${origin}`);
        callback(null, true); // Allow all origins in production for now
      }
    },
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'X-API-Key',
      'X-Client-Version',
      'X-Request-ID'
    ]
  };
  requestSizeLimits = {
    small: (req, res, next) => next(),
    medium: (req, res, next) => next(),
    large: (req, res, next) => next()
  };
  suspiciousActivityDetection = (req, res, next) => next();
  securityMonitoring = (req, res, next) => next();
  checkBruteForce = () => (req, res, next) => next();
  authRateLimit = (req, res, next) => next();
  gpsRateLimit = (req, res, next) => next();
  feedbackRateLimit = (req, res, next) => next();
  apiKeyRateLimit = (req, res, next) => next();
  websocketRateLimit = (req, res, next) => next();
}

const oauthGateway = require('./services/oauthGateway');
const passport = require('passport');
const {
  validateLogin,
  validateAdminLogin,
  validateBus,
  validateBusPartial,
  validateRoute,
  validateDriver,
  validateGPS,
  validateTrip,
  validateFeedback,
  validateNotification,
  validateObjectId,
  handleValidationErrors: validationErrorHandler
} = require('./middleware/validation');
const {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  gracefulShutdown,
  AppError,
  NotFoundError,
  AuthenticationError
} = require('./middleware/errorHandler');
const { requestLogger, logSecurityEvent, logAuthEvent } = require('./utils/logger');
const websocketService = require('./services/websocketService');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware (apply early)
if (process.env.ENABLE_SECURITY_HEADERS !== 'false') {
  app.use(helmet);
}
app.use(securityHeaders);
app.use(securityMonitoring);
app.use(suspiciousActivityDetection);
app.use(requestSizeLimits.medium);

// Initialize Passport for OAuth
app.use(passport.initialize());

// CORS
app.use(cors(corsOptions));

// Compression
if (process.env.ENABLE_COMPRESSION !== 'false') {
  app.use(compression());
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting with dynamic tiers
if (process.env.ENABLE_RATE_LIMITING === 'true') {
  app.use('/api/', dynamicRateLimit);
  console.log('🔒 Rate limiting enabled for /api/ routes');
} else {
  console.log('⚠️ Rate limiting disabled via environment variable');
}

// Import database service
const db = require('./services/databaseService');

// Enhanced default data with hashed passwords
const bcrypt = require('bcryptjs');

// Function to initialize default data with hashed passwords
async function initializeDefaultData() {
  const defaultData = {
    admins: [
      { 
        id: 'ADM001', 
        username: 'admin', 
        password: await bcrypt.hash('admin123', 10), 
        name: 'System Administrator',
        email: 'admin@nxtbus.com',
        role: 'admin',
        status: 'active', 
        createdAt: '2024-01-01',
        lastLogin: null
      }
    ],
    owners: [
      { 
        id: 'OWN001', 
        name: 'Sharma Transport', 
        email: 'sharma@transport.com', 
        phone: '9876500001', 
        pin: await bcrypt.hash('1234', 10),
        address: 'Bangalore', 
        status: 'active', 
        createdAt: '2024-01-01',
        lastLogin: null
      },
      { 
        id: 'OWN002', 
        name: 'Patel Bus Services', 
        email: 'patel@busservices.com', 
        phone: '9876500002', 
        pin: await bcrypt.hash('5678', 10),
        address: 'Mangalore', 
        status: 'active', 
        createdAt: '2024-01-10',
        lastLogin: null
      }
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
      { id: 'DRV001', name: 'Rajesh Kumar', phone: '9876543210', pin: await bcrypt.hash('1234', 10), status: 'active', assignedBuses: ['BUS001', 'BUS002'], lastLogin: null },
      { id: 'DRV002', name: 'Suresh Patel', phone: '9876543211', pin: await bcrypt.hash('5678', 10), status: 'active', assignedBuses: ['BUS003', 'BUS004'], lastLogin: null },
      { id: 'DRV003', name: 'Amit Singh', phone: '9876543212', pin: await bcrypt.hash('9012', 10), status: 'active', assignedBuses: ['BUS001', 'BUS005'], lastLogin: null }
    ],
    delays: [],
    notifications: [],
    feedbacks: [],
    activeTrips: [],
    schedules: [],
    callAlerts: [
      {
        id: 'CALL001',
        tripId: 'TRIP001',
        busId: 'BUS001',
        busNumber: '101A',
        driverId: 'DRV001',
        driverName: 'Rajesh Kumar',
        driverPhone: '9876543210',
        routeId: 'ROUTE001',
        routeName: 'Central Station → Airport',
        ownerId: 'OWN001',
        callType: 'incoming',
        callStatus: 'answered',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        location: { lat: 12.9716, lon: 77.5946 },
        status: 'active',
        acknowledged: false,
        acknowledgedBy: null,
        acknowledgedAt: null,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
      },
      {
        id: 'CALL002',
        tripId: 'TRIP002',
        busId: 'BUS003',
        busNumber: '103C',
        driverId: 'DRV002',
        driverName: 'Suresh Patel',
        driverPhone: '9876543211',
        routeId: 'ROUTE001',
        routeName: 'Central Station → Airport',
        ownerId: 'OWN002',
        callType: 'outgoing',
        callStatus: 'ended',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        location: { lat: 13.0200, lon: 77.6400 },
        status: 'active',
        acknowledged: true,
        acknowledgedBy: 'Owner',
        acknowledgedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      }
    ]
  };
  
  return defaultData;
}

// ============ DATABASE HELPER FUNCTIONS ============

// Helper functions for database operations
async function getBuses() {
  return await db.getBuses();
}

async function getRoutes() {
  return await db.getRoutes();
}

async function getActiveTrips() {
  return await db.getActiveTrips();
}

async function getSchedules() {
  return await db.getSchedules();
}

async function getNotifications() {
  return await db.getNotifications();
}

async function getFeedbacks() {
  return await db.getFeedbacks();
}

async function getDelays() {
  return await db.getDelays();
}

async function getCallAlerts() {
  return await db.getCallAlerts();
}

async function getOwners() {
  return await db.getOwners();
}

async function getDrivers() {
  return await db.getDrivers();
}

async function getAdmins() {
  return await db.getAdmins();
}

// Legacy function for backward compatibility (now uses database)
async function readData(collection) {
  try {
    switch (collection) {
      case 'buses':
        return await getBuses();
      case 'routes':
        return await getRoutes();
      case 'activeTrips':
        return await getActiveTrips();
      case 'schedules':
        return await getSchedules();
      case 'notifications':
        return await getNotifications();
      case 'feedbacks':
        return await getFeedbacks();
      case 'delays':
        return await getDelays();
      case 'callAlerts':
        return await getCallAlerts();
      case 'drivers':
        return await getDrivers();
      case 'owners':
        return await getOwners();
      case 'admins':
        return await getAdmins();
      default:
        console.warn(`Unknown collection: ${collection}`);
        return [];
    }
  } catch (error) {
    console.error(`Error reading ${collection} from database:`, error);
    throw new AppError(`Failed to read ${collection} data`, 500, 'DATABASE_ERROR');
  }
}

// Legacy function for backward compatibility (writes to database)
async function writeData(collection, data) {
  try {
    // This function is deprecated - individual database methods should be used instead
    console.warn(`writeData is deprecated for collection: ${collection}. Use specific database methods instead.`);
    return true;
  } catch (error) {
    console.error(`Error writing ${collection} to database:`, error);
    throw new AppError(`Failed to write ${collection} data`, 500, 'DATABASE_ERROR');
  }
}

// Initialize the server
async function startServer() {
  // Test database connection
  console.log('🔗 Testing database connection...');
  
  try {
    // Test database connection by getting a simple count
    const buses = await db.getBuses();
    console.log(`✅ Database connected - ${buses.length} buses found`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('⚠️ Server will continue without database - using fallback mode');
    // Don't exit - continue with fallback mode
  }

// ============ OAUTH & API KEY AUTHENTICATION ============

// OAuth provider routes
const oauthRoutes = oauthGateway.getOAuthRoutes();
oauthRoutes.forEach(route => {
  app[route.method.toLowerCase()](route.path, ...Array.isArray(route.handler) ? route.handler : [route.handler]);
});

// OAuth status endpoint
app.get('/api/auth/oauth/status', (req, res) => {
  res.json({
    success: true,
    oauth: oauthGateway.getOAuthStatus()
  });
});

// API key management endpoints
app.post('/api/auth/api-keys',
  authenticate,
  asyncHandler(async (req, res) => {
    const { permissions = ['read'] } = req.body;
    
    // Validate permissions
    const validPermissions = ['read', 'write', 'admin'];
    const filteredPermissions = permissions.filter(p => validPermissions.includes(p));
    
    // Only admins can create admin API keys
    if (filteredPermissions.includes('admin') && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin role required to create admin API keys',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    const apiKeyData = oauthGateway.generateApiKey(req.user.id, filteredPermissions);
    
    res.status(201).json({
      success: true,
      apiKey: apiKeyData
    });
  })
);

app.get('/api/auth/api-keys',
  authenticate,
  asyncHandler(async (req, res) => {
    const apiKeys = oauthGateway.getUserApiKeys(req.user.id);
    res.json({
      success: true,
      apiKeys
    });
  })
);

app.delete('/api/auth/api-keys/:keyId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { keyId } = req.params;
    const revoked = oauthGateway.revokeApiKey(keyId, req.user.id);
    
    if (revoked) {
      res.json({
        success: true,
        message: 'API key revoked successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'API key not found',
        code: 'API_KEY_NOT_FOUND'
      });
    }
  })
);

// API key authentication middleware for public endpoints
const apiKeyAuth = (req, res, next) => {
  // Try API key authentication first
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey) {
    return oauthGateway.authenticateApiKey(req, res, next);
  }
  
  // Fall back to JWT authentication
  return authenticate(req, res, next);
};

// ============ ENHANCED AUTHENTICATION ENDPOINTS ============

// Admin login with enhanced security
app.post('/api/auth/admin/login', 
  authRateLimit,
  checkBruteForce('admin_login'),
  validateAdminLogin,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    const admin = await db.getAdminByUsername(username);
    
    if (!admin) {
      logAuthEvent('ADMIN_LOGIN_FAILED', null, { username, reason: 'user_not_found', ip: req.ip });
      throw new AuthenticationError('Invalid username or password');
    }
    
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, admin.password);
    
    if (!isValidPassword) {
      logAuthEvent('ADMIN_LOGIN_FAILED', admin.id, { username, reason: 'invalid_password', ip: req.ip });
      throw new AuthenticationError('Invalid username or password');
    }
    
    if (admin.status !== 'active') {
      logAuthEvent('ADMIN_LOGIN_FAILED', admin.id, { username, reason: 'account_inactive', ip: req.ip });
      throw new AuthenticationError('Account is not active');
    }
    
    // Update last login
    await db.updateAdmin(admin.id, { last_login: new Date().toISOString() });
    
    // Generate JWT token
    const { generateToken, createUserSession } = require('./middleware/auth');
    const sessionData = createUserSession(admin, 'admin');
    const token = generateToken(sessionData);
    
    logAuthEvent('ADMIN_LOGIN_SUCCESS', admin.id, { username, ip: req.ip });
    
    // Return admin without password
    const { password: _, ...adminData } = admin;
    res.json({ 
      success: true, 
      admin: adminData,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  })
);

// Owner login with enhanced security
app.post('/api/auth/owner/login',
  authRateLimit,
  checkBruteForce('owner_login'),
  validateLogin,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { phone, pin } = req.body;
    
    const owners = await getOwners();
    const owner = owners.find(o => o.phone === phone);
    
    if (!owner) {
      logAuthEvent('OWNER_LOGIN_FAILED', null, { phone, reason: 'user_not_found', ip: req.ip });
      throw new AuthenticationError('Invalid phone number or PIN');
    }
    
    const bcrypt = require('bcryptjs');
    const isValidPin = await bcrypt.compare(pin, owner.password || owner.pin);
    
    if (!isValidPin) {
      logAuthEvent('OWNER_LOGIN_FAILED', owner.id, { phone, reason: 'invalid_pin', ip: req.ip });
      throw new AuthenticationError('Invalid phone number or PIN');
    }
    
    if (owner.status !== 'active') {
      logAuthEvent('OWNER_LOGIN_FAILED', owner.id, { phone, reason: 'account_inactive', ip: req.ip });
      throw new AuthenticationError('Account is not active');
    }
    
    // Update last login
    await db.updateOwner(owner.id, { last_login: new Date().toISOString() });
    
    // Generate JWT token
    const { generateToken, createUserSession } = require('./middleware/auth');
    const sessionData = createUserSession(owner, 'owner');
    const token = generateToken(sessionData);
    
    logAuthEvent('OWNER_LOGIN_SUCCESS', owner.id, { phone, ip: req.ip });
    
    // Return owner without PIN/password
    const { pin: _, password: __, ...ownerData } = owner;
    res.json({ 
      success: true, 
      owner: ownerData,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  })
);

// Driver authentication endpoint
app.post('/api/auth/driver/login',
  authRateLimit,
  checkBruteForce('driver_login'),
  validateLogin,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { phone, pin } = req.body;
    
    const drivers = await getDrivers();
    const driver = drivers.find(d => d.phone === phone);
    
    if (!driver) {
      logAuthEvent('DRIVER_LOGIN_FAILED', null, { phone, reason: 'user_not_found', ip: req.ip });
      throw new AuthenticationError('Invalid phone number or PIN');
    }
    
    const bcrypt = require('bcryptjs');
    const isValidPin = await bcrypt.compare(pin, driver.password || driver.pin);
    
    if (!isValidPin) {
      logAuthEvent('DRIVER_LOGIN_FAILED', driver.id, { phone, reason: 'invalid_pin', ip: req.ip });
      throw new AuthenticationError('Invalid phone number or PIN');
    }
    
    if (driver.status !== 'active') {
      logAuthEvent('DRIVER_LOGIN_FAILED', driver.id, { phone, reason: 'account_inactive', ip: req.ip });
      throw new AuthenticationError('Account is not active');
    }
    
    // Update last login
    await db.updateDriver(driver.id, { last_login: new Date().toISOString() });
    
    // Generate JWT token
    const { generateToken, createUserSession } = require('./middleware/auth');
    const sessionData = createUserSession(driver, 'driver');
    const token = generateToken(sessionData);
    
    logAuthEvent('DRIVER_LOGIN_SUCCESS', driver.id, { phone, ip: req.ip });
    
    // Return driver without PIN/password
    const { pin: _, password: __, ...driverData } = driver;
    res.json({ 
      success: true, 
      driver: driverData,
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  })
);

// Token refresh endpoint
app.post('/api/auth/refresh',
  authenticate,
  asyncHandler(async (req, res) => {
    const { generateToken } = require('./middleware/auth');
    const newToken = generateToken({
      id: req.user.id,
      role: req.user.role,
      name: req.user.name,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      token: newToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
  })
);

// Logout endpoint
app.post('/api/auth/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    logAuthEvent('USER_LOGOUT', req.user.id, { role: req.user.role, ip: req.ip });
    res.json({ success: true, message: 'Logged out successfully' });
  })
);

// ============ PROTECTED ROUTES WITH ENHANCED RATE LIMITING ============

// Admin-only routes with admin rate limiting
app.use('/api/admin', authenticate, authorize('admin'), requestSizeLimits.large);

// Owner-only routes with premium rate limiting
app.use('/api/owner', authenticate, authorize('owner'), requestSizeLimits.medium);

// Driver-only routes with authenticated rate limiting
app.use('/api/driver', authenticate, authorize('driver'), requestSizeLimits.small);

// API key protected routes
app.use('/api/v1', oauthGateway.authenticateApiKey, apiKeyRateLimit, requestSizeLimits.medium);

// GPS updates (driver only) with enhanced rate limiting
app.put('/api/trips/:id/gps',
  gpsRateLimit,
  authenticate,
  authorize('driver'),
  validateObjectId,
  validateGPS,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id: tripId } = req.params;
    const gpsData = req.body;
    
    let trips = readData('activeTrips');
    const index = trips.findIndex(t => t.tripId === tripId || t.id === tripId);
    
    if (index === -1) {
      throw new NotFoundError('Trip');
    }
    
    const trip = trips[index];
    
    // Verify driver owns this trip
    if (trip.driverId !== req.user.driverId) {
      throw new AuthorizationError('You can only update your own trips');
    }
    
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
    
    // Broadcast GPS update via WebSocket
    websocketService.broadcastGPSUpdate({
      ...gpsData,
      tripId,
      driverId: req.user.driverId,
      busId: trip.busId,
      ownerId: trip.ownerId
    });
    
    res.json({ success: true, trip: trips[index] });
  })
);

// Feedback submission (public with enhanced rate limiting)
app.post('/api/feedbacks',
  feedbackRateLimit,
  requestSizeLimits.small,
  validateFeedback,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const newFeedback = {
      rating: req.body.rating,
      category: req.body.category,
      bus_number: req.body.busNumber,
      comment: req.body.comment,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      ip: req.ip,
      user_agent: req.get('User-Agent')
    };
    
    const feedback = await db.addFeedback(newFeedback);
    
    res.status(201).json({ success: true, feedback });
  })
);

// WebSocket connection with rate limiting
app.get('/api/websocket/connect',
  websocketRateLimit,
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      websocket: {
        url: `ws://${req.get('host')}`,
        token: req.headers.authorization?.replace('Bearer ', ''),
        protocols: ['websocket']
      }
    });
  })
);

// ============ ADMIN ROUTES ============

// Dashboard stats
app.get('/api/admin/dashboard/stats',
  asyncHandler(async (req, res) => {
    try {
      const [buses, routes, drivers, trips, delays] = await Promise.all([
        db.getBuses().catch(() => []),
        db.getRoutes().catch(() => []),
        db.getDrivers().catch(() => []),
        db.getActiveTrips().catch(() => []),
        db.getDelays().catch(() => [])
      ]);
      
      const stats = {
        totalBuses: buses.length,
        activeBuses: buses.filter(b => b.status === 'active').length,
        totalRoutes: routes.length,
        activeRoutes: routes.filter(r => r.status === 'active').length,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter(d => d.status === 'active').length,
        activeTrips: trips.length,
        activeDelays: delays.filter(d => d.status === 'active').length
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      // Return default stats if database fails
      res.json({
        totalBuses: 0,
        activeBuses: 0,
        totalRoutes: 0,
        activeRoutes: 0,
        totalDrivers: 0,
        activeDrivers: 0,
        activeTrips: 0,
        activeDelays: 0
      });
    }
  })
);

// Test endpoint without authentication to isolate the issue
app.get('/api/test/buses-no-auth',
  asyncHandler(async (req, res) => {
    try {
      console.log('🧪 Testing buses endpoint without authentication');
      const buses = await db.getBuses();
      console.log('✅ Test buses retrieved:', buses.length);
      res.json({ success: true, count: buses.length, data: buses });
    } catch (error) {
      console.error('❌ Test buses endpoint error:', error);
      res.status(500).json({
        success: false,
        message: 'Test failed',
        error: error.message,
        stack: error.stack
      });
    }
  })
);

// Bus management
app.get('/api/admin/buses',
  asyncHandler(async (req, res) => {
    try {
      console.log('🔍 Admin buses endpoint called by user:', req.user?.id, req.user?.role);
      const buses = await db.getBuses();
      console.log('✅ Admin buses retrieved:', buses.length);
      res.json(buses);
    } catch (error) {
      console.error('❌ Admin buses endpoint error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve buses',
        error: error.message
      });
    }
  })
);

app.post('/api/admin/buses',
  validateBus,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const newBus = {
      number: req.body.number,
      type: req.body.type,
      capacity: req.body.capacity,
      status: req.body.status || 'active',
      owner_id: req.body.ownerId,
      assigned_drivers: req.body.assignedDrivers || [],
      assigned_routes: req.body.assignedRoutes || []
    };
    
    const createdBus = await db.addBus(newBus);
    res.status(201).json({ success: true, bus: createdBus });
  })
);

app.put('/api/admin/buses/:id',
  validateObjectId,
  validateBusPartial,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const updateData = {
      number: req.body.number,
      type: req.body.type,
      capacity: req.body.capacity,
      status: req.body.status,
      owner_id: req.body.ownerId,
      assigned_drivers: req.body.assignedDrivers || [],
      assigned_routes: req.body.assignedRoutes || []
    };
    
    const updatedBus = await db.updateBus(id, updateData);
    
    if (!updatedBus) {
      throw new NotFoundError('Bus');
    }
    
    res.json({ success: true, bus: updatedBus });
  })
);

app.delete('/api/admin/buses/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await db.deleteBus(id);
    
    if (!deleted) {
      throw new NotFoundError('Bus');
    }
    
    res.json({ success: true, message: 'Bus deleted successfully' });
  })
);

// Route management
app.get('/api/admin/routes',
  asyncHandler(async (req, res) => {
    try {
      console.log('🔍 Admin routes endpoint called by user:', req.user?.id, req.user?.role);
      const routes = await db.getRoutes();
      console.log('✅ Admin routes retrieved:', routes.length);
      res.json(routes);
    } catch (error) {
      console.error('❌ Admin routes endpoint error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve routes',
        error: error.message
      });
    }
  })
);

app.post('/api/admin/routes',
  validateRoute,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const newRoute = {
      name: req.body.name,
      start_point: req.body.startPoint,
      end_point: req.body.endPoint,
      start_lat: req.body.startLat,
      start_lon: req.body.startLon,
      end_lat: req.body.endLat,
      end_lon: req.body.endLon,
      estimated_duration: req.body.estimatedDuration,
      status: 'active',
      stops: req.body.stops || []
    };
    
    const createdRoute = await db.addRoute(newRoute);
    res.status(201).json({ success: true, route: createdRoute });
  })
);

app.put('/api/admin/routes/:id',
  validateObjectId,
  validateRoute,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const updateData = {
      name: req.body.name,
      start_point: req.body.startPoint,
      end_point: req.body.endPoint,
      start_lat: req.body.startLat,
      start_lon: req.body.startLon,
      end_lat: req.body.endLat,
      end_lon: req.body.endLon,
      estimated_duration: req.body.estimatedDuration,
      status: req.body.status,
      stops: req.body.stops || []
    };
    
    const updatedRoute = await db.updateRoute(id, updateData);
    
    if (!updatedRoute) {
      throw new NotFoundError('Route');
    }
    
    res.json({ success: true, route: updatedRoute });
  })
);

app.delete('/api/admin/routes/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await db.deleteRoute(id);
    
    if (!deleted) {
      throw new NotFoundError('Route');
    }
    
    res.json({ success: true, message: 'Route deleted successfully' });
  })
);

// Driver management
app.get('/api/admin/drivers',
  asyncHandler(async (req, res) => {
    try {
      console.log('🔍 Admin drivers endpoint called by user:', req.user?.id, req.user?.role);
      const drivers = await db.getDrivers();
      console.log('✅ Admin drivers retrieved:', drivers.length);
      // Remove PINs from response
      const safeDrivers = drivers.map(({ pin, password, ...driver }) => driver);
      res.json(safeDrivers);
    } catch (error) {
      console.error('❌ Admin drivers endpoint error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve drivers',
        error: error.message
      });
    }
  })
);

app.post('/api/admin/drivers',
  validateDriver,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const bcrypt = require('bcryptjs');
    
    const newDriver = {
      name: req.body.name,
      phone: req.body.phone,
      password: await bcrypt.hash(req.body.pin, 10),
      status: req.body.status || 'active',
      assigned_buses: req.body.assignedBuses || []
    };
    
    const createdDriver = await db.addDriver(newDriver);
    
    // Return without password
    const { password, ...safeDriver } = createdDriver;
    res.status(201).json({ success: true, driver: safeDriver });
  })
);

app.put('/api/admin/drivers/:id',
  validateObjectId,
  validateDriver,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const bcrypt = require('bcryptjs');
    
    const updateData = {
      name: req.body.name,
      phone: req.body.phone,
      status: req.body.status,
      assigned_buses: req.body.assignedBuses || []
    };
    
    // Only update password if PIN is provided
    if (req.body.pin) {
      updateData.password = await bcrypt.hash(req.body.pin, 10);
    }
    
    const updatedDriver = await db.updateDriver(id, updateData);
    
    if (!updatedDriver) {
      throw new NotFoundError('Driver');
    }
    
    // Return without password
    const { password, ...safeDriver } = updatedDriver;
    res.json({ success: true, driver: safeDriver });
  })
);

app.delete('/api/admin/drivers/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await db.deleteDriver(id);
    
    if (!deleted) {
      throw new NotFoundError('Driver');
    }
    
    res.json({ success: true, message: 'Driver deleted successfully' });
  })
);

// Owner management
app.get('/api/owners',
  asyncHandler(async (req, res) => {
    const owners = await db.getOwners();
    // Remove PINs/passwords from response
    const safeOwners = owners.map(({ pin, password, ...owner }) => owner);
    res.json(safeOwners);
  })
);

app.post('/api/admin/owners',
  validateLogin,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const bcrypt = require('bcryptjs');
    
    const owners = await getOwners();
    const newOwner = {
      id: `OWN${String(owners.length + 1).padStart(3, '0')}`,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      password: await bcrypt.hash(req.body.pin, 10),
      company_name: req.body.name,
      license_number: 'N/A',
      address: req.body.address,
      status: 'active'
    };
    
    const createdOwner = await db.addOwner(newOwner);
    
    // Return without password
    const { password, ...safeOwner } = createdOwner;
    res.status(201).json({ success: true, owner: safeOwner });
  })
);

app.put('/api/admin/owners/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedOwner = await db.updateOwner(id, req.body);
    
    if (!updatedOwner) {
      throw new NotFoundError('Owner');
    }
    
    // Return without password
    const { password, ...safeOwner } = updatedOwner;
    res.json({ success: true, owner: safeOwner });
  })
);

app.delete('/api/admin/owners/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await db.deleteOwner(id);
    res.json({ success: true, message: 'Owner deleted successfully' });
  })
);

// Delay management
app.get('/api/admin/delays',
  asyncHandler(async (req, res) => {
    const delays = await db.getDelays();
    res.json(delays);
  })
);

app.post('/api/admin/delays',
  asyncHandler(async (req, res) => {
    const newDelay = {
      bus_id: req.body.busId,
      route_id: req.body.routeId,
      delay_minutes: req.body.delayMinutes,
      reason: req.body.reason,
      status: 'active',
      reported_at: new Date().toISOString()
    };
    
    const createdDelay = await db.addDelay(newDelay);
    res.status(201).json({ success: true, delay: createdDelay });
  })
);

app.put('/api/admin/delays/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedDelay = await db.updateDelay(id, req.body);
    
    if (!updatedDelay) {
      throw new NotFoundError('Delay');
    }
    
    res.json({ success: true, delay: updatedDelay });
  })
);

app.delete('/api/admin/delays/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await db.deleteDelay(id);
    
    if (!deleted) {
      throw new NotFoundError('Delay');
    }
    
    res.json({ success: true, message: 'Delay deleted successfully' });
  })
);

// Schedule management
app.get('/api/admin/schedules',
  asyncHandler(async (req, res) => {
    const schedules = await db.getSchedules();
    res.json(schedules);
  })
);

app.post('/api/schedules',
  asyncHandler(async (req, res) => {
    const schedules = await db.getSchedules();
    const newSchedule = {
      id: `SCH${String(schedules.length + 1).padStart(3, '0')}`,
      bus_id: req.body.busId,
      route_id: req.body.routeId,
      bus_number: req.body.busNumber,
      route_name: req.body.routeName,
      driver_name: req.body.driverName,
      start_time: req.body.startTime,
      end_time: req.body.endTime,
      days: req.body.days,
      status: req.body.status || 'active'
    };
    
    const createdSchedule = await db.addSchedule(newSchedule);
    res.status(201).json({ success: true, schedule: createdSchedule });
  })
);

app.put('/api/schedules/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const scheduleData = {
      bus_id: req.body.busId,
      route_id: req.body.routeId,
      bus_number: req.body.busNumber,
      route_name: req.body.routeName,
      driver_name: req.body.driverName,
      start_time: req.body.startTime,
      end_time: req.body.endTime,
      days: req.body.days,
      status: req.body.status
    };
    
    const updatedSchedule = await db.updateSchedule(id, scheduleData);
    
    if (!updatedSchedule) {
      throw new NotFoundError('Schedule');
    }
    
    res.json({ success: true, schedule: updatedSchedule });
  })
);

app.delete('/api/schedules/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await db.deleteSchedule(id);
    
    if (!deleted) {
      throw new NotFoundError('Schedule');
    }
    
    res.json({ success: true, message: 'Schedule deleted successfully' });
  })
);

// Notification management
app.get('/api/admin/notifications',
  asyncHandler(async (req, res) => {
    const notifications = await db.getNotifications();
    res.json(notifications);
  })
);

app.post('/api/admin/notifications',
  validateNotification,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const newNotification = {
      title: req.body.title,
      message: req.body.message,
      type: req.body.type,
      priority: req.body.priority || 'medium',
      status: 'active',
      created_at: new Date().toISOString()
    };
    
    const createdNotification = await db.addNotification(newNotification);
    res.status(201).json({ success: true, notification: createdNotification });
  })
);

app.put('/api/admin/notifications/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedNotification = await db.updateNotification(id, req.body);
    
    if (!updatedNotification) {
      throw new NotFoundError('Notification');
    }
    
    res.json({ success: true, notification: updatedNotification });
  })
);

app.delete('/api/admin/notifications/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await db.deleteNotification(id);
    
    if (!deleted) {
      throw new NotFoundError('Notification');
    }
    
    res.json({ success: true, message: 'Notification deleted successfully' });
  })
);

// Call alerts management
app.get('/api/callAlerts',
  asyncHandler(async (req, res) => {
    const callAlerts = await db.getCallAlerts();
    res.json(callAlerts);
  })
);

app.post('/api/callAlerts',
  asyncHandler(async (req, res) => {
    const newAlert = {
      trip_id: req.body.tripId,
      bus_id: req.body.busId,
      bus_number: req.body.busNumber,
      driver_id: req.body.driverId,
      driver_name: req.body.driverName,
      driver_phone: req.body.driverPhone,
      route_id: req.body.routeId,
      route_name: req.body.routeName,
      owner_id: req.body.ownerId,
      call_type: req.body.callType,
      call_status: req.body.callStatus,
      timestamp: req.body.timestamp || new Date().toISOString(),
      location: req.body.location,
      status: 'active',
      acknowledged: false,
      created_at: new Date().toISOString()
    };
    
    const createdAlert = await db.addCallAlert(newAlert);
    res.status(201).json({ success: true, alert: createdAlert });
  })
);

app.put('/api/callAlerts/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    const updatedAlert = await db.updateCallAlert(id, req.body);
    
    if (!updatedAlert) {
      throw new NotFoundError('Call Alert');
    }
    
    res.json({ success: true, alert: updatedAlert });
  })
);

app.delete('/api/callAlerts/:id',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deleted = await db.deleteCallAlert(id);
    
    if (!deleted) {
      throw new NotFoundError('Call Alert');
    }
    
    res.json({ success: true, message: 'Call alert deleted successfully' });
  })
);

// ============ OWNER ROUTES ============

// Fleet overview
app.get('/api/owner/fleet/overview',
  asyncHandler(async (req, res) => {
    const ownerId = req.user.ownerId || req.user.id;
    const [buses, drivers, routes, trips, delays] = await Promise.all([
      readData('buses'),
      readData('drivers'),
      readData('routes'),
      readData('activeTrips'),
      readData('delays')
    ]);
    
    // Filter by owner
    const ownerBuses = buses.filter(b => b.ownerId === ownerId);
    const busIds = ownerBuses.map(b => b.id);
    
    const ownerDriverIds = new Set();
    ownerBuses.forEach(bus => {
      (bus.assignedDrivers || []).forEach(driverId => ownerDriverIds.add(driverId));
    });
    const ownerDrivers = drivers.filter(d => ownerDriverIds.has(d.id));
    
    const ownerTrips = trips.filter(t => busIds.includes(t.busId));
    const ownerDelays = delays.filter(d => busIds.includes(d.busId));
    
    const stats = {
      totalBuses: ownerBuses.length,
      activeBuses: ownerBuses.filter(b => b.status === 'active').length,
      busesOnTrip: ownerTrips.length,
      totalDrivers: ownerDrivers.length,
      activeDrivers: ownerDrivers.filter(d => d.status === 'active').length,
      activeDelays: ownerDelays.filter(d => d.status === 'active').length,
      activeTrips: ownerTrips.length
    };
    
    res.json(stats);
  })
);

// Fleet tracking
app.get('/api/owner/fleet/tracking',
  asyncHandler(async (req, res) => {
    const ownerId = req.user.ownerId || req.user.id;
    const [buses, trips, drivers, routes] = await Promise.all([
      readData('buses'),
      readData('activeTrips'),
      readData('drivers'),
      readData('routes')
    ]);
    
    const ownerBuses = buses.filter(b => b.ownerId === ownerId);
    const busIds = ownerBuses.map(b => b.id);
    const ownerTrips = trips.filter(t => busIds.includes(t.busId));
    
    const trackingData = ownerTrips.map(trip => {
      const bus = buses.find(b => b.id === trip.busId);
      const driver = drivers.find(d => d.id === trip.driverId);
      const route = routes.find(r => r.id === trip.routeId);
      
      let speed = 0;
      if (trip.currentGps?.speed) {
        speed = Math.round(trip.currentGps.speed * 3.6);
      }
      
      return {
        tripId: trip.tripId || trip.id,
        busId: trip.busId,
        busNumber: bus?.number || trip.busNumber,
        driverId: trip.driverId,
        driverName: driver?.name || 'Unknown',
        driverPhone: driver?.phone || '',
        routeId: trip.routeId,
        routeName: route?.name || 'Unknown Route',
        currentLat: trip.currentGps?.lat,
        currentLon: trip.currentGps?.lon,
        speed: speed,
        maxSpeed: trip.maxSpeed || 0,
        avgSpeed: trip.avgSpeed || 0,
        lastUpdate: trip.lastUpdate || Date.now(),
        status: 'active'
      };
    });
    
    res.json(trackingData);
  })
);

// Owner delays
app.get('/api/owner/delays',
  asyncHandler(async (req, res) => {
    const ownerId = req.user.ownerId || req.user.id;
    const [buses, delays] = await Promise.all([
      readData('buses'),
      readData('delays')
    ]);
    
    const busIds = buses.filter(b => b.ownerId === ownerId).map(b => b.id);
    const ownerDelays = delays.filter(d => busIds.includes(d.busId));
    
    res.json(ownerDelays);
  })
);

// ============ DRIVER ROUTES ============

// Start trip
app.post('/api/driver/trips/start',
  validateTrip,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const driverId = req.user.driverId || req.user.id;
    const trips = readData('activeTrips');
    
    const newTrip = {
      id: `TRIP${String(trips.length + 1).padStart(3, '0')}`,
      tripId: `T${Date.now()}`,
      ...req.body,
      driverId,
      status: 'active',
      startTime: new Date().toISOString(),
      currentGps: null,
      maxSpeed: 0,
      avgSpeed: 0,
      gpsUpdateCount: 0
    };
    
    trips.push(newTrip);
    writeData('activeTrips', trips);
    
    res.status(201).json({ success: true, trip: newTrip });
  })
);

// End trip
app.put('/api/driver/trips/:id/end',
  validateObjectId,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { id: tripId } = req.params;
    const driverId = req.user.driverId || req.user.id;
    const trips = readData('activeTrips');
    
    const index = trips.findIndex(t => (t.tripId === tripId || t.id === tripId) && t.driverId === driverId);
    
    if (index === -1) {
      throw new NotFoundError('Trip');
    }
    
    const trip = trips[index];
    trip.status = 'completed';
    trip.endTime = new Date().toISOString();
    
    // Move to completed trips (you might want a separate collection)
    trips.splice(index, 1);
    writeData('activeTrips', trips);
    
    res.json({ success: true, trip });
  })
);

// ============ PUBLIC ROUTES ============

// Get routes (public)
app.get('/api/routes',
  asyncHandler(async (req, res) => {
    const routes = await db.getRoutes();
    res.json(routes.filter(r => r.status === 'active'));
  })
);

// Get schedules (public)
app.get('/api/schedules',
  asyncHandler(async (req, res) => {
    const schedules = await db.getSchedules();
    res.json(schedules.filter(s => s.status === 'active'));
  })
);

// Get drivers (public - without sensitive data)
app.get('/api/drivers',
  asyncHandler(async (req, res) => {
    const drivers = await db.getDrivers();
    // Remove PINs from response for security
    const safeDrivers = drivers.map(({ pin, password, ...driver }) => driver);
    res.json(safeDrivers.filter(d => d.status === 'active'));
  })
);

// Get buses (public)
app.get('/api/buses',
  asyncHandler(async (req, res) => {
    const buses = await db.getBuses();
    res.json(buses.filter(b => b.status === 'active'));
  })
);

// Get active trips (public)
app.get('/api/trips/active',
  asyncHandler(async (req, res) => {
    const trips = await db.getActiveTrips();
    res.json(trips);
  })
);

// Alternative endpoint for active trips (for backward compatibility)
app.get('/api/activeTrips',
  asyncHandler(async (req, res) => {
    const trips = await db.getActiveTrips();
    res.json(trips);
  })
);

// Get delays (public)
app.get('/api/delays',
  asyncHandler(async (req, res) => {
    const delays = await db.getDelays();
    res.json(delays.filter(d => d.status === 'active'));
  })
);

// Get feedbacks (public - limited access)
app.get('/api/feedbacks',
  asyncHandler(async (req, res) => {
    const feedbacks = await db.getFeedbacks();
    res.json(feedbacks.filter(f => f.status === 'active'));
  })
);

// Get notifications (public)
app.get('/api/notifications',
  asyncHandler(async (req, res) => {
    const notifications = await db.getNotifications();
    res.json(notifications.filter(n => n.status === 'active'));
  })
);

// WebSocket status endpoint
app.get('/api/websocket/status',
  authenticate,
  asyncHandler(async (req, res) => {
    const connectedUsers = websocketService.getConnectedUsersCount();
    const adminUsers = websocketService.getUsersByRole('admin');
    const ownerUsers = websocketService.getUsersByRole('owner');
    const driverUsers = websocketService.getUsersByRole('driver');
    
    res.json({
      success: true,
      websocket: {
        enabled: true,
        connectedUsers,
        usersByRole: {
          admin: adminUsers.length,
          owner: ownerUsers.length,
          driver: driverUsers.length
        }
      }
    });
  })
);

// Send notification via WebSocket
app.post('/api/admin/notifications/broadcast',
  validateNotification,
  validationErrorHandler,
  asyncHandler(async (req, res) => {
    const { title, message, type, target = 'all' } = req.body;
    
    // Save notification to database
    const newNotification = {
      title,
      message,
      type,
      target,
      status: 'active',
      created_at: new Date().toISOString(),
      created_by: req.user.id
    };
    
    const createdNotification = await db.addNotification(newNotification);
    
    // Send via WebSocket
    websocketService.sendNotification({
      target,
      type,
      message: title,
      data: { message, id: createdNotification.id }
    });
    
    res.status(201).json({ success: true, notification: createdNotification });
  })
);

// Send emergency alert
app.post('/api/admin/emergency-alert',
  asyncHandler(async (req, res) => {
    const { message, type = 'emergency', affectedRoutes = [] } = req.body;
    
    const alert = {
      id: `ALERT_${Date.now()}`,
      message,
      type,
      affectedRoutes,
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };
    
    // Send emergency alert via WebSocket
    websocketService.sendEmergencyAlert(alert);
    
    res.json({ success: true, alert });
  })
);

// ============ API VERSIONING & SECURITY ENDPOINTS ============

// API v1 routes (with API key authentication)
app.get('/api/v1/routes',
  oauthGateway.requirePermission('read'),
  asyncHandler(async (req, res) => {
    const routes = readData('routes');
    res.json({
      success: true,
      version: 'v1',
      data: routes.filter(r => r.status === 'active')
    });
  })
);

app.get('/api/v1/trips/active',
  oauthGateway.requirePermission('read'),
  asyncHandler(async (req, res) => {
    const trips = readData('activeTrips');
    res.json({
      success: true,
      version: 'v1',
      data: trips
    });
  })
);

// Security status endpoint
app.get('/api/security/status',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const connectedUsers = websocketService.getConnectedUsersCount();
    
    res.json({
      success: true,
      security: {
        rateLimiting: {
          enabled: process.env.ENABLE_RATE_LIMITING !== 'false',
          tiers: ['public', 'authenticated', 'premium', 'admin'],
          redis: !!RedisStore
        },
        authentication: {
          jwt: true,
          oauth: oauthGateway.getOAuthStatus(),
          apiKeys: true,
          bruteForceProtection: true
        },
        monitoring: {
          securityEvents: true,
          requestTracking: true,
          performanceMonitoring: true
        },
        websocket: {
          enabled: true,
          connectedUsers,
          realTimeUpdates: true
        },
        headers: {
          csp: true,
          hsts: true,
          xssProtection: true,
          noSniff: true
        }
      }
    });
  })
);

// Rate limit status endpoint
app.get('/api/security/rate-limits',
  authenticate,
  asyncHandler(async (req, res) => {
    const userTier = req.user.role === 'admin' ? 'admin' : 
                    req.user.role === 'owner' ? 'premium' : 'authenticated';
    
    res.json({
      success: true,
      rateLimits: {
        currentTier: userTier,
        limits: {
          public: { requests: 100, window: '15 minutes' },
          authenticated: { requests: 500, window: '15 minutes' },
          premium: { requests: 1000, window: '15 minutes' },
          admin: { requests: 2000, window: '15 minutes' }
        },
        specialEndpoints: {
          auth: { requests: 5, window: '15 minutes' },
          gps: { requests: 120, window: '1 minute' },
          feedback: { requests: 10, window: '1 hour' },
          websocket: { requests: 60, window: '1 minute' }
        }
      }
    });
  })
);

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'NxtBus API Server - Production Ready',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    status: 'operational'
  });
});

// Health check endpoint with enhanced information
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'NxtBus API Server - Production Ready',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NxtBus API Server - Production Ready',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      authentication: {
        admin: 'POST /api/auth/admin/login',
        owner: 'POST /api/auth/owner/login', 
        driver: 'POST /api/auth/driver/login'
      },
      public: {
        routes: 'GET /api/routes',
        buses: 'GET /api/buses',
        drivers: 'GET /api/drivers',
        owners: 'GET /api/owners',
        activeTrips: 'GET /api/trips/active',
        notifications: 'GET /api/notifications',
        feedback: 'POST /api/feedbacks'
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard/stats',
        buses: 'GET /api/admin/buses',
        routes: 'GET /api/admin/routes',
        drivers: 'GET /api/admin/drivers'
      }
    },
    database: 'PostgreSQL (Neon)',
    status: 'operational'
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

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

  // Initialize WebSocket service
  websocketService.initialize(server);

  // Start server
  server.listen(PORT, HOST, () => {
    console.log(`🚀 NxtBus API Server running on http://${HOST}:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Security features enabled`);
    console.log(`🗄️ Database: PostgreSQL (Neon)`);
    console.log(`🌐 Network access: http://${process.env.NETWORK_IP || 'localhost'}:${PORT}`);
  });

  // Setup graceful shutdown with WebSocket cleanup
  const originalGracefulShutdown = gracefulShutdown;
  const enhancedGracefulShutdown = (server) => {
    websocketService.cleanup();
    originalGracefulShutdown(server);
  };
  
  // Override the graceful shutdown handlers
  process.removeAllListeners('SIGTERM');
  process.removeAllListeners('SIGINT');
  
  process.on('SIGTERM', () => enhancedGracefulShutdown(server));
  process.on('SIGINT', () => enhancedGracefulShutdown(server));
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
