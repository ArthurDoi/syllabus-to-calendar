-- Add last_streak_date column to user_stats table
-- This tracks the last date that contributed to the streak
ALTER TABLE user_stats
ADD COLUMN last_streak_date DATE COMMENT 'Last date that contributed to the streak'
AFTER current_streak;

