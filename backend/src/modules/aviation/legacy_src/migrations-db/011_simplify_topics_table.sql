-- Recreate topics table with simplified structure
-- Drop existing topics table and recreate with clean structure

DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS topics;

-- Create simplified topics table
CREATE TABLE topics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  day_of_month TINYINT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  topic_category VARCHAR(100) DEFAULT 'General',
  difficulty_level ENUM('beginner', 'intermediate', 'advanced', 'expert') DEFAULT 'intermediate',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_day_of_month (day_of_month),
  INDEX idx_topic_category (topic_category),
  INDEX idx_difficulty_level (difficulty_level),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Essential subjects table (kept - required for quiz system)
CREATE TABLE subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  topic_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  difficulty_level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'intermediate',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);