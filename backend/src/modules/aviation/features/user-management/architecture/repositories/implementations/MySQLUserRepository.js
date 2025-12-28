const IUserRepository = require('../interfaces/IUserRepository');

/**
 * MySQL implementation of User Repository
 * Handles all user-related database operations
 */
class MySQLUserRepository extends IUserRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all active users
   * @returns {Promise<Array>} Array of user records
   */
  async findAll() {
    const sql = `
      SELECT * FROM users 
      WHERE is_active = 1
      ORDER BY created_at DESC
    `;
    return await this.db.all(sql);
  }

  /**
   * Get user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} User record or null
   */
  async findById(id) {
    const sql = `
      SELECT * FROM users 
      WHERE id = ? AND is_active = 1
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Get user by chat ID
   * @param {number} chatId - Telegram chat ID
   * @returns {Promise<Object|null>} User record or null
   */
  async findByChatId(chatId) {
    const sql = `
      SELECT * FROM users 
      WHERE chat_id = ? AND is_active = 1
    `;
    return await this.db.get(sql, [chatId]);
  }

  /**
   * Get users by subscription status
   * @param {boolean} isSubscribed - Subscription status
   * @returns {Promise<Array>} Array of user records
   */
  async findBySubscriptionStatus(isSubscribed) {
    const sql = `
      SELECT * FROM users 
      WHERE is_subscribed = ? AND is_active = 1
      ORDER BY created_at DESC
    `;
    return await this.db.all(sql, [isSubscribed]);
  }

  /**
   * Get users by subscription type
   * @param {string} subscriptionType - Subscription type
   * @returns {Promise<Array>} Array of user records
   */
  async findBySubscriptionType(subscriptionType) {
    const sql = `
      SELECT * FROM users 
      WHERE subscription_type = ? AND is_active = 1
      ORDER BY created_at DESC
    `;
    return await this.db.all(sql, [subscriptionType]);
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<number>} Inserted user ID
   */
  async create(userData) {
    const sql = `
      INSERT INTO users (chat_id, username, first_name, last_name, language_code, is_active, is_subscribed, subscription_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.execute(sql, [
      userData.chatId,
      userData.username,
      userData.firstName,
      userData.lastName,
      userData.languageCode,
      userData.isActive !== undefined ? userData.isActive : true,
      userData.isSubscribed !== undefined ? userData.isSubscribed : false,
      userData.subscriptionType || 'basic'
    ]);
    return result.insertId;
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, userData) {
    const fields = [];
    const values = [];

    if (userData.username !== undefined) {
      fields.push('username = ?');
      values.push(userData.username);
    }
    if (userData.firstName !== undefined) {
      fields.push('first_name = ?');
      values.push(userData.firstName);
    }
    if (userData.lastName !== undefined) {
      fields.push('last_name = ?');
      values.push(userData.lastName);
    }
    if (userData.languageCode !== undefined) {
      fields.push('language_code = ?');
      values.push(userData.languageCode);
    }
    if (userData.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(userData.isActive);
    }
    if (userData.isSubscribed !== undefined) {
      fields.push('is_subscribed = ?');
      values.push(userData.isSubscribed);
    }
    if (userData.subscriptionType !== undefined) {
      fields.push('subscription_type = ?');
      values.push(userData.subscriptionType);
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('last_active_at = CURRENT_TIMESTAMP');
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Upsert user (create or update)
   * @param {Object} userData - User data
   * @returns {Promise<Object>} User record
   */
  async upsert(userData) {
    // Try to find existing user
    const existingUser = await this.findByChatId(userData.chatId);
    
    if (existingUser) {
      // Update existing user
      await this.update(existingUser.id, userData);
      return await this.findById(existingUser.id);
    } else {
      // Create new user
      const userId = await this.create(userData);
      return await this.findById(userId);
    }
  }

  /**
   * Soft delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `
      UPDATE users 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Search users
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching users
   */
  async search(query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    let sql = `
      SELECT * FROM users 
      WHERE is_active = 1
      AND (username LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const params = [`%${query}%`, `%${query}%`, `%${query}%`, limit, offset];
    return await this.db.all(sql, params);
  }

  /**
   * Get user statistics
   * @returns {Promise<Object>} User statistics
   */
  async getStats() {
    const totalUsers = await this.db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    const subscribedUsers = await this.db.get('SELECT COUNT(*) as count FROM users WHERE is_subscribed = 1 AND is_active = 1');
    const usersByType = await this.db.all(`
      SELECT subscription_type, COUNT(*) as count 
      FROM users 
      WHERE is_active = 1 
      GROUP BY subscription_type
    `);
    const recentUsers = await this.db.get(`
      SELECT COUNT(*) as count
      FROM users 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
      AND is_active = 1
    `);
    
    return {
      totalUsers: totalUsers.count,
      subscribedUsers: subscribedUsers.count,
      usersByType: usersByType.reduce((acc, item) => {
        acc[item.subscription_type] = item.count;
        return acc;
      }, {}),
      recentUsers: recentUsers.count
    };
  }

  /**
   * Get active users count
   * @returns {Promise<number>} Active users count
   */
  async getActiveUsersCount() {
    const result = await this.db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1');
    return result.count;
  }

  /**
   * Get subscribed users count
   * @returns {Promise<number>} Subscribed users count
   */
  async getSubscribedUsersCount() {
    const result = await this.db.get('SELECT COUNT(*) as count FROM users WHERE is_subscribed = 1 AND is_active = 1');
    return result.count;
  }
}

module.exports = MySQLUserRepository;
