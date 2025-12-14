/**
 * Interface for Topic Repository
 * Defines contract for topic data access operations
 */
class ITopicRepository {
  /**
   * Get all active topics
   * @returns {Promise<Array>} Array of topic records
   */
  async findAll() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get topic by ID
   * @param {number} id - Topic ID
   * @returns {Promise<Object|null>} Topic record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get topic by day of month
   * @param {number} dayOfMonth - Day of month (1-31)
   * @returns {Promise<Object|null>} Topic record or null
   */
  async findByDayOfMonth(dayOfMonth) {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new topic
   * @param {Object} topicData - Topic data
   * @returns {Promise<number>} Inserted topic ID
   */
  async create(topicData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update topic
   * @param {number} id - Topic ID
   * @param {Object} topicData - Updated topic data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, topicData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Soft delete topic
   * @param {number} id - Topic ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get weekly schedule
   * @returns {Promise<Array>} Array of weekly schedule records
   */
  async getWeeklySchedule() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get topic statistics
   * @returns {Promise<Object>} Topic statistics
   */
  async getStats() {
    throw new Error('Method must be implemented');
  }

  /**
   * Search topics
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching topics
   */
  async search(query, options = {}) {
    throw new Error('Method must be implemented');
  }
}

module.exports = ITopicRepository;
