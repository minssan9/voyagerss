-- Create enhanced quizzes table
CREATE TABLE IF NOT EXISTS quizzes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Quiz unique identifier',
    topic VARCHAR(100) NOT NULL COMMENT 'Main topic category',
    knowledge_area TEXT NOT NULL COMMENT 'Specific knowledge area or subject',
    question TEXT NOT NULL COMMENT 'Quiz question content',
    option_a TEXT NOT NULL COMMENT 'Choice A',
    option_b TEXT NOT NULL COMMENT 'Choice B', 
    option_c TEXT NOT NULL COMMENT 'Choice C',
    option_d TEXT NOT NULL COMMENT 'Choice D',
    correct_answer ENUM('A','B','C','D') NOT NULL COMMENT 'Correct answer option',
    explanation TEXT DEFAULT NULL COMMENT 'Answer explanation and details',
    difficulty ENUM('beginner','intermediate','advanced') DEFAULT 'intermediate' COMMENT 'Quiz difficulty level',
    provider ENUM('gemini','anthropic','manual') NOT NULL COMMENT 'AI provider or manual entry',
    usage_count INT DEFAULT 0 COMMENT 'How many times this quiz was served',
    last_used TIMESTAMP NULL COMMENT 'Last time this quiz was used',
    is_active BOOLEAN DEFAULT true COMMENT 'Whether quiz is active for use',
    created_by VARCHAR(50) DEFAULT 'system' COMMENT 'Creator identifier',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp'
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Aviation knowledge quiz questions and answers';

-- Performance indexes
CREATE INDEX idx_quizzes_topic ON quizzes(topic);
CREATE INDEX idx_quizzes_difficulty ON quizzes(difficulty);
CREATE INDEX idx_quizzes_provider ON quizzes(provider);
CREATE INDEX idx_quizzes_usage ON quizzes(usage_count DESC);
CREATE INDEX idx_quizzes_active ON quizzes(is_active, created_at);
CREATE INDEX idx_quizzes_last_used ON quizzes(last_used);

-- Full-text search index for questions
CREATE FULLTEXT INDEX idx_quizzes_content ON quizzes(question, knowledge_area, explanation);