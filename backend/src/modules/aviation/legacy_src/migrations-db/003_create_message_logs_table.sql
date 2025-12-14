-- Create message delivery tracking table
CREATE TABLE IF NOT EXISTS message_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT 'Log entry unique identifier',
    user_id BIGINT NOT NULL COMMENT 'Reference to users.id (telegram chat_id)',
    message_type ENUM('daily_morning','daily_afternoon','daily_evening','quiz','custom','broadcast','admin') NOT NULL COMMENT 'Type of message sent',
    content_hash VARCHAR(64) DEFAULT NULL COMMENT 'SHA-256 hash for duplicate detection',
    content_preview TEXT DEFAULT NULL COMMENT 'First 200 chars of message content',
    quiz_id BIGINT DEFAULT NULL COMMENT 'Reference to quizzes.id if quiz message',
    status ENUM('sent','failed','pending','retry') DEFAULT 'pending' COMMENT 'Delivery status',
    error_message TEXT DEFAULT NULL COMMENT 'Error details if delivery failed',
    retry_count INT DEFAULT 0 COMMENT 'Number of retry attempts',
    telegram_message_id BIGINT DEFAULT NULL COMMENT 'Telegram message ID if successful',
    processing_time_ms INT DEFAULT NULL COMMENT 'Message processing time in milliseconds',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When message was sent/attempted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Log entry creation time',
    CONSTRAINT fk_message_logs_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_message_logs_quiz_id FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Message delivery tracking and audit log';

-- Performance indexes
CREATE INDEX idx_message_logs_user_id ON message_logs(user_id);
CREATE INDEX idx_message_logs_type ON message_logs(message_type);
CREATE INDEX idx_message_logs_status ON message_logs(status);
CREATE INDEX idx_message_logs_sent_at ON message_logs(sent_at);
CREATE INDEX idx_message_logs_quiz_id ON message_logs(quiz_id);
CREATE INDEX idx_message_logs_hash ON message_logs(content_hash);

-- Composite indexes for common queries
CREATE INDEX idx_message_logs_user_status ON message_logs(user_id, status);
CREATE INDEX idx_message_logs_type_date ON message_logs(message_type, sent_at);