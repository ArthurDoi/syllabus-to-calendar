-- Add completed_at column to assignments table
-- This tracks when an assignment was actually completed (not just updated)
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE, so check manually before running
ALTER TABLE assignments
ADD COLUMN completed_at TIMESTAMP NULL COMMENT 'Timestamp when assignment was marked as completed'
AFTER status;

-- Create index for better query performance
CREATE INDEX idx_completed_at ON assignments(completed_at);

