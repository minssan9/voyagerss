const { AppError } = require('../errors/AppError');

/**
 * Global error handler middleware
 * Handles all application errors and provides consistent error responses
 */
class ErrorHandler {
  constructor(config) {
    this.config = config;
    this.isDevelopment = config.getEnvironment() === 'development';
    this.isTest = config.getEnvironment() === 'test';
  }

  /**
   * Express error handler middleware
   * @param {Error} err - Error object
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  handle(err, req, res, next) {
    // Log error
    this._logError(err, req);

    // Handle different error types
    if (err instanceof AppError) {
      this._handleAppError(err, req, res);
    } else if (err.name === 'ValidationError') {
      this._handleValidationError(err, req, res);
    } else if (err.name === 'CastError') {
      this._handleCastError(err, req, res);
    } else if (err.code === 'ER_DUP_ENTRY') {
      this._handleDuplicateEntryError(err, req, res);
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      this._handleForeignKeyError(err, req, res);
    } else if (err.code === 'ECONNREFUSED') {
      this._handleConnectionError(err, req, res);
    } else {
      this._handleUnknownError(err, req, res);
    }
  }

  /**
   * Handle application-specific errors
   * @param {AppError} err - Application error
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @private
   */
  _handleAppError(err, req, res) {
    const response = {
      success: false,
      error: {
        code: err.errorCode,
        message: err.message,
        category: err.category,
        timestamp: err.timestamp
      }
    };

    // Add stack trace in development
    if (this.isDevelopment) {
      response.error.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
  }

  /**
   * Handle validation errors
   * @param {Error} err - Validation error
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @private
   */
  _handleValidationError(err, req, res) {
    const response = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        category: 'VALIDATION',
        timestamp: new Date().toISOString()
      }
    };

    if (this.isDevelopment) {
      response.error.stack = err.stack;
    }

    res.status(400).json(response);
  }

  /**
   * Handle cast errors (invalid ID format)
   * @param {Error} err - Cast error
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @private
   */
  _handleCastError(err, req, res) {
    const response = {
      success: false,
      error: {
        code: 'INVALID_ID',
        message: 'Invalid ID format',
        category: 'VALIDATION',
        timestamp: new Date().toISOString()
      }
    };

    if (this.isDevelopment) {
      response.error.stack = err.stack;
    }

    res.status(400).json(response);
  }

  /**
   * Handle duplicate entry errors
   * @param {Error} err - Duplicate entry error
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @private
   */
  _handleDuplicateEntryError(err, req, res) {
    const response = {
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'Resource already exists',
        category: 'DATA',
        timestamp: new Date().toISOString()
      }
    };

    if (this.isDevelopment) {
      response.error.stack = err.stack;
    }

    res.status(409).json(response);
  }

  /**
   * Handle foreign key constraint errors
   * @param {Error} err - Foreign key error
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @private
   */
  _handleForeignKeyError(err, req, res) {
    const response = {
      success: false,
      error: {
        code: 'FOREIGN_KEY_CONSTRAINT',
        message: 'Referenced resource does not exist',
        category: 'DATA',
        timestamp: new Date().toISOString()
      }
    };

    if (this.isDevelopment) {
      response.error.stack = err.stack;
    }

    res.status(400).json(response);
  }

  /**
   * Handle connection errors
   * @param {Error} err - Connection error
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @private
   */
  _handleConnectionError(err, req, res) {
    const response = {
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: 'Service temporarily unavailable',
        category: 'EXTERNAL',
        timestamp: new Date().toISOString()
      }
    };

    if (this.isDevelopment) {
      response.error.stack = err.stack;
    }

    res.status(503).json(response);
  }

  /**
   * Handle unknown errors
   * @param {Error} err - Unknown error
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @private
   */
  _handleUnknownError(err, req, res) {
    const response = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: this.isDevelopment ? err.message : 'Internal server error',
        category: 'GENERAL',
        timestamp: new Date().toISOString()
      }
    };

    if (this.isDevelopment) {
      response.error.stack = err.stack;
    }

    res.status(500).json(response);
  }

  /**
   * Log error details
   * @param {Error} err - Error object
   * @param {Object} req - Request object
   * @private
   */
  _logError(err, req) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    };

    if (err instanceof AppError) {
      errorInfo.error.code = err.errorCode;
      errorInfo.error.category = err.category;
      errorInfo.error.statusCode = err.statusCode;
    }

    // Log based on environment
    if (this.isTest) {
      // Minimal logging in test environment
      console.error(`[${errorInfo.timestamp}] ${err.name}: ${err.message}`);
    } else {
      // Full logging in development and production
      console.error(JSON.stringify(errorInfo, null, 2));
    }
  }

  /**
   * Create error handler middleware function
   * @returns {Function} Express middleware function
   */
  middleware() {
    return (err, req, res, next) => {
      this.handle(err, req, res, next);
    };
  }

  /**
   * Handle async errors
   * Wraps async route handlers to catch errors
   * @param {Function} fn - Async function
   * @returns {Function} Wrapped function
   */
  catchAsync(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

module.exports = ErrorHandler;
