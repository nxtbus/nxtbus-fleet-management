/**
 * Production-Ready Logging System for NxtBus
 * Uses Winston for structured logging with multiple transports
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'nxtbus-server' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Security events log
    new winston.transports.File({
      filename: path.join(logsDir, 'security.log'),
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Request logging middleware
function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    userRole: req.user?.role
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(logLevel, 'HTTP Response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
      userRole: req.user?.role
    });
  });
  
  next();
}

// Security event logger
function logSecurityEvent(event, details = {}) {
  logger.warn('Security Event', {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Authentication event logger
function logAuthEvent(event, userId, details = {}) {
  logger.info('Authentication Event', {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Database operation logger
function logDbOperation(operation, collection, details = {}) {
  logger.debug('Database Operation', {
    operation,
    collection,
    timestamp: new Date().toISOString(),
    ...details
  });
}

// Error handler with logging
function logError(error, context = {}) {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
}

// Performance monitoring
function logPerformance(operation, duration, details = {}) {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger.log(level, 'Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...details
  });
}

// System health logger
function logSystemHealth(metrics) {
  logger.info('System Health', {
    ...metrics,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  logger,
  requestLogger,
  logSecurityEvent,
  logAuthEvent,
  logDbOperation,
  logError,
  logPerformance,
  logSystemHealth
};