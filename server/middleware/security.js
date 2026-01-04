/**
 * Security Middleware for NxtBus
 * Rate limiting, security headers, and attack prevention
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { logSecurityEvent } = require('../utils/logger');

// Rate limiting configurations
const createRateLimit = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.id
      });
      
      res.status(429).json({
        success: false,
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    skip: (req) => {
      // Skip rate limiting for authenticated admin users in development
      if (process.env.NODE_ENV === 'development' && req.user?.role === 'admin') {
        return true;
      }
      return false;
    }
  });
};

// General API rate limiting
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiting for authentication endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 login attempts per windowMs
  'Too many login attempts from this IP, please try again later.',
  true // don't count successful requests
);

// GPS update rate limiting (higher limit for real-time data)
const gpsRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  60, // 60 GPS updates per minute
  'Too many GPS updates, please slow down.'
);

// Feedback rate limiting
const feedbackRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 feedback submissions per hour
  'Too many feedback submissions, please try again later.'
);

// Admin operations rate limiting
const adminRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  50, // 50 admin operations per 5 minutes
  'Too many admin operations, please slow down.'
);

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for mobile app compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request size limiting
const requestSizeLimit = (req, res, next) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxSize) {
    logSecurityEvent('REQUEST_TOO_LARGE', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      contentLength: req.headers['content-length']
    });
    
    return res.status(413).json({
      success: false,
      message: 'Request entity too large',
      code: 'REQUEST_TOO_LARGE'
    });
  }
  
  next();
};

// Suspicious activity detection
const suspiciousActivityDetection = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL Injection patterns
    /(\b(union|select|insert|delete|update|drop|create|alter|exec|execute)\b)/i,
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    // Path traversal patterns
    /\.\.\//g,
    /\.\.\\/g,
    // Command injection patterns
    /[;&|`$(){}[\]]/g
  ];
  
  const requestData = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
    headers: req.headers
  });
  
  const suspiciousActivity = suspiciousPatterns.some(pattern => pattern.test(requestData));
  
  if (suspiciousActivity) {
    logSecurityEvent('SUSPICIOUS_ACTIVITY_DETECTED', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      requestData: req.body,
      userId: req.user?.id
    });
    
    // Don't block the request, just log it for now
    // In production, you might want to block or require additional verification
  }
  
  next();
};

// IP whitelist/blacklist (for future use)
const ipFilter = (req, res, next) => {
  const clientIP = req.ip;
  
  // Example blacklist (can be loaded from database or config)
  const blacklistedIPs = process.env.BLACKLISTED_IPS ? 
    process.env.BLACKLISTED_IPS.split(',') : [];
  
  if (blacklistedIPs.includes(clientIP)) {
    logSecurityEvent('BLACKLISTED_IP_ACCESS_ATTEMPT', {
      ip: clientIP,
      userAgent: req.get('User-Agent'),
      path: req.path
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied',
      code: 'IP_BLOCKED'
    });
  }
  
  next();
};

// CORS configuration
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

// Security monitoring middleware
const securityMonitoring = (req, res, next) => {
  // Track failed authentication attempts
  res.on('finish', () => {
    if (req.path.includes('/auth/') && res.statusCode === 401) {
      logSecurityEvent('FAILED_AUTHENTICATION', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
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
        userId: req.user?.id
      });
    }
  });
  
  next();
};

// Brute force protection
const bruteForceProtection = new Map();

const checkBruteForce = (identifier, maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = `${identifier}_${req.ip}`;
    const now = Date.now();
    
    if (!bruteForceProtection.has(key)) {
      bruteForceProtection.set(key, { attempts: 0, lastAttempt: now });
    }
    
    const record = bruteForceProtection.get(key);
    
    // Reset if window has passed
    if (now - record.lastAttempt > windowMs) {
      record.attempts = 0;
      record.lastAttempt = now;
    }
    
    if (record.attempts >= maxAttempts) {
      logSecurityEvent('BRUTE_FORCE_DETECTED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        attempts: record.attempts
      });
      
      return res.status(429).json({
        success: false,
        message: 'Too many failed attempts. Please try again later.',
        code: 'BRUTE_FORCE_PROTECTION',
        retryAfter: Math.ceil(windowMs / 1000)
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
      }
    });
    
    next();
  };
};

module.exports = {
  generalRateLimit,
  authRateLimit,
  gpsRateLimit,
  feedbackRateLimit,
  adminRateLimit,
  securityHeaders,
  requestSizeLimit,
  suspiciousActivityDetection,
  ipFilter,
  corsOptions,
  securityMonitoring,
  checkBruteForce
};