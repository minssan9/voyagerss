/**
 * Interface for Subscription Repository
 * Defines contract for subscription data access operations
 */
class ISubscriptionRepository {
  /**
   * Get all active subscriptions
   * @returns {Promise<Array>} Array of subscription records
   */
  async findAll() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subscription by ID
   * @param {number} id - Subscription ID
   * @returns {Promise<Object|null>} Subscription record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subscription by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Subscription record or null
   */
  async findByUserId(userId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subscription by chat ID
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<Object|null>} Subscription record or null
   */
  async findByChatId(chatId) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subscriptions by type
   * @param {string} subscriptionType - Subscription type
   * @returns {Promise<Array>} Array of subscription records
   */
  async findByType(subscriptionType) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get active subscriptions
   * @returns {Promise<Array>} Array of active subscription records
   */
  async findActive() {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new subscription
   * @param {Object} subscriptionData - Subscription data
   * @returns {Promise<number>} Inserted subscription ID
   */
  async create(subscriptionData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update subscription
   * @param {number} id - Subscription ID
   * @param {Object} subscriptionData - Updated subscription data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, subscriptionData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Activate subscription
   * @param {number} id - Subscription ID
   * @returns {Promise<boolean>} Success status
   */
  async activate(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Deactivate subscription
   * @param {number} id - Subscription ID
   * @returns {Promise<boolean>} Success status
   */
  async deactivate(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Delete subscription
   * @param {number} id - Subscription ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subscription statistics
   * @returns {Promise<Object>} Subscription statistics
   */
  async getStats() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get active subscriptions count
   * @returns {Promise<number>} Active subscriptions count
   */
  async getActiveCount() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get subscriptions by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of subscription records
   */
  async findByDateRange(startDate, endDate) {
    throw new Error('Method must be implemented');
  }
}

module.exports = ISubscriptionRepository;
