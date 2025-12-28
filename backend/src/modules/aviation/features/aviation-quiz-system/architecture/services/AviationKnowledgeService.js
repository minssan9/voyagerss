const TopicService = require('./TopicService');

/**
 * Main business service for Aviation Knowledge operations
 * Manages topic-based knowledge for AI generation
 */
class AviationKnowledgeService {
  constructor(topicService) {
    this.topicService = topicService;
  }

  /**
   * Get knowledge by day of month
   * @param {number} dayOfMonth - Day of month (1-31)
   * @returns {Promise<Object>} Knowledge data with topic information
   */
  async getKnowledgeByDay(dayOfMonth) {
    try {
      const topic = await this.topicService.getTopicByDayOfMonth(dayOfMonth);
      
      return this._formatTopicResponse(topic, { dayOfMonth });
    } catch (error) {
      console.error(`Error getting knowledge for day ${dayOfMonth}:`, error);
      throw error;
    }
  }

  /**
   * Get topic for specific day
   * @param {number} dayOfMonth - Day of month (1-31)
   * @returns {Promise<Object>} Topic data for AI generation
   */
  async getTopicByDay(dayOfMonth) {
    try {
      const topic = await this.topicService.getTopicByDayOfMonth(dayOfMonth);
      
      return this._formatTopicResponse(topic, { dayOfMonth });
    } catch (error) {
      console.error(`Error getting topic for day ${dayOfMonth}:`, error);
      throw error;
    }
  }

  /**
   * Get all topics with metadata
   * @returns {Promise<Array>} Array of topics for AI generation
   */
  async getAllTopics() {
    try {
      const topics = await this.topicService.getAllTopics();
      return topics.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        dayOfMonth: t.dayOfMonth
      }));
    } catch (error) {
      console.error('Error getting all topics:', error);
      throw error;
    }
  }

  /**
   * Get weekly schedule
   * @returns {Promise<Array>} Weekly schedule with topic information
   */
  async getWeeklySchedule() {
    try {
      const schedule = await this.topicService.getWeeklySchedule();
      return schedule.map(s => ({
        id: s.id,
        day: s.day,
        dayOfMonth: s.dayOfMonth,
        topic: s.topic
      }));
    } catch (error) {
      console.error('Error getting weekly schedule:', error);
      throw error;
    }
  }

  /**
   * Get topics by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of topics with difficulty information
   */
  async getTopicsByDifficulty(difficultyLevel) {
    try {
      const topics = await this.topicService.getTopicsByDifficulty(difficultyLevel);
      return topics.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        dayOfMonth: t.dayOfMonth
      }));
    } catch (error) {
      console.error(`Error getting topics by difficulty ${difficultyLevel}:`, error);
      throw error;
    }
  }

  /**
   * Get random topic from all topics
   * @returns {Promise<Object>} Random topic data
   */
  async getRandomTopicFromAll() {
    try {
      const topics = await this.topicService.getAllTopics();
      const randomIndex = Math.floor(Math.random() * topics.length);
      const topic = topics[randomIndex];
      
      return {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        dayOfMonth: topic.dayOfMonth
      };
    } catch (error) {
      console.error('Error getting random topic from all:', error);
      throw error;
    }
  }

  /**
   * Search topics
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching topics
   */
  async searchTopics(query, options = {}) {
    try {
      const topics = await this.topicService.searchTopics(query, options);
      return topics.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        dayOfMonth: t.dayOfMonth
      }));
    } catch (error) {
      console.error(`Error searching topics with query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive statistics
   * @returns {Promise<Object>} Topic statistics
   */
  async getStats() {
    try {
      const topicStats = await this.topicService.getTopicStats();
      
      return {
        ...topicStats
      };
    } catch (error) {
      console.error('Error getting aviation knowledge stats:', error);
      throw error;
    }
  }

  /**
   * Create new topic
   * @param {Object} topicData - Topic data
   * @returns {Promise<Object>} Created topic
   */
  async createTopic(topicData) {
    try {
      const topic = await this.topicService.createTopic(topicData);
      
      return {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        dayOfMonth: topic.dayOfMonth
      };
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  }

  /**
   * Update topic
   * @param {number} topicId - Topic ID
   * @param {Object} topicData - Updated topic data
   * @returns {Promise<Object>} Updated topic
   */
  async updateTopic(topicId, topicData) {
    try {
      const topic = await this.topicService.updateTopic(topicId, topicData);
      
      return {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        dayOfMonth: topic.dayOfMonth
      };
    } catch (error) {
      console.error(`Error updating topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Delete topic
   * @param {number} topicId - Topic ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTopic(topicId) {
    try {
      return await this.topicService.deleteTopic(topicId);
    } catch (error) {
      console.error(`Error deleting topic ${topicId}:`, error);
      throw error;
    }
  }

  /**
   * Get knowledge by date (new date-based system)
   * @param {number} dayOfMonth - Day of month (1-31)
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object>} Knowledge data with topic information
   */
  async getKnowledgeByDate(dayOfMonth, month, year) {
    try {
      const topic = await this.topicService.getTopicByDate(dayOfMonth, month, year);
      
      return this._formatTopicResponse(topic, { dayOfMonth, month, year });
    } catch (error) {
      console.error(`Error getting knowledge for date ${dayOfMonth}/${month}/${year}:`, error);
      throw error;
    }
  }

  /**
   * Get topic by date (new date-based system)
   * @param {number} dayOfMonth - Day of month (1-31)
   * @param {number} month - Month (1-12)
   * @param {number} year - Year
   * @returns {Promise<Object>} Topic data for AI generation
   */
  async getTopicByDate(dayOfMonth, month, year) {
    try {
      const topic = await this.topicService.getTopicByDate(dayOfMonth, month, year);
      
      return this._formatTopicResponse(topic, { dayOfMonth, month, year });
    } catch (error) {
      console.error(`Error getting topic for date ${dayOfMonth}/${month}/${year}:`, error);
      throw error;
    }
  }

  /**
   * Format topic response for AI generation
   * @private
   * @param {Object} topic - Topic data
   * @param {Object} context - Additional context (dayOfMonth, month, year, etc.)
   * @returns {Object} Formatted topic response
   */
  _formatTopicResponse(topic, context = {}) {
    const baseResponse = {
      id: topic.id,
      name: topic.name,
      description: topic.description,
      dayOfMonth: topic.dayOfMonth
    };

    // Add context-specific fields
    if (context.dayOfMonth !== undefined) {
      baseResponse.dayOfMonth = context.dayOfMonth;
    }
    if (context.month !== undefined) {
      baseResponse.month = context.month;
    }
    if (context.year !== undefined) {
      baseResponse.year = context.year;
    }

    return baseResponse;
  }
}

module.exports = AviationKnowledgeService;
