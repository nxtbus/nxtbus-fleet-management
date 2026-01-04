/**
 * Enhanced Security Middleware for NxtBus
 * Advanced rate limiting, DDoS protection, and OAuth gateway
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const { logSecurityEvent } = require('../utils/logger');

// Redis store for distributed rate limiting (optional)
let RedisStore;
try {
  const redisStore = require('rate-limit-redis');
  const Redis = require('ioredis');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1
  });
  
  RedisStore = redisStore;
  console.log('📦 Redis store available for distributed rate limiting');
} catch (error) {
  console.log('📦 Using memory store for rate limiting (Redis not available)');
}

// Advanced rate limiting configurations
const createAdvancedRateLimit = (config) => {
  const {
    windowMs,
    max,
    message,
    skipSuccessfulRequests = false,
    tier = 'standard',
    enableSlowDown = false
  } = config;

  const store = RedisStore ? new RedisStore({
    client: redis,
    prefix: `rl:${tier}:`
  }) : undefined;

  const limiter = rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      code: 'RATE_LIMIT_EXCEEDED',
      tier,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    store,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP with proper IPv6 handling
      if (req.user?.id) {
        return `user_${req.user.id}`;
      }
      // Use the built-in IP key generator for proper IPv6 support
      return req.ip;
    },
    handler: (req, res) => {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        tier,
        limit: max,
        window: windowMs
      });
      
      res.status(429).json({
        success: false,
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        tier,
        retryAfter: Math.ceil(windowMs / 1000),
        limit: max,
        window: windowMs
      });
    },
    skip: (req) => {
      // Skip rate limiting for authenticated admin users in development
      if (process.env.NODE_ENV === 'development' && req.user?.role === 'admin') {
        return true;
      }
      
      // Skip for whitelisted IPs
      const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
      return whitelist.includes(req.ip);
    }
  });

  // Add slow down middleware for gradual response delays
  if (enableSlowDown) {
    const slowDownMiddleware = slowDown({
      windowMs,
      delayAfter: Math.floor(max * 0.5), // Start slowing down at 50% of limit
      delayMs: () => 500, // Fixed delay of 500ms per request
      maxDelayMs: 20000, // Maximum delay of 20 seconds
      skipSuccessfulRequests,
      store,
      keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP with proper IPv6 handling
        if (req.user?.id) {
          return `user_${req.user.id}`;
        }
        // Use the built-in IP key generator for proper IPv6 support
        return req.ip || req.connection.remoteAddress || 'unknown';
      },
      validate: { delayMs: false } // Disable delayMs warning
    });

    return [slowDownMiddleware, limiter];
  }

  return limiter;
};

// Tier-based rate limiting
const tierLimits = {
  // Public endpoints - most restrictive
  public: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
    tier: 'public',
    enableSlowDown: true
  }),

  // Authenticated users - moderate limits
  authenticated: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per 15 minutes
    message: 'Rate limit exceeded for authenticated users.',
    tier: 'authenticated',
    skipSuccessfulRequests: true
  }),

  // Premium users (owners) - higher limits
  premium: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes
    message: 'Rate limit exceeded for premium users.',
    tier: 'premium',
    skipSuccessfulRequests: true
  }),

  // Admin users - highest limits
  admin: createAdvancedRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // 2000 requests per 15 minutes
    message: 'Rate limit exceeded for admin users.',
    tier: 'admin',
    skipSuccessfulRequests: true
  })
};

// Strict rate limiting for authentication endpoints
const authRateLimit = createAdvancedRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts from this IP, please try again later.',
  tier: 'auth',
  skipSuccessfulRequests: true,
  enableSlowDown: true
});

// GPS update rate limiting (higher limit for real-time data)
const gpsRateLimit = createAdvancedRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 GPS updates per minute (2 per second)
  message: 'Too many GPS updates, please slow down.',
  tier: 'gps'
});

// API key rate limiting
const apiKeyRateLimit = createAdvancedRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute for API keys
  message: 'API key rate limit exceeded.',
  tier: 'api_key',
  skipSuccessfulRequests: true
});

// Feedback rate limiting
const feedbackRateLimit = createAdvancedRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 feedback submissions per hour
  message: 'Too many feedback submissions, please try again later.',
  tier: 'feedback'
});

// WebSocket rate limiting
const websocketRateLimit = createAdvancedRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 WebSocket events per minute
  message: 'Too many WebSocket events, please slow down.',
  tier: 'websocket'
});

// Dynamic rate limiting based on user tier
const dynamicRateLimit = (req, res, next) => {
  if (!req.user) {
    // Public user
    return Array.isArray(tierLimits.public) ? 
      tierLimits.public[0](req, res, () => tierLimits.public[1](req, res, next)) :
      tierLimits.public(req, res, next);
  }

  switch (req.user.role) {
    case 'admin':
      return Array.isArray(tierLimits.admin) ? 
        tierLimits.admin[0](req, res, () => tierLimits.admin[1](req, res, next)) :
        tierLimits.admin(req, res, next);
    case 'owner':
      return Array.isArray(tierLimits.premium) ? 
        tierLimits.premium[0](req, res, () => tierLimits.premium[1](req, res, next)) :
        tierLimits.premium(req, res, next);
    case 'driver':
      return Array.isArray(tierLimits.authenticated) ? 
        tierLimits.authenticated[0](req, res, () => tierLimits.authenticated[1](req, res, next)) :
        tierLimits.authenticated(req, res, next);
    default:
      return Array.isArray(tierLimits.authenticated) ? 
        tierLimits.authenticated[0](req, res, () => tierLimits.authenticated[1](req, res, next)) :
        tierLimits.authenticated(req, res, next);
  }
};

// Enhanced security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'", "blob:"],
      manifestSrc: ["'self'"]
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Request size limiting with different tiers
const createRequestSizeLimit = (maxSize) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    
    if (contentLength > maxSize) {
      logSecurityEvent('REQUEST_TOO_LARGE', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        contentLength,
        maxSize,
        userId: req.user?.id
      });
      
      return res.status(413).json({
        success: false,
        message: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize,
        receivedSize: contentLength
      });
    }
    
    next();
  };
};

// Different size limits for different endpoints
const requestSizeLimits = {
  small: createRequestSizeLimit(1 * 1024 * 1024), // 1MB
  medium: createRequestSizeLimit(5 * 1024 * 1024), // 5MB
  large: createRequestSizeLimit(10 * 1024 * 1024), // 10MB
  xlarge: createRequestSizeLimit(50 * 1024 * 1024) // 50MB (for file uploads)
};

// Enhanced suspicious activity detection
const suspiciousActivityDetection = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL Injection patterns
    /(\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b)/i,
    /(\b(or|and)\s+\d+\s*=\s*\d+)/i,
    /(\'|\"|;|--|\*|\|)/g,
    
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    
    // Path traversal patterns
    /\.\.\//g,
    /\.\.\\/g,
    /\.\.%2f/gi,
    /\.\.%5c/gi,
    
    // Command injection patterns
    /[;&|`$(){}[\]]/g,
    /\b(cat|ls|pwd|whoami|id|uname|wget|curl)\b/gi,
    
    // NoSQL injection patterns
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$lt/gi,
    
    // LDAP injection patterns
    /\(\|\(/gi,
    /\)\(\|/gi
  ];
  
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      'user-agent': req.headers['user-agent'],
      'referer': req.headers['referer'],
      'x-forwarded-for': req.headers['x-forwarded-for']
    }
  });
  
  let suspiciousScore = 0;
  const detectedPatterns = [];
  
  suspiciousPatterns.forEach((pattern, index) => {
    if (pattern.test(requestData)) {
      suspiciousScore += 1;
      detectedPatterns.push(index);
    }
  });
  
  if (suspiciousScore > 0) {
    const severity = suspiciousScore >= 3 ? 'high' : suspiciousScore >= 2 ? 'medium' : 'low';
    
    logSecurityEvent('SUSPICIOUS_ACTIVITY_DETECTED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      suspiciousScore,
      detectedPatterns,
      severity,
      requestData: severity === 'high' ? requestData : undefined,
      userId: req.user?.id
    });
    
    // Block high-severity requests
    if (severity === 'high') {
      return res.status(403).json({
        success: false,
        message: 'Request blocked due to suspicious activity',
        code: 'SUSPICIOUS_ACTIVITY_BLOCKED'
      });
    }
  }
  
  next();
};

// Enhanced CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',') : 
      ['http://localhost:5173', 'http://localhost:3000'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logSecurityEvent('CORS_VIOLATION', {
        origin,
        allowedOrigins
      });
      callback(new Error('Not allowed by CORS'));
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
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'X-Request-ID'
  ],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

// Security monitoring middleware
const securityMonitoring = (req, res, next) => {
  // Add request ID for tracking
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  
  // Track failed authentication attempts
  res.on('finish', () => {
    if (req.path.includes('/auth/') && res.statusCode === 401) {
      logSecurityEvent('FAILED_AUTHENTICATION', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        requestId: req.requestId
      });
    }
    
    // Track 4xx and 5xx responses
    if (res.statusCode >= 400) {
      logSecurityEvent('HTTP_ERROR_RESPONSE', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        userId: req.user?.id,
        requestId: req.requestId
      });
    }
    
    // Track slow responses
    const responseTime = Date.now() - req.startTime;
    if (responseTime > 5000) { // 5 seconds
      logSecurityEvent('SLOW_RESPONSE', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        userId: req.user?.id,
        requestId: req.requestId
      });
    }
  });
  
  req.startTime = Date.now();
  next();
};

// Enhanced brute force protection
const bruteForceProtection = new Map();

const checkBruteForce = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000, blockDuration = 60 * 60 * 1000) => {
  return (req, res, next) => {
    const key = `${identifier}_${req.ip}`;
    const now = Date.now();
    
    if (!bruteForceProtection.has(key)) {
      bruteForceProtection.set(key, { 
        attempts: 0, 
        lastAttempt: now,
        blockedUntil: null
      });
    }
    
    const record = bruteForceProtection.get(key);
    
    // Check if currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      const remainingTime = Math.ceil((record.blockedUntil - now) / 1000);
      
      logSecurityEvent('BRUTE_FORCE_BLOCKED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        attempts: record.attempts,
        remainingTime,
        identifier
      });
      
      return res.status(429).json({
        success: false,
        message: 'Account temporarily blocked due to too many failed attempts.',
        code: 'BRUTE_FORCE_PROTECTION',
        blockedUntil: record.blockedUntil,
        remainingTime
      });
    }
    
    // Reset if window has passed
    if (now - record.lastAttempt > windowMs) {
      record.attempts = 0;
      record.lastAttempt = now;
      record.blockedUntil = null;
    }
    
    if (record.attempts >= maxAttempts) {
      record.blockedUntil = now + blockDuration;
      
      logSecurityEvent('BRUTE_FORCE_DETECTED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        attempts: record.attempts,
        blockedUntil: record.blockedUntil,
        identifier
      });
      
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Account blocked temporarily.',
        code: 'BRUTE_FORCE_PROTECTION',
        blockedUntil: record.blockedUntil,
        blockDuration
      });
    }
    
    // Increment attempts on failed requests
    res.on('finish', () => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        record.attempts++;
        record.lastAttempt = now;
      } else if (res.statusCode === 200) {
        // Reset on successful authentication
        record.attempts = 0;
        record.blockedUntil = null;
      }
    });
    
    next();
  };
};

module.exports = {
  // Rate limiting
  tierLimits,
  authRateLimit,
  gpsRateLimit,
  apiKeyRateLimit,
  feedbackRateLimit,
  websocketRateLimit,
  dynamicRateLimit,
  
  // Security
  securityHeaders,
  requestSizeLimits,
  suspiciousActivityDetection,
  corsOptions,
  securityMonitoring,
  checkBruteForce,
  
  // Utilities
  createAdvancedRateLimit,
  createRequestSizeLimit
};