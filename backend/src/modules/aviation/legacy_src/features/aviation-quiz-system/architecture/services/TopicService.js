const TopicDTO = require('../dtos/TopicDTO');

/**
 * Business logic service for Topic operations
 * Implements use cases and business rules
 */
class TopicService {
  constructor(topicRepository) {
    this.topicRepository = topicRepository;
  }

  /**
   * Get all topics
   * @returns {Promise<Array<TopicDTO>>} Array of topic DTOs
   */
  async getAllTopics() {
    try {
      const topics = await this.topicRepository.findAll();
      return topics.map(topic => TopicDTO.fromDatabase(topic));
    } catch (error) {
      console.error('Error getting all topics:', error);
      throw new Error('Failed to retrieve topics');
    }
  }

  /**
   * Get topic by ID
   * @param {number} id - Topic ID
   * @returns {Promise<TopicDTO>} Topic DTO
   */
  async getTopicById(id) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid topic ID');
    }

    try {
      const topic = await this.topicRepository.findById(id);
      if (!topic) {
        throw new Error('Topic not found');
      }
      return TopicDTO.fromDatabase(topic);
    } catch (error) {
      console.error(`Error getting topic ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get topic by day of month
   * @param {number} dayOfMonth - Day of month (1-31)
   * @returns {Promise<TopicDTO>} Topic DTO
   */
  async getTopicByDayOfMonth(dayOfMonth) {
    if (dayOfMonth < 1 || dayOfMonth > 31) {
      throw new Error('Day of month must be between 1 and 31');
    }

    try {
      const topic = await this.topicRepository.findByDayOfMonth(dayOfMonth);
      if (!topic) {
        throw new Error(`No topic found for day ${dayOfMonth}`);
      }
      return TopicDTO.fromDatabase(topic);
    } catch (error) {
      console.error(`Error getting topic for day ${dayOfMonth}:`, error);
      throw error;
    }
  }

  /**
   * Create new topic
   * @param {Object} topicData - Topic data
   * @returns {Promise<TopicDTO>} Created topic DTO
   */
  async createTopic(topicData) {
    // Validate input data
    const validation = TopicDTO.validate(topicData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const topicId = await this.topicRepository.create(topicData);
      return await this.getTopicById(topicId);
    } catch (error) {
      console.error('Error creating topic:', error);
      throw new Error('Failed to create topic');
    }
  }

  /**
   * Update topic
   * @param {number} id - Topic ID
   * @param {Object} topicData - Updated topic data
   * @returns {Promise<TopicDTO>} Updated topic DTO
   */
  async updateTopic(id, topicData) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid topic ID');
    }

    // Validate input data
    const validation = TopicDTO.validate(topicData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    try {
      const success = await this.topicRepository.update(id, topicData);
      if (!success) {
        throw new Error('Topic not found or update failed');
      }
      return await this.getTopicById(id);
    } catch (error) {
      console.error(`Error updating topic ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete topic
   * @param {number} id - Topic ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTopic(id) {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('Invalid topic ID');
    }

    try {
      return await this.topicRepository.delete(id);
    } catch (error) {
      console.error(`Error deleting topic ${id}:`, error);
      throw new Error('Failed to delete topic');
    }
  }

  /**
   * Get weekly schedule
   * @returns {Promise<Array>} Weekly schedule
   */
  async getWeeklySchedule() {
    try {
      const schedule = await this.topicRepository.getWeeklySchedule();
      return schedule.map(s => ({
        id: s.id,
        day: s.day_name,
        dayOfMonth: s.day_of_month,
        topic: s.topic
      }));
    } catch (error) {
      console.error('Error getting weekly schedule:', error);
      throw new Error('Failed to retrieve weekly schedule');
    }
  }

  /**
   * Search topics
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array<TopicDTO>>} Array of matching topic DTOs
   */
  async searchTopics(query, options = {}) {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    try {
      const topics = await this.topicRepository.search(query, options);
      return topics.map(topic => TopicDTO.fromDatabase(topic));
    } catch (error) {
      console.error(`Error searching topics with query "${query}":`, error);
      throw new Error('Failed to search topics');
    }
  }

  /**
   * Get topic statistics
   * @returns {Promise<Object>} Topic statistics
   */
  async getTopicStats() {
    try {
      return await this.topicRepository.getStats();
    } catch (error) {
      console.error('Error getting topic statistics:', error);
      throw new Error('Failed to retrieve topic statistics');
    }
  }

  /**
   * Get topic by date (new date-based system)
   * @param {number} dayOfMonth - Day of month (1-31)
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<TopicDTO>} Topic DTO
   */
  async getTopicByDate(dayOfMonth, month, year) {
    try {
      const topic = await this.topicRepository.findByDate(dayOfMonth, month, year);
      if (!topic) {
        throw new Error(`No topic found for date ${dayOfMonth}/${month}/${year}`);
      }
      return TopicDTO.fromDatabase(topic);
    } catch (error) {
      console.error(`Error getting topic for date ${dayOfMonth}/${month}/${year}:`, error);
      throw new Error('Failed to retrieve topic for date');
    }
  }

  /**
   * Get topic by day of month (simplified date-based system)
   * @param {number} dayOfMonth - Day of month (1-31)
   * @returns {Promise<TopicDTO>} Topic DTO
   */
  async getTopicByDayOfMonth(dayOfMonth) {
    if (dayOfMonth < 1 || dayOfMonth > 31) {
      throw new Error('Day of month must be between 1 and 31');
    }

    try {
      const topic = await this.topicRepository.findByDayOfMonth(dayOfMonth);
      if (!topic) {
        throw new Error(`No topic found for day ${dayOfMonth}`);
      }
      return TopicDTO.fromDatabase(topic);
    } catch (error) {
      console.error(`Error getting topic for day ${dayOfMonth}:`, error);
      throw error;
    }
  }

  /**
   * Get all topics by category
   * @param {string} category - Topic category
   * @returns {Promise<Array<TopicDTO>>} Array of topic DTOs
   */
  async getTopicsByCategory(category) {
    if (!category || typeof category !== 'string') {
      throw new Error('Category is required and must be a string');
    }

    try {
      const topics = await this.topicRepository.findByCategory(category);
      return topics.map(topic => TopicDTO.fromDatabase(topic));
    } catch (error) {
      console.error(`Error getting topics by category ${category}:`, error);
      throw new Error('Failed to retrieve topics by category');
    }
  }

  /**
   * Get topics by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array<TopicDTO>>} Array of topic DTOs
   */
  async getTopicsByDifficulty(difficultyLevel) {
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!validLevels.includes(difficultyLevel)) {
      throw new Error(`Invalid difficulty level. Must be one of: ${validLevels.join(', ')}`);
    }

    try {
      const topics = await this.topicRepository.findByDifficulty(difficultyLevel);
      return topics.map(topic => TopicDTO.fromDatabase(topic));
    } catch (error) {
      console.error(`Error getting topics by difficulty ${difficultyLevel}:`, error);
      throw new Error('Failed to retrieve topics by difficulty');
    }
  }
}

module.exports = TopicService;
