-- User statistics table for tracking streaks and other user metrics
CREATE TABLE IF NOT EXISTS user_stats (
  user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci PRIMARY KEY,
  best_streak INT DEFAULT 0 COMMENT 'Highest streak ever achieved',
  current_streak INT DEFAULT 0 COMMENT 'Current active streak',
  last_streak_date DATE COMMENT 'Last date that contributed to the streak',
  last_streak_update DATE COMMENT 'Last date when streak was calculated',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

