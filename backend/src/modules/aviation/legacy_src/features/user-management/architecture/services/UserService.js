const UserDTO = require('../dtos/UserDTO');

/**
 * Business logic service for User operations
 * Implements use cases and business rules
 */
class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Get all users
   * @returns {Promise<Array<UserDTO>>} Array of user DTOs
   */
  async getAllUsers() {
    try {
      const users = await this.userRepository.findAll();
      return users.map(user => UserDTO.fromDatabase(user));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Failed to retrieve users');
    }
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<UserDTO>} User DTO
   */
  async getUserById(id) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid user ID');
    }

    try {
      const user = await this.userRepository.findById(id);
      if (!user) {
        throw new Error('User not found');
      }
      return UserDTO.fromDatabase(user);
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get user by chat ID
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<UserDTO>} User DTO
   */
  async getUserByChatId(chatId) {
    if (!chatId || !Number.isInteger(chatId) || chatId <= 0) {
      throw new Error('Invalid chat ID');
    }

    try {
      const user = await this.userRepository.findByChatId(chatId);
      if (!user) {
        throw new Error('User not found');
      }
      return UserDTO.fromDatabase(user);
    } catch (error) {
      console.error(`Error getting user by chat ID ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Get users by subscription status
   * @param {boolean} isSubscribed - Subscription status
   * @returns {Promise<Array<UserDTO>>} Array of user DTOs
   */
  async getUsersBySubscriptionStatus(isSubscribed) {
    try {
      const users = await this.userRepository.findBySubscriptionStatus(isSubscribed);
      return users.map(user => UserDTO.fromDatabase(user));
    } catch (error) {
      console.error(`Error getting users by subscription status ${isSubscribed}:`, error);
      throw new Error('Failed to retrieve users by subscription status');
    }
  }

  /**
   * Get users by subscription type
   * @param {string} subscriptionType - Subscription type
   * @returns {Promise<Array<UserDTO>>} Array of user DTOs
   */
  async getUsersBySubscriptionType(subscriptionType) {
    const validTypes = ['basic', 'premium', 'admin'];
    if (!validTypes.includes(subscriptionType)) {
      throw new Error(`Invalid subscription type. Must be one of: ${validTypes.join(', ')}`);
    }

    try {
      const users = await this.userRepository.findBySubscriptionType(subscriptionType);
      return users.map(user => UserDTO.fromDatabase(user));
    } catch (error) {
      console.error(`Error getting users by subscription type ${subscriptionType}:`, error);
      throw new Error('Failed to retrieve users by subscription type');
    }
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<UserDTO>} Created user DTO
   */
  async createUser(userData) {
    // Validate input data
    const validation = UserDTO.validate(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const userId = await this.userRepository.create(userData);
      return await this.getUserById(userId);
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<UserDTO>} Updated user DTO
   */
  async updateUser(id, userData) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid user ID');
    }

    // Validate input data
    const validation = UserDTO.validate(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const success = await this.userRepository.update(id, userData);
      if (!success) {
        throw new Error('User not found or update failed');
      }
      return await this.getUserById(id);
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Upsert user (create or update)
   * @param {Object} userData - User data
   * @returns {Promise<UserDTO>} User DTO
   */
  async upsertUser(userData) {
    // Validate input data
    const validation = UserDTO.validate(userData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const user = await this.userRepository.upsert(userData);
      return UserDTO.fromDatabase(user);
    } catch (error) {
      console.error('Error upserting user:', error);
      throw new Error('Failed to upsert user');
    }
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUser(id) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid user ID');
    }

    try {
      return await this.userRepository.delete(id);
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array<UserDTO>>} Array of matching user DTOs
   */
  async searchUsers(query, options = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    try {
      const users = await this.userRepository.search(query, options);
      return users.map(user => UserDTO.fromDatabase(user));
    } catch (error) {
      console.error(`Error searching users with query "${query}":`, error);
      throw new Error('Failed to search users');
    }
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats() {
    try {
      return await this.userRepository.getStats();
    } catch (error) {
      console.error('Error getting user statistics:', error);
      throw new Error('Failed to retrieve user statistics');
    }
  }

  /**
   * Get active users count
   * @returns {Promise<number>} Active users count
   */
  async getActiveUsersCount() {
    try {
      return await this.userRepository.getActiveUsersCount();
    } catch (error) {
      console.error('Error getting active users count:', error);
      throw new Error('Failed to retrieve active users count');
    }
  }

  /**
   * Get subscribed users count
   * @returns {Promise<number>} Subscribed users count
   */
  async getSubscribedUsersCount() {
    try {
      return await this.userRepository.getSubscribedUsersCount();
    } catch (error) {
      console.error('Error getting subscribed users count:', error);
      throw new Error('Failed to retrieve subscribed users count');
    }
  }

  /**
   * Update user last active timestamp
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<boolean>} Success status
   */
  async updateLastActive(chatId) {
    try {
      const user = await this.userRepository.findByChatId(chatId);
      if (!user) {
        return false;
      }

      return await this.userRepository.update(user.id, {
        lastActiveAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`Error updating last active for chat ID ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Subscribe user (compatibility method)
   * @param {number} chatId - Telegram chat ID
   * @param {Object} telegramData - Telegram user data
   * @returns {Promise<Object>} User record
   */
  async subscribe(chatId, telegramData) {
    try {
      const userData = {
        chatId: chatId,
        username: telegramData.username,
        firstName: telegramData.first_name,
        lastName: telegramData.last_name,
        languageCode: telegramData.language_code,
        isSubscribed: true,
        subscriptionType: 'basic'
      };
      
      return await this.upsertUser(userData);
    } catch (error) {
      console.error(`Error subscribing user ${chatId}:`, error);
      throw new Error('Failed to subscribe user');
    }
  }

  /**
   * Unsubscribe user (compatibility method)
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribe(chatId) {
    try {
      const user = await this.userRepository.findByChatId(chatId);
      if (!user) {
        return false;
      }

      return await this.userRepository.update(user.id, {
        isSubscribed: false
      });
    } catch (error) {
      console.error(`Error unsubscribing user ${chatId}:`, error);
      throw new Error('Failed to unsubscribe user');
    }
  }

  /**
   * Check if user is subscribed (compatibility method)
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<boolean>} Subscription status
   */
  async isSubscribed(chatId) {
    try {
      const user = await this.userRepository.findByChatId(chatId);
      return user ? user.is_subscribed : false;
    } catch (error) {
      console.error(`Error checking subscription status for ${chatId}:`, error);
      return false;
    }
  }

  /**
   * Get subscriber count (compatibility method)
   * @returns {Promise<number>} Subscriber count
   */
  async getSubscriberCount() {
    try {
      return await this.getSubscribedUsersCount();
    } catch (error) {
      console.error('Error getting subscriber count:', error);
      return 0;
    }
  }

  /**
   * Log message (compatibility method)
   * @param {number} chatId - Telegram chat ID
   * @param {string} messageType - Message type
   * @param {Object} messageData - Message data
   * @returns {Promise<boolean>} Success status
   */
  async logMessage(chatId, messageType, messageData) {
    try {
      // This is a compatibility method - in the new architecture,
      // message logging would be handled by a separate service
      console.log(`Message logged for ${chatId}: ${messageType}`, messageData);
      return true;
    } catch (error) {
      console.error(`Error logging message for ${chatId}:`, error);
      return false;
    }
  }
}

module.exports = UserService;
