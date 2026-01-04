/**
 * Authentication Middleware for NxtBus
 * Handles JWT tokens, password hashing, and role-based access
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    logger.error('Password hashing failed:', error);
    throw new Error('Password hashing failed');
  }
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Password comparison failed:', error);
    return false;
  }
}

/**
 * Generate JWT token
 */
function generateToken(payload) {
  try {
    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'nxtbus-server',
      audience: 'nxtbus-client'
    });
  } catch (error) {
    logger.error('Token generation failed:', error);
    throw new Error('Token generation failed');
  }
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'nxtbus-server',
      audience: 'nxtbus-client'
    });
  } catch (error) {
    logger.warn('Token verification failed:', error.message);
    return null;
  }
}

/**
 * Extract token from request headers
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Also check for token in cookies (for web clients)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  
  return null;
}

/**
 * Authentication middleware
 */
function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logger.warn('Authentication failed: No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN'
      });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      logger.warn('Authentication failed: Invalid token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        tokenPreview: token.substring(0, 20) + '...'
      });
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid token.',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Add user info to request
    req.user = decoded;
    req.userId = decoded.id;
    req.userRole = decoded.role;
    
    logger.debug('User authenticated successfully', {
      userId: decoded.id,
      role: decoded.role,
      path: req.path
    });
    
    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error occurred.',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Role-based authorization middleware
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        code: 'AUTH_REQUIRED'
      });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
}

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
      req.userId = decoded.id;
      req.userRole = decoded.role;
    }
  }
  
  next();
}

/**
 * Validation error handler
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation errors:', {
      errors: errors.array(),
      path: req.path,
      body: req.body
    });
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
}

/**
 * Rate limiting bypass for authenticated users
 */
function rateLimitBypass(req, res, next) {
  // Authenticated users get higher rate limits
  if (req.user) {
    req.rateLimitBypass = true;
  }
  next();
}

/**
 * Security headers middleware
 */
function securityHeaders(req, res, next) {
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  next();
}

/**
 * Create secure user session data (without sensitive info)
 */
function createUserSession(user, role) {
  const sessionData = {
    id: user.id,
    role: role,
    name: user.name,
    timestamp: Date.now()
  };
  
  // Add role-specific data
  switch (role) {
    case 'admin':
      sessionData.permissions = ['read', 'write', 'delete', 'manage'];
      break;
    case 'owner':
      sessionData.ownerId = user.id;
      sessionData.permissions = ['read', 'write'];
      break;
    case 'driver':
      sessionData.driverId = user.id;
      sessionData.phone = user.phone;
      sessionData.permissions = ['read', 'update_location'];
      break;
    default:
      sessionData.permissions = ['read'];
  }
  
  return sessionData;
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authenticate,
  authorize,
  optionalAuth,
  handleValidationErrors,
  rateLimitBypass,
  securityHeaders,
  createUserSession,
  extractToken
};