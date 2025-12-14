const IQuizRepository = require('../interfaces/IQuizRepository');

/**
 * MySQL implementation of Quiz Repository
 * Handles all quiz-related database operations
 */
class MySQLQuizRepository extends IQuizRepository {
  constructor(database) {
    super();
    this.db = database;
  }

  /**
   * Get all active quizzes
   * @returns {Promise<Array>} Array of quiz records
   */
  async findAll() {
    const sql = `
      SELECT * FROM quizzes 
      WHERE is_active = 1
      ORDER BY created_at DESC
    `;
    return await this.db.all(sql);
  }

  /**
   * Get quiz by ID
   * @param {number} id - Quiz ID
   * @returns {Promise<Object|null>} Quiz record or null
   */
  async findById(id) {
    const sql = `
      SELECT * FROM quizzes 
      WHERE id = ? AND is_active = 1
    `;
    return await this.db.get(sql, [id]);
  }

  /**
   * Get quizzes by topic
   * @param {string} topic - Quiz topic
   * @returns {Promise<Array>} Array of quiz records
   */
  async findByTopic(topic) {
    const sql = `
      SELECT * FROM quizzes 
      WHERE topic = ? AND is_active = 1
      ORDER BY created_at DESC
    `;
    return await this.db.all(sql, [topic]);
  }

  /**
   * Get quizzes by difficulty level
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of quiz records
   */
  async findByDifficulty(difficultyLevel) {
    const sql = `
      SELECT * FROM quizzes 
      WHERE difficulty_level = ? AND is_active = 1
      ORDER BY created_at DESC
    `;
    return await this.db.all(sql, [difficultyLevel]);
  }

  /**
   * Get random quiz
   * @param {Object} options - Filter options
   * @returns {Promise<Object|null>} Random quiz record or null
   */
  async findRandom(options = {}) {
    let sql = `
      SELECT * FROM quizzes 
      WHERE is_active = 1
    `;
    const params = [];

    if (options.topic) {
      sql += ' AND topic = ?';
      params.push(options.topic);
    }

    if (options.difficultyLevel) {
      sql += ' AND difficulty_level = ?';
      params.push(options.difficultyLevel);
    }

    sql += ' ORDER BY RAND() LIMIT 1';
    
    return await this.db.get(sql, params);
  }

