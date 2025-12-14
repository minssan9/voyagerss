/**
 * Base application error class
 * Provides structured error handling with error codes and categories
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', category = 'GENERAL') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.category = category;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON format
   * @returns {Object} Error object
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      category: this.category,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * Validation error class
 * Used for input validation failures
 */
class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR', 'VALIDATION');
    this.field = field;
  }
}

/**
 * Not found error class
 * Used when requested resource is not found
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', 'RESOURCE');
    this.resource = resource;
  }
}

/**
 * Conflict error class
 * Used when there's a conflict with existing data
 */
class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT', 'DATA');
  }
}

/**
 * Unauthorized error class
 * Used for authentication failures
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED', 'AUTH');
  }
}

/**
 * Forbidden error class
 * Used for authorization failures
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN', 'AUTH');
  }
}

/**
 * Database error class
 * Used for database operation failures
 */
class DatabaseError extends AppError {
  constructor(message, operation = null) {
    super(message, 500, 'DATABASE_ERROR', 'DATABASE');
    this.operation = operation;
  }
}

/**
 * External service error class
 * Used for external API or service failures
 */
class ExternalServiceError extends AppError {
  constructor(message, service = null) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', 'EXTERNAL');
    this.service = service;
  }
}

/**
 * Rate limit error class
 * Used when rate limits are exceeded
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', 'RATE_LIMIT');
  }
}

/**
 * Business logic error class
 * Used for business rule violations
 */
class BusinessLogicError extends AppError {
  constructor(message, rule = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', 'BUSINESS');
    this.rule = rule;
  }
}

/**
 * Configuration error class
 * Used for configuration-related issues
 */
class ConfigurationError extends AppError {
  constructor(message, configKey = null) {
    super(message, 500, 'CONFIGURATION_ERROR', 'CONFIG');
    this.configKey = configKey;
  }
}

/**
 * Error factory for creating specific error types
 */
class ErrorFactory {
  /**
   * Create validation error
   * @param {string} message - Error message
   * @param {string} field - Field that failed validation
   * @returns {ValidationError}
   */
  static validation(message, field = null) {
    return new ValidationError(message, field);
  }

  /**
   * Create not found error
   * @param {string} resource - Resource name
   * @returns {NotFoundError}
   */
  static notFound(resource = 'Resource') {
    return new NotFoundError(resource);
  }

  /**
   * Create conflict error
   * @param {string} message - Error message
   * @returns {ConflictError}
   */
  static conflict(message) {
    return new ConflictError(message);
  }

  /**
   * Create unauthorized error
   * @param {string} message - Error message
   * @returns {UnauthorizedError}
   */
  static unauthorized(message = 'Unauthorized access') {
    return new UnauthorizedError(message);
  }

  /**
   * Create forbidden error
   * @param {string} message - Error message
   * @returns {ForbiddenError}
   */
  static forbidden(message = 'Access forbidden') {
    return new ForbiddenError(message);
  }

  /**
   * Create database error
   * @param {string} message - Error message
   * @param {string} operation - Database operation
   * @returns {DatabaseError}
   */
  static database(message, operation = null) {
    return new DatabaseError(message, operation);
  }

  /**
   * Create external service error
   * @param {string} message - Error message
   * @param {string} service - Service name
   * @returns {ExternalServiceError}
   */
  static externalService(message, service = null) {
    return new ExternalServiceError(message, service);
  }

  /**
   * Create rate limit error
   * @param {string} message - Error message
   * @returns {RateLimitError}
   */
  static rateLimit(message = 'Rate limit exceeded') {
    return new RateLimitError(message);
  }

  /**
   * Create business logic error
   * @param {string} message - Error message
   * @param {string} rule - Business rule
   * @returns {BusinessLogicError}
   */
  static businessLogic(message, rule = null) {
    return new BusinessLogicError(message, rule);
  }

  /**
   * Create configuration error
   * @param {string} message - Error message
   * @param {string} configKey - Configuration key
   * @returns {ConfigurationError}
   */
  static configuration(message, configKey = null) {
    return new ConfigurationError(message, configKey);
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  BusinessLogicError,
  ConfigurationError,
  ErrorFactory
};
