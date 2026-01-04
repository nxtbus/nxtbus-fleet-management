/**
 * Input Validation Middleware for NxtBus
 * Comprehensive validation schemas for all API endpoints
 */

const { body, param, query, validationResult } = require('express-validator');
const { logSecurityEvent } = require('../utils/logger');

// Common validation patterns
const patterns = {
  busNumber: /^[A-Z0-9]{2,10}$/,
  phone: /^[6-9]\d{9}$/,
  pin: /^\d{4}$/,
  coordinates: /^-?\d+\.?\d*$/,
  objectId: /^[A-Z]{3}\d{3}$/
};

// Sanitization helpers
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/[<>]/g, '');
};

const sanitizeNumber = (value) => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
};

// Custom validators
const isValidCoordinate = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= -180 && num <= 180;
};

const isValidCapacity = (value) => {
  const num = parseInt(value);
  return !isNaN(num) && num >= 10 && num <= 100;
};

const isValidSpeed = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 200;
};

// Authentication validation
const validateLogin = [
  body('phone')
    .matches(patterns.phone)
    .withMessage('Phone number must be a valid 10-digit Indian mobile number')
    .customSanitizer(sanitizeString),
  body('pin')
    .matches(patterns.pin)
    .withMessage('PIN must be exactly 4 digits')
    .customSanitizer(sanitizeString)
];

const validateAdminLogin = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .customSanitizer(sanitizeString),
  body('password')
    .isLength({ min: 6, max: 100 })
    .withMessage('Password must be between 6 and 100 characters')
    .customSanitizer(sanitizeString)
];

// Bus validation
const validateBus = [
  body('number')
    .matches(patterns.busNumber)
    .withMessage('Bus number must be 2-10 characters, letters and numbers only')
    .customSanitizer(sanitizeString),
  body('type')
    .isIn(['AC', 'Non-AC', 'Electric', 'Diesel'])
    .withMessage('Bus type must be AC, Non-AC, Electric, or Diesel'),
  body('capacity')
    .custom(isValidCapacity)
    .withMessage('Capacity must be between 10 and 100'),
  body('status')
    .isIn(['active', 'maintenance', 'inactive'])
    .withMessage('Status must be active, maintenance, or inactive'),
  body('ownerId')
    .optional()
    .matches(patterns.objectId)
    .withMessage('Owner ID must be in format ABC123')
    .customSanitizer(sanitizeString),
  body('assignedDrivers')
    .optional()
    .isArray()
    .withMessage('Assigned drivers must be an array'),
  body('assignedDrivers.*')
    .optional()
    .matches(patterns.objectId)
    .withMessage('Driver ID must be in format ABC123')
];

// Route validation
const validateRoute = [
  body('name')
    .isLength({ min: 3, max: 100 })
    .withMessage('Route name must be between 3 and 100 characters')
    .customSanitizer(sanitizeString),
  body('startPoint')
    .isLength({ min: 2, max: 100 })
    .withMessage('Start point must be between 2 and 100 characters')
    .customSanitizer(sanitizeString),
  body('endPoint')
    .isLength({ min: 2, max: 100 })
    .withMessage('End point must be between 2 and 100 characters')
    .customSanitizer(sanitizeString),
  body('startLat')
    .custom(isValidCoordinate)
    .withMessage('Start latitude must be a valid coordinate'),
  body('startLon')
    .custom(isValidCoordinate)
    .withMessage('Start longitude must be a valid coordinate'),
  body('endLat')
    .custom(isValidCoordinate)
    .withMessage('End latitude must be a valid coordinate'),
  body('endLon')
    .custom(isValidCoordinate)
    .withMessage('End longitude must be a valid coordinate'),
  body('estimatedDuration')
    .isInt({ min: 5, max: 300 })
    .withMessage('Estimated duration must be between 5 and 300 minutes'),
  body('stops')
    .optional()
    .isArray()
    .withMessage('Stops must be an array'),
  body('stops.*.name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Stop name must be between 2 and 100 characters')
    .customSanitizer(sanitizeString),
  body('stops.*.lat')
    .optional()
    .custom(isValidCoordinate)
    .withMessage('Stop latitude must be a valid coordinate'),
  body('stops.*.lon')
    .optional()
    .custom(isValidCoordinate)
    .withMessage('Stop longitude must be a valid coordinate')
];

// Driver validation
const validateDriver = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Driver name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Driver name can only contain letters and spaces')
    .customSanitizer(sanitizeString),
  body('phone')
    .matches(patterns.phone)
    .withMessage('Phone number must be a valid 10-digit Indian mobile number')
    .customSanitizer(sanitizeString),
  body('pin')
    .matches(patterns.pin)
    .withMessage('PIN must be exactly 4 digits')
    .customSanitizer(sanitizeString),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),
  body('assignedBuses')
    .optional()
    .isArray()
    .withMessage('Assigned buses must be an array'),
  body('assignedBuses.*')
    .optional()
    .matches(patterns.objectId)
    .withMessage('Bus ID must be in format ABC123')
];

