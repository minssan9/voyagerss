/**
 * Interface for Quiz Repository
 * Defines contract for quiz data access operations
 */
class IQuizRepository {
  /**
   * Get all active quizzes
   * @returns {Promise<Array>} Array of quiz records
   */
  async findAll() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get quiz by ID
   * @param {number} id - Quiz ID
   * @returns {Promise<Object|null>} Quiz record or null
   */
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get quizzes by topic
   * @param {string} topic - Quiz topic
   * @returns {Promise<Array>} Array of quiz records
   */
  async findByTopic(topic) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get quizzes by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of quiz records
   */
  async findByDifficulty(difficultyLevel) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get random quiz
   * @param {Object} options - Filter options
   * @returns {Promise<Object|null>} Random quiz record or null
   */
  async findRandom(options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Create new quiz
   * @param {Object} quizData - Quiz data
   * @returns {Promise<number>} Inserted quiz ID
   */
  async create(quizData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Update quiz
   * @param {number} id - Quiz ID
   * @param {Object} quizData - Updated quiz data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, quizData) {
    throw new Error('Method must be implemented');
  }

  /**
   * Soft delete quiz
   * @param {number} id - Quiz ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    throw new Error('Method must be implemented');
  }

  /**
   * Search quizzes
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching quizzes
   */
  async search(query, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * Get quiz statistics
   * @returns {Promise<Object>} Quiz statistics
   */
  async getStats() {
    throw new Error('Method must be implemented');
  }

  /**
   * Get recent quizzes
   * @param {number} limit - Number of recent quizzes to return
   * @returns {Promise<Array>} Array of recent quiz records
   */
  async findRecent(limit = 10) {
    throw new Error('Method must be implemented');
  }
}

module.exports = IQuizRepository;
