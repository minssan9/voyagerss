/**
 * Data Transfer Object for Schedule
 * Represents schedule data structure for API responses
 */
class ScheduleDTO {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.cronExpression = data.cron_expression;
    this.isActive = data.is_active;
    this.scheduleType = data.schedule_type;
    this.targetChatId = data.target_chat_id;
    this.messageTemplate = data.message_template;
    this.nextRunAt = data.next_run_at;
    this.lastRunAt = data.last_run_at;
    this.runCount = data.run_count;
    this.successCount = data.success_count;
    this.failureCount = data.failure_count;
    this.lastError = data.last_error;
    this.metadata = data.metadata ? JSON.parse(data.metadata) : {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create ScheduleDTO from database row
   * @param {Object} dbRow - Database row object
   * @returns {ScheduleDTO}
   */
  static fromDatabase(dbRow) {
    return new ScheduleDTO(dbRow);
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
      cronExpression: this.cronExpression,
      isActive: this.isActive,
      scheduleType: this.scheduleType,
      targetChatId: this.targetChatId,
      messageTemplate: this.messageTemplate,
      nextRunAt: this.nextRunAt,
      lastRunAt: this.lastRunAt,
      runCount: this.runCount,
      successCount: this.successCount,
      failureCount: this.failureCount,
      lastError: this.lastError,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate schedule data
   * @param {Object} data - Schedule data to validate
   * @returns {Object} - Validation result
   */
  static validate(data) {
    const errors = [];
    const validScheduleTypes = ['notification', 'reminder', 'report', 'backup', 'maintenance'];

    if (!data.name || data.name.trim().length === 0) {
      errors.push('Schedule name is required');
    }

    if (data.name && data.name.length > 100) {
      errors.push('Schedule name must be less than 100 characters');
    }

    if (data.description && data.description.length > 500) {
      errors.push('Description must be less than 500 characters');
    }

    if (!data.cronExpression || data.cronExpression.trim().length === 0) {
      errors.push('Cron expression is required');
    }

    if (data.scheduleType && !validScheduleTypes.includes(data.scheduleType)) {
      errors.push(`Schedule type must be one of: ${validScheduleTypes.join(', ')}`);
    }

    if (data.targetChatId && (!Number.isInteger(data.targetChatId) || data.targetChatId <= 0)) {
      errors.push('Target chat ID must be a positive integer');
    }

    if (data.messageTemplate && data.messageTemplate.length > 4096) {
      errors.push('Message template must be less than 4096 characters');
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

module.exports = ScheduleDTO;
