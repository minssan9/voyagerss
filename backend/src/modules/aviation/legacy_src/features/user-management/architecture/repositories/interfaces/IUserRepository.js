/**
 * Interface for User Repository
 * Defines contract for user data access operations
 */
class IUserRepository {
  /**
   * Get all active users
   * @returns {Promise<Array>} Array of user records
   */
  async findAll() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get user by chat ID
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<Object|null>} User record or null
   */
  async findByChatId(chatId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get users by subscription status
   * @param {boolean} isSubscribed - Subscription status
   * @returns {Promise<Array>} Array of user records
   */
  async findBySubscriptionStatus(isSubscribed) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get users by subscription type
   * @param {string} subscriptionType - Subscription type
   * @returns {Promise<Array>} Array of user records
   */
  async findBySubscriptionType(subscriptionType) {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<number>} Inserted user ID
   */
  async create(userData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, userData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Upsert user (create or update)
   * @param {Object} userData - User data
   * @returns {Promise<Object>} User record
   */
  async upsert(userData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Soft delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching users
   */
  async search(query, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getStats() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get active users count
   * @returns {Promise<number>} Active users count
   */
  async getActiveUsersCount() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subscribed users count
   * @returns {Promise<number>} Subscribed users count
   */
  async getSubscribedUsersCount() {
    throw new Error('Method must be implemented');
  }
}

module.exports = IUserRepository;