// GPS/Location validation
const validateGPS = [
  body('lat')
    .custom(isValidCoordinate)
    .withMessage('Latitude must be a valid coordinate between -90 and 90'),
  body('lon')
    .custom(isValidCoordinate)
    .withMessage('Longitude must be a valid coordinate between -180 and 180'),
  body('speed')
    .optional()
    .custom(isValidSpeed)
    .withMessage('Speed must be between 0 and 200 km/h'),
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 })
    .withMessage('Heading must be between 0 and 360 degrees'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive number'),
  body('timestamp')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Timestamp must be a valid Unix timestamp')
];

// Trip validation
const validateTrip = [
  body('busId')
    .matches(patterns.objectId)
    .withMessage('Bus ID must be in format ABC123')
    .customSanitizer(sanitizeString),
  body('routeId')
    .matches(patterns.objectId)
    .withMessage('Route ID must be in format ABC123')
    .customSanitizer(sanitizeString),
  body('driverId')
    .matches(patterns.objectId)
    .withMessage('Driver ID must be in format ABC123')
    .customSanitizer(sanitizeString),
  body('busNumber')
    .optional()
    .matches(patterns.busNumber)
    .withMessage('Bus number must be 2-10 characters, letters and numbers only')
    .customSanitizer(sanitizeString)
];

// Feedback validation
const validateFeedback = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('category')
    .isIn(['cleanliness', 'punctuality', 'driver', 'crowding', 'facilities', 'other'])
    .withMessage('Category must be one of: cleanliness, punctuality, driver, crowding, facilities, other'),
  body('busNumber')
    .optional()
    .matches(patterns.busNumber)
    .withMessage('Bus number must be 2-10 characters, letters and numbers only')
    .customSanitizer(sanitizeString),
  body('comment')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters')
    .customSanitizer(sanitizeString)
];

// Notification validation
const validateNotification = [
  body('title')
    .isLength({ min: 5, max: 200 })
    .withMessage('Title must be between 5 and 200 characters')
    .customSanitizer(sanitizeString),
  body('message')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be between 10 and 1000 characters')
    .customSanitizer(sanitizeString),
  body('type')
    .isIn(['info', 'warning', 'alert', 'diversion'])
    .withMessage('Type must be info, warning, alert, or diversion'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high')
];

// Schedule validation
const validateSchedule = [
  body('busId')
    .matches(patterns.objectId)
    .withMessage('Bus ID must be in format ABC123')
    .customSanitizer(sanitizeString),
  body('routeId')
    .matches(patterns.objectId)
    .withMessage('Route ID must be in format ABC123')
    .customSanitizer(sanitizeString),
  body('driverId')
    .matches(patterns.objectId)
    .withMessage('Driver ID must be in format ABC123')
    .customSanitizer(sanitizeString),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('days')
    .isArray({ min: 1 })
    .withMessage('Days must be an array with at least one day'),
  body('days.*')
    .isIn(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    .withMessage('Days must be valid day abbreviations (Mon, Tue, etc.)')
];

// Parameter validation
const validateObjectId = [
  param('id')
    .matches(patterns.objectId)
    .withMessage('ID must be in format ABC123')
    .customSanitizer(sanitizeString)
];

// Query parameter validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Enhanced error handler with security logging
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log potential security issues
    const suspiciousPatterns = [
      /<script/i, /javascript:/i, /on\w+=/i, // XSS attempts
      /union\s+select/i, /drop\s+table/i, // SQL injection attempts
      /\.\.\//g, // Path traversal attempts
    ];
    
    const requestData = JSON.stringify({ body: req.body, query: req.query, params: req.params });
    const hasSuspiciousContent = suspiciousPatterns.some(pattern => pattern.test(requestData));
    
    if (hasSuspiciousContent) {
      logSecurityEvent('SUSPICIOUS_INPUT_DETECTED', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        errors: errors.array(),
        userId: req.user?.id
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      })),
      code: 'VALIDATION_ERROR'
    });
  }
  next();
}

module.exports = {
  validateLogin,
  validateAdminLogin,
  validateBus,
  validateRoute,
  validateDriver,
  validateGPS,
  validateTrip,
  validateFeedback,
  validateNotification,
  validateSchedule,
  validateObjectId,
  validatePagination,
  handleValidationErrors,
  patterns,
  sanitizeString,
  sanitizeNumber
};