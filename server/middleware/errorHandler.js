/**
 * Comprehensive Error Handling Middleware for NxtBus
 * Handles all types of errors with proper logging and user-friendly responses
 */

const { logError, logSecurityEvent } = require('../utils/logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Error response formatter
const formatErrorResponse = (error, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const baseResponse = {
    success: false,
    message: error.message,
    code: error.code || 'INTERNAL_ERROR',
    timestamp: error.timestamp || new Date().toISOString(),
    path: req.path,
    method: req.method
  };
  
  // Add additional info in development
  if (isDevelopment) {
    baseResponse.stack = error.stack;
    baseResponse.details = {
      statusCode: error.statusCode,
      isOperational: error.isOperational
    };
  }
  
  // Add validation errors if present
  if (error.errors && Array.isArray(error.errors)) {
    baseResponse.errors = error.errors;
  }
  
  return baseResponse;
};

// Handle specific error types
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new ValidationError(message);
};

const handleDuplicateFieldsError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const message = `${field} already exists`;
  return new ConflictError(message);
};

const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => ({
    field: err.path,
    message: err.message,
    value: err.value
  }));
  return new ValidationError('Validation failed', errors);
};

const handleJWTError = () => {
  return new AuthenticationError('Invalid token. Please log in again.');
};

const handleJWTExpiredError = () => {
  return new AuthenticationError('Token expired. Please log in again.');
};

// Main error handling middleware
const errorHandler = (error, req, res, next) => {
  let err = { ...error };
  err.message = error.message;
  
  // Log the error
  logError(error, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.body,
    query: req.query,
    params: req.params
  });
  
  // Handle specific error types
  if (error.name === 'CastError') err = handleCastError(error);
  if (error.code === 11000) err = handleDuplicateFieldsError(error);
  if (error.name === 'ValidationError') err = handleValidationError(error);
  if (error.name === 'JsonWebTokenError') err = handleJWTError();
  if (error.name === 'TokenExpiredError') err = handleJWTExpiredError();
  
  // Handle syntax errors (malformed JSON)
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    err = new ValidationError('Invalid JSON format');
  }
  
  // Handle CORS errors
  if (error.message && error.message.includes('CORS')) {
    logSecurityEvent('CORS_ERROR', {
      ip: req.ip,
      origin: req.get('Origin'),
      userAgent: req.get('User-Agent')
    });
    err = new AuthorizationError('CORS policy violation');
  }
  
  // Default to 500 server error
  if (!err.statusCode) {
    err = new AppError('Something went wrong', 500, 'INTERNAL_ERROR', false);
  }
  
  // Security: Don't leak sensitive information in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    err.message = 'Something went wrong';
    err.code = 'INTERNAL_ERROR';
  }
  
  // Send error response
  res.status(err.statusCode).json(formatErrorResponse(err, req));
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Graceful shutdown handler
const gracefulShutdown = (server) => {
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close((err) => {
      if (err) {
        console.error('Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('Server closed successfully');
      process.exit(0);
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
  logError(new Error('Unhandled Promise Rejection'), { reason, promise });
  
  // Close server gracefully
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logError(error, { type: 'uncaughtException' });
  
  // Close server gracefully
  process.exit(1);
});

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  gracefulShutdown
};