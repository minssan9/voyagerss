/**
 * Data Transfer Object for User
 * Represents user data structure for API responses
 */
class UserDTO {
  constructor(data) {
    this.id = data.id;
    this.chatId = data.chat_id;
    this.username = data.username;
    this.firstName = data.first_name;
    this.lastName = data.last_name;
    this.languageCode = data.language_code;
    this.isActive = data.is_active;
    this.isSubscribed = data.is_subscribed;
    this.subscriptionType = data.subscription_type;
    this.lastActiveAt = data.last_active_at;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Create UserDTO from database row
   * @param {Object} dbRow - Database row object
   * @returns {UserDTO}
   */
  static fromDatabase(dbRow) {
    return new UserDTO(dbRow);
  }

  /**
   * Convert to plain object for API response
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      chatId: this.chatId,
      username: this.username,
      firstName: this.firstName,
      lastName: this.lastName,
      languageCode: this.languageCode,
      isActive: this.isActive,
      isSubscribed: this.isSubscribed,
      subscriptionType: this.subscriptionType,
      lastActiveAt: this.lastActiveAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Validate user data
   * @param {Object} data - User data to validate
   * @returns {Object} - Validation result
   */
  static validate(data) {
    const errors = [];
    const validSubscriptionTypes = ['basic', 'premium', 'admin'];

    if (!data.chatId || !Number.isInteger(data.chatId) || data.chatId <= 0) {
      errors.push('Chat ID is required and must be a positive integer');
    }

    if (data.username && data.username.length > 50) {
      errors.push('Username must be less than 50 characters');
    }

    if (data.firstName && data.firstName.length > 100) {
      errors.push('First name must be less than 100 characters');
    }

    if (data.lastName && data.lastName.length > 100) {
      errors.push('Last name must be less than 100 characters');
    }

    if (data.languageCode && data.languageCode.length > 10) {
      errors.push('Language code must be less than 10 characters');
    }

    if (data.subscriptionType && !validSubscriptionTypes.includes(data.subscriptionType)) {
      errors.push(`Subscription type must be one of: ${validSubscriptionTypes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = UserDTO;
