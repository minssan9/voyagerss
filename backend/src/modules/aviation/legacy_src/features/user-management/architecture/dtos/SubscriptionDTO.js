/**
 * Data Transfer Object for Subscription
 * Represents subscription data structure for API responses
 */
class SubscriptionDTO {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.chatId = data.chat_id;
    this.subscriptionType = data.subscription_type;
    this.isActive = data.is_active;
    this.subscribedAt = data.subscribed_at;
    this.unsubscribedAt = data.unsubscribed_at;
    this.lastNotificationAt = data.last_notification_at;
    this.notificationCount = data.notification_count;
    this.preferences = data.preferences ? JSON.parse(data.preferences) : {};
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create SubscriptionDTO from database row
   * @param {Object} dbRow - Database row object
   * @returns {SubscriptionDTO}
   */
  static fromDatabase(dbRow) {
    return new SubscriptionDTO(dbRow);
  }

  /**
   * Convert to plain object for API response
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      chatId: this.chatId,
      subscriptionType: this.subscriptionType,
      isActive: this.isActive,
      subscribedAt: this.subscribedAt,
      unsubscribedAt: this.unsubscribedAt,
      lastNotificationAt: this.lastNotificationAt,
      notificationCount: this.notificationCount,
      preferences: this.preferences,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate subscription data
   * @param {Object} data - Subscription data to validate
   * @returns {Object} - Validation result
   */
  static validate(data) {
    const errors = [];
    const validSubscriptionTypes = ['basic', 'premium', 'admin'];

    if (!data.userId || !Number.isInteger(data.userId) || data.userId <= 0) {
      errors.push('User ID is required and must be a positive integer');
    }

    if (!data.chatId || !Number.isInteger(data.chatId) || data.chatId <= 0) {
      errors.push('Chat ID is required and must be a positive integer');
    }

    if (data.subscriptionType && !validSubscriptionTypes.includes(data.subscriptionType)) {
      errors.push(`Subscription type must be one of: ${validSubscriptionTypes.join(', ')}`);
    }

    if (data.preferences && typeof data.preferences !== 'object') {
      errors.push('Preferences must be an object');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = SubscriptionDTO;
