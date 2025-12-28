/**
 * Data Transfer Object for Quiz
 * Represents quiz data structure for API responses
 */
class QuizDTO {
  constructor(data) {
    this.id = data.id;
    this.topic = data.topic;
    this.knowledgeArea = data.knowledge_area;
    this.question = data.question;
    this.options = data.options ? JSON.parse(data.options) : [];
    this.correctAnswer = data.correct_answer;
    this.explanation = data.explanation;
    this.difficultyLevel = data.difficulty_level;
    this.provider = data.provider;
    this.createdAt = data.created_at;
    this.isActive = data.is_active;
  }

  /**
   * Create QuizDTO from database row
   * @param {Object} dbRow - Database row object
   * @returns {QuizDTO}
   */
  static fromDatabase(dbRow) {
    return new QuizDTO(dbRow);
  }

  /**
   * Convert to plain object for API response
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      topic: this.topic,
      knowledgeArea: this.knowledgeArea,
      question: this.question,
      options: this.options,
      correctAnswer: this.correctAnswer,
      explanation: this.explanation,
      difficultyLevel: this.difficultyLevel,
      provider: this.provider,
      createdAt: this.createdAt,
      isActive: this.isActive
    };
  }

  /**
   * Create QuizDTO from AI response
   * @param {Object} aiResponse - AI generated quiz data
   * @param {string} topic - Quiz topic
   * @param {string} knowledgeArea - Knowledge area
   * @param {string} provider - AI provider name
   * @returns {QuizDTO}
   */
  static fromAIResponse(aiResponse, topic, knowledgeArea, provider) {
    return new QuizDTO({
      id: null,
      topic,
      knowledge_area: knowledgeArea,
      question: aiResponse.question,
      options: JSON.stringify(aiResponse.options),
      correct_answer: aiResponse.correctAnswer,
      explanation: aiResponse.explanation,
      difficulty_level: aiResponse.difficultyLevel || 'intermediate',
      provider,
      created_at: new Date().toISOString(),
      is_active: true
    });
  }

  /**
   * Validate quiz data
   * @param {Object} data - Quiz data to validate
   * @returns {Object} - Validation result
   */
  static validate(data) {
    const errors = [];
    const validDifficultyLevels = ['beginner', 'intermediate', 'advanced'];

    if (!data.question || data.question.trim().length === 0) {
      errors.push('Quiz question is required');
    }

    if (data.question && data.question.length > 500) {
      errors.push('Quiz question must be less than 500 characters');
    }

    if (!data.options || !Array.isArray(data.options) || data.options.length < 2) {
      errors.push('Quiz must have at least 2 options');
    }

    if (data.options && data.options.length > 6) {
      errors.push('Quiz cannot have more than 6 options');
    }

    if (data.correctAnswer === undefined || data.correctAnswer === null) {
      errors.push('Correct answer is required');
    }

    if (data.correctAnswer !== undefined && 
        (data.correctAnswer < 0 || data.correctAnswer >= (data.options?.length || 0))) {
      errors.push('Correct answer must be a valid option index');
    }

    if (data.difficultyLevel && !validDifficultyLevels.includes(data.difficultyLevel)) {
      errors.push(`Difficulty level must be one of: ${validDifficultyLevels.join(', ')}`);
    }

    if (data.topic && data.topic.length > 100) {
      errors.push('Topic must be less than 100 characters');
    }

    if (data.knowledgeArea && data.knowledgeArea.length > 200) {
      errors.push('Knowledge area must be less than 200 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = QuizDTO;
