/**
 * Central Error Handler Middleware
 * Implements Google-standard error handling patterns
 */

/**
 * Custom Application Error class
 */
class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * MongoDB/Mongoose error handler
 */
const handleDatabaseError = (err) => {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return new AppError(
      `Duplicate value for ${field}`,
      409,
      'DUPLICATE_ENTRY'
    );
  }
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return new AppError(
      `Validation failed: ${errors.join(', ')}`,
      422,
      'VALIDATION_ERROR'
    );
  }
  
  if (err.name === 'CastError') {
    return new AppError(
      `Invalid ${err.path}: ${err.value}`,
      422,
      'INVALID_ID'
    );
  }
  
  return err;
};

/**
 * API error handler
 */
const handleAPIError = (err) => {
  if (err.response) {
    const status = err.response.status;
    
    if (status === 429) {
      return new AppError(
        'API rate limit exceeded. Please try again later.',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
    
    if (status === 401) {
      return new AppError(
        'API authentication failed',
        500,
        'API_AUTH_FAILED'
      );
    }
    
    if (status >= 500) {
      return new AppError(
        'External API service error',
        503,
        'EXTERNAL_SERVICE_ERROR'
      );
    }
  }
  
  if (err.code === 'ECONNREFUSED') {
    return new AppError(
      'Unable to connect to external service',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }
  
  return err;
};

/**
 * Development error response
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: {
      message: err.message,
      code: err.errorCode,
      statusCode: err.statusCode,
      stack: err.stack,
      ...err
    }
  });
};

/**
 * Production error response
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.errorCode
      }
    });
  } else {
    // Programming or unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Something went wrong',
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Log error
  console.error(`Error ${error.statusCode}: ${error.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Handle specific error types
  if (err.name === 'MongoError' || err.name === 'ValidationError' || err.name === 'CastError') {
    error = handleDatabaseError(err);
  }

  if (err.isAxiosError) {
    error = handleAPIError(err);
  }

  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

/**
 * 404 handler
 */
const notFound = (req, res, next) => {
  const error = new AppError(
    `Cannot find ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

/**
 * Async error catcher wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = {
  errorHandler,
  AppError,
  notFound,
  catchAsync
}; 