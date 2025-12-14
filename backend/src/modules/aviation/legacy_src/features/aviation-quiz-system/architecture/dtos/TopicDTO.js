/**
 * Data Transfer Object for Topic
 * Represents topic data structure for API responses
 */
class TopicDTO {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.dayOfMonth = data.day_of_month;
    this.isActive = data.is_active;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create TopicDTO from database row
   * @param {Object} dbRow - Database row object
   * @returns {TopicDTO}
   */
  static fromDatabase(dbRow) {
    return new TopicDTO(dbRow);
  }

  /**
   * Convert to plain object for API response
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      dayOfMonth: this.dayOfMonth,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate topic data
   * @param {Object} data - Topic data to validate
   * @returns {Object} - Validation result
   */
  static validate(data) {
    const errors = [];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Topic name is required');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Topic name must be less than 100 characters');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Topic description must be less than 500 characters');
    }

    if (data.dayOfMonth !== undefined && (data.dayOfMonth < 1 || data.dayOfMonth > 31)) {
      errors.push('Day of month must be between 1 and 31');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = TopicDTO;
