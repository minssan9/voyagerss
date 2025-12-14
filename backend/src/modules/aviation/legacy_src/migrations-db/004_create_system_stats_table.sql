-- Create system statistics and configuration table
CREATE TABLE IF NOT EXISTS system_stats (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Stats entry identifier',
    metric_name VARCHAR(100) NOT NULL COMMENT 'Name of the metric being tracked',
    metric_value TEXT NOT NULL COMMENT 'Value of the metric (JSON or simple value)',
    metric_type ENUM('counter','gauge','histogram','config') DEFAULT 'gauge' COMMENT 'Type of metric',
    category VARCHAR(50) DEFAULT 'general' COMMENT 'Metric category (users, quizzes, messages, etc.)',
    description TEXT DEFAULT NULL COMMENT 'Human readable description',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When this metric was recorded',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'First time this metric was created',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update time'
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='System metrics, statistics, and configuration storage';

-- Unique constraint for metric tracking
CREATE UNIQUE INDEX idx_system_stats_metric ON system_stats(metric_name, category);

-- Performance indexes
CREATE INDEX idx_system_stats_type ON system_stats(metric_type);
CREATE INDEX idx_system_stats_category ON system_stats(category);
CREATE INDEX idx_system_stats_recorded ON system_stats(recorded_at);

-- Insert initial system metrics
INSERT INTO system_stats (metric_name, metric_value, metric_type, category, description) VALUES
('database_version', '1.0.0', 'config', 'system', 'Current database schema version'),
('bot_start_time', UNIX_TIMESTAMP(), 'config', 'system', 'Last bot startup timestamp'),
('total_users', '0', 'counter', 'users', 'Total registered users'),
('active_subscribers', '0', 'gauge', 'users', 'Currently subscribed users'),
('total_quizzes', '0', 'counter', 'quizzes', 'Total quizzes in database'),
('messages_sent_today', '0', 'counter', 'messages', 'Messages sent today'),
('daily_schedule_enabled', 'true', 'config', 'system', 'Whether daily message scheduling is active')
ON DUPLICATE KEY UPDATE
metric_value = VALUES(metric_value),
updated_at = CURRENT_TIMESTAMP;