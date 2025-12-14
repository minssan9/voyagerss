-- Create users table for subscriber management
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY COMMENT 'Telegram chat_id',
    username VARCHAR(255) DEFAULT NULL COMMENT 'Telegram @username',
    first_name VARCHAR(255) DEFAULT NULL COMMENT 'User first name',
    last_name VARCHAR(255) DEFAULT NULL COMMENT 'User last name', 
    language_code VARCHAR(10) DEFAULT 'en' COMMENT 'User language preference',
    is_subscribed BOOLEAN DEFAULT true COMMENT 'Subscription status',
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Initial subscription time',
    unsubscribed_at TIMESTAMP NULL COMMENT 'Unsubscription time',
    total_messages_received INT DEFAULT 0 COMMENT 'Message delivery counter',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last interaction time',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'User record creation',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last record update'
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='Telegram bot subscribers and user data';

-- Indexes for performance
CREATE INDEX idx_users_subscribed ON users(is_subscribed);
CREATE INDEX idx_users_activity ON users(last_activity);
CREATE INDEX idx_users_language ON users(language_code);
CREATE INDEX idx_users_username ON users(username);