  /**
   * Create new quiz
   * @param {Object} quizData - Quiz data
   * @returns {Promise<number>} Inserted quiz ID
   */
  async create(quizData) {
    const sql = `
      INSERT INTO quizzes (topic, knowledge_area, question, options, correct_answer, explanation, difficulty, provider, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await this.db.execute(sql, [
      quizData.topic ?? '',
      quizData.knowledgeArea ?? '',
      quizData.question ?? '',
      quizData.options !== undefined ? JSON.stringify(quizData.options) : '',
      quizData.correctAnswer ?? '',
      quizData.explanation ?? '',
      quizData.difficulty || 'intermediate',
      quizData.provider || 'unknown',
      quizData.isActive !== undefined ? quizData.isActive : true
    ]);
    return result.insertId;
  }

  /**
   * Update quiz
   * @param {number} id - Quiz ID
   * @param {Object} quizData - Updated quiz data
   * @returns {Promise<boolean>} Success status
   */
  async update(id, quizData) {
    const fields = [];
    const values = [];

    if (quizData.question !== undefined) {
      fields.push('question = ?');
      values.push(quizData.question);
    }
    if (quizData.options !== undefined) {
      fields.push('options = ?');
      values.push(JSON.stringify(quizData.options));
    }
    if (quizData.correctAnswer !== undefined) {
      fields.push('correct_answer = ?');
      values.push(quizData.correctAnswer);
    }
    if (quizData.explanation !== undefined) {
      fields.push('explanation = ?');
      values.push(quizData.explanation);
    }
    if (quizData.difficultyLevel !== undefined) {
      fields.push('difficulty_level = ?');
      values.push(quizData.difficultyLevel);
    }
    if (quizData.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(quizData.isActive);
    }

    if (fields.length === 0) {
      return true; // No fields to update
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const sql = `UPDATE quizzes SET ${fields.join(', ')} WHERE id = ?`;
    const result = await this.db.execute(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Soft delete quiz
   * @param {number} id - Quiz ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `
      UPDATE quizzes 
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const result = await this.db.execute(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Search quizzes
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Array of matching quizzes
   */
  async search(query, options = {}) {
    const { topic, difficultyLevel, limit = 20, offset = 0 } = options;
    
    let sql = `
      SELECT * FROM quizzes 
      WHERE is_active = 1
      AND (question LIKE ? OR explanation LIKE ?)
    `;
    const params = [`%${query}%`, `%${query}%`];

    if (topic) {
      sql += ' AND topic = ?';
      params.push(topic);
    }

    if (difficultyLevel) {
      sql += ' AND difficulty_level = ?';
      params.push(difficultyLevel);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await this.db.all(sql, params);
  }

  /**
   * Get quiz statistics
   * @returns {Promise<Object>} Quiz statistics
   */
  async getStats() {
    const totalQuizzes = await this.db.get('SELECT COUNT(*) as count FROM quizzes WHERE is_active = 1');
    const quizzesByDifficulty = await this.db.all(`
      SELECT difficulty_level, COUNT(*) as count 
      FROM quizzes 
      WHERE is_active = 1 
      GROUP BY difficulty_level
    `);
    const quizzesByProvider = await this.db.all(`
      SELECT provider, COUNT(*) as count 
      FROM quizzes 
      WHERE is_active = 1 
      GROUP BY provider
    `);
    const recentQuizzes = await this.db.get(`
      SELECT COUNT(*) as count
      FROM quizzes 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) 
      AND is_active = 1
    `);
    
    return {
      totalQuizzes: totalQuizzes.count,
      quizzesByDifficulty: quizzesByDifficulty.reduce((acc, item) => {
        acc[item.difficulty_level] = item.count;
        return acc;
      }, {}),
      quizzesByProvider: quizzesByProvider.reduce((acc, item) => {
        acc[item.provider] = item.count;
        return acc;
      }, {}),
      recentQuizzesCount: recentQuizzes.count
    };
  }

  /**
   * Get recent quizzes
   * @param {number} limit - Number of recent quizzes to return
   * @returns {Promise<Array>} Array of recent quiz records
   */
  async findRecent(limit = 10) {
    const sql = `
      SELECT * FROM quizzes 
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT ?
    `;
    return await this.db.all(sql, [limit]);
  }

  /**
   * Save quiz (compatibility method)
   * @param {string} topic - Quiz topic
   * @param {string} knowledgeArea - Knowledge area
   * @param {Object} quizData - Quiz data with prompt and result
   * @param {string} quizData.prompt - AI prompt used to generate quiz
   * @param {Object} quizData.result - Generated quiz result
   * @param {string} provider - AI provider name
   * @returns {Promise<number>} Inserted quiz ID
   */
  async saveQuiz(topic, knowledgeArea, { prompt, result }, provider) {
    const quizRecord = {
      topic,
      knowledgeArea,
      question: prompt,
      options: '',
      correctAnswer: '',
      explanation: result,
      difficulty: result.difficultyLevel || 'intermediate',
      provider
    };

    return await this.create(quizRecord);
  }

  /**
   * Get random quiz (compatibility method)
   * @returns {Promise<Object|null>} Random quiz record or null
   */
  async getRandomQuiz() {
    return await this.findRandom();
  }

  /**
   * Format quiz for Telegram (compatibility method)
   * @param {Object} quiz - Quiz record
   * @returns {string} Formatted quiz string
   */
  formatQuizForTelegram(quiz) {
    if (!quiz) return 'No quiz available';
    
    let message = `🧠 <b>퀴즈</b>\n\n`;
    message += `📚 <b>주제</b>: ${quiz.topic}\n`;
    message += `🎯 <b>영역</b>: ${quiz.knowledge_area}\n\n`;
    message += `❓ <b>문제</b>\n${quiz.question}\n\n`;
    
    if (quiz.options && Array.isArray(quiz.options)) {
      quiz.options.forEach((option, index) => {
        message += `${String.fromCharCode(65 + index)}. ${option}\n`;
      });
    }
    
    message += `\n💡 <b>정답</b>: ${String.fromCharCode(65 + quiz.correct_answer)}`;
    
    if (quiz.explanation) {
      message += `\n\n📖 <b>설명</b>\n${quiz.explanation}`;
    }
    
    return message;
  }

  /**
   * Get quiz stats (compatibility method)
   * @returns {Promise<Object>} Quiz statistics
   */
  async getQuizStats() {
    return await this.getStats();
  }
}

module.exports = MySQLQuizRepository;
