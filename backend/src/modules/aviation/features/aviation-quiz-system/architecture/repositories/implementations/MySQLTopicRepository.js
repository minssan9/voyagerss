const ITopicRepository = require('../interfaces/ITopicRepository');

/**
 * MySQL implementation of Topic Repository
 * Handles all topic-related database operations
 */
class MySQLTopicRepository extends ITopicRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all active topics
   * @returns {Promise<Array>} Array of topic records
   */
  async findAll() {
    const sql = `
      SELECT t.*
      FROM topics t
      WHERE t.is_active = 1
      ORDER BY t.day_of_month ASC
    `;
    return await this.db.all(sql);
  }

  /**
   * Get topic by ID
   * @param {number} id - Topic ID
   * @returns {Promise<Object|null>} Topic record or null
   */
  async findById(id) {
    const sql = `
      SELECT t.*
      FROM topics t
      WHERE t.id = ? AND t.is_active = 1
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Get topic by day of month
   * @param {number} dayOfMonth - Day of month (1-31)
   * @returns {Promise<Object|null>} Topic record or null
   */
  async findByDayOfMonth(dayOfMonth) {
    const sql = `
      SELECT t.*
      FROM topics t
      WHERE t.day_of_month = ? AND t.is_active = 1
      LIMIT 1
    `;
    return await this.db.get(sql, [dayOfMonth]);
  }

  /**
   * Create new topic
   * @param {Object} topicData - Topic data
   * @returns {Promise<number>} Inserted topic ID
   */
  async create(topicData) {
    const sql = `
      INSERT INTO topics (name, description, day_of_month, topic_category, difficulty_level, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.execute(sql, [
      topicData.name,
      topicData.description,
      topicData.dayOfMonth,
      topicData.topicCategory || 'General',
      topicData.difficultyLevel || 'intermediate',
      topicData.isActive !== undefined ? topicData.isActive : true
    ]);
    return result.insertId;
  }

  /**
   * Update topic
   * @param {number} id - Topic ID
   * @param {Object} topicData - Updated topic data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, topicData) {
    const fields = [];
    const values = [];

    if (topicData.name !== undefined) {
      fields.push('name = ?');
      values.push(topicData.name);
    }
    if (topicData.description !== undefined) {
      fields.push('description = ?');
      values.push(topicData.description);
    }
    if (topicData.dayOfMonth !== undefined) {
      fields.push('day_of_month = ?');
      values.push(topicData.dayOfMonth);
    }
    if (topicData.topicCategory !== undefined) {
      fields.push('topic_category = ?');
      values.push(topicData.topicCategory);
    }
    if (topicData.difficultyLevel !== undefined) {
      fields.push('difficulty_level = ?');
      values.push(topicData.difficultyLevel);
    }
    if (topicData.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(topicData.isActive);
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE topics SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Soft delete topic
   * @param {number} id - Topic ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `
      UPDATE topics 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Get weekly schedule
   * @returns {Promise<Array>} Array of weekly schedule records
   */
  async getWeeklySchedule() {
    const sql = `
      SELECT t.id, t.name as topic, t.day_of_month, 
             CONCAT(t.day_of_month, '일') as day_name
      FROM topics t
      WHERE t.is_active = 1
      ORDER BY t.day_of_month ASC
    `;
    return await this.db.all(sql);
  }

  /**
   * Get topic statistics
   * @returns {Promise<Object>} Topic statistics
   */
  async getStats() {
    const totalTopics = await this.db.get('SELECT COUNT(*) as count FROM topics WHERE is_active = 1');
    const topicsByDifficulty = await this.db.all(`
      SELECT difficulty_level, COUNT(*) as count 
      FROM topics 
      WHERE is_active = 1 
      GROUP BY difficulty_level
    `);
    
    return {
      totalTopics: totalTopics.count,
      topicsByDifficulty: topicsByDifficulty.reduce((acc, item) => {
        acc[item.difficulty_level] = item.count;
        return acc;
      }, {})
    };
  }

  /**
   * Search topics
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching topics
   */
  async search(query, options = {}) {
    const { limit = 20, offset = 0 } = options;
    
    let sql = `
      SELECT t.*
      FROM topics t
      WHERE t.is_active = 1
      AND (t.name LIKE ? OR t.description LIKE ?)
      ORDER BY t.name ASC
      LIMIT ? OFFSET ?
    `;
    
    const params = [`%${query}%`, `%${query}%`, limit, offset];
    return await this.db.all(sql, params);
  }

  /**
   * Get topic by date (simplified date-based system)
   * @param {number} dayOfMonth - Day of month (1-31)
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object>} Topic record
   */
  async findByDate(dayOfMonth, month, year) {
    const sql = `
      SELECT t.*
      FROM topics t
      WHERE t.day_of_month = ? 
      AND t.is_active = 1
      LIMIT 1
    `;
    
    const result = await this.db.get(sql, [dayOfMonth]);
    return result;
  }

  /**
   * Get topic by day of month (simplified)
   * @param {number} dayOfMonth - Day of month (1-31)
   * @returns {Promise<Object>} Topic record
   */
  async findByDayOfMonth(dayOfMonth) {
    const sql = `
      SELECT t.*
      FROM topics t
      WHERE t.day_of_month = ? 
      AND t.is_active = 1
      LIMIT 1
    `;
    
    const result = await this.db.get(sql, [dayOfMonth]);
    return result;
  }

  /**
   * Get topics by category
   * @param {string} category - Topic category
   * @returns {Promise<Array>} Array of topic records
   */
  async findByCategory(category) {
    const sql = `
      SELECT t.*
      FROM topics t
      WHERE t.topic_category = ? 
      AND t.is_active = 1
      ORDER BY t.day_of_month ASC
    `;
    
    return await this.db.all(sql, [category]);
  }

  /**
   * Get topics by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of topic records
   */
  async findByDifficulty(difficultyLevel) {
    const sql = `
      SELECT t.*
      FROM topics t
      WHERE t.difficulty_level = ? 
      AND t.is_active = 1
      ORDER BY t.day_of_month ASC
    `;
    
    return await this.db.all(sql, [difficultyLevel]);
  }
}

module.exports = MySQLTopicRepository;
