/**
 * Data Transfer Object for Weather Image
 * Represents weather image data structure for API responses
 */
class WeatherImageDTO {
  constructor(data) {
    this.id = data.id;
    this.filename = data.filename;
    this.filePath = data.file_path;
    this.imageType = data.image_type;
    this.capturedAt = data.captured_at;
    this.fileSize = data.file_size;
    this.dimensions = data.dimensions ? JSON.parse(data.dimensions) : null;
    this.metadata = data.metadata ? JSON.parse(data.metadata) : {};
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create WeatherImageDTO from database row
   * @param {Object} dbRow - Database row object
   * @returns {WeatherImageDTO}
   */
  static fromDatabase(dbRow) {
    return new WeatherImageDTO(dbRow);
  }

  /**
   * Convert to plain object for API response
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      filename: this.filename,
      filePath: this.filePath,
      imageType: this.imageType,
      capturedAt: this.capturedAt,
      fileSize: this.fileSize,
      dimensions: this.dimensions,
      metadata: this.metadata,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate weather image data
   * @param {Object} data - Weather image data to validate
   * @returns {Object} - Validation result
   */
  static validate(data) {
    const errors = [];
    const validImageTypes = ['satellite', 'radar', 'forecast', 'observation'];

    if (!data.filename || data.filename.trim().length === 0) {
      errors.push('Filename is required');
    }

    if (data.filename && data.filename.length > 255) {
      errors.push('Filename must be less than 255 characters');
    }

    if (!data.filePath || data.filePath.trim().length === 0) {
      errors.push('File path is required');
    }

    if (data.imageType && !validImageTypes.includes(data.imageType)) {
      errors.push(`Image type must be one of: ${validImageTypes.join(', ')}`);
    }

    if (data.fileSize && (!Number.isInteger(data.fileSize) || data.fileSize <= 0)) {
      errors.push('File size must be a positive integer');
    }

    if (data.dimensions && typeof data.dimensions !== 'object') {
      errors.push('Dimensions must be an object');
    }

    if (data.metadata && typeof data.metadata !== 'object') {
      errors.push('Metadata must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = WeatherImageDTO;
