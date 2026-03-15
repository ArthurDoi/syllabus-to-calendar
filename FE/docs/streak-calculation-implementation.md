# Streak Calculation Implementation

## Overview
This document describes the implementation of the on-time completion streak calculation system.

## Database Schema Changes

### 1. Added `completed_at` Column to Assignments Table
- **Purpose**: Track the exact timestamp when an assignment was marked as completed
- **Type**: `TIMESTAMP NULL`
- **Location**: After `status` column
- **Index**: Created for query performance

### 2. Created `user_stats` Table
- **Purpose**: Persist streak data for users
- **Columns**:
  - `user_id` (PRIMARY KEY): References users table
  - `best_streak` (INT): Highest streak ever achieved
  - `current_streak` (INT): Current active streak
  - `last_streak_update` (DATE): Last date when streak was calculated
  - `created_at`, `updated_at`: Timestamps

## Migration

### Running the Migration
```bash
cd FE
node scripts/migrate-add-completed-at.mjs
```

The migration script will:
1. Check if `completed_at` column exists before adding it
2. Check if `user_stats` table exists before creating it
3. Handle errors gracefully

## Streak Calculation Logic

### Definition
**Completion streak** = Consecutive days (going forward from streak start to today) where:
- A task was marked as "Done" (completed) on that day, OR
- There are no pending or overdue assignments on that day

### Algorithm
1. Find all completed assignments and group by completion date
2. Find all incomplete assignments (pending/in-progress)
3. Determine streak start date (earliest completion or reasonable start point)
4. For each day going forward from start date to today:
   - If a task was completed on this day: Count it (once per day, even if multiple tasks)
   - Else if there are no pending/overdue tasks: Count it
   - Else: Break streak (stop counting)
5. Return the count of consecutive days

### Key Features
- Uses `completed_at` timestamp for accurate completion time
- Only considers assignments (exams/milestones don't have status tracking)
- Multiple completions in one day only count once
- Days with no tasks count towards streak (no pending/overdue)
- Days where all tasks are completed early still count
- Limits to 365 days to prevent infinite loops

## Best Streak Tracking

### Implementation
- Stored in `user_stats` table
- Updated automatically when current streak exceeds best streak
- Persisted across sessions
- Tracks `last_streak_update` date

### Update Logic
1. Query user_stats for current user
2. If record doesn't exist, create it
3. Compare current streak with best streak
4. Update best streak if current is higher
5. Always update current streak and last update date

## API Changes

### `/api/tasks/stats` Endpoint
- Now returns `streak` and `bestStreak` in addition to stats
- Calculates streak using `completed_at` field
- Updates user_stats table automatically

### `/api/tasks/[id]` PATCH Endpoint
- Sets `completed_at = NOW()` when status changes to 'completed'
- Clears `completed_at` when status changes away from 'completed'
- Only sets `completed_at` on first completion (not on subsequent updates)

## Frontend Changes

### DashboardSidebar Component
- Fetches streak data from `/api/tasks/stats`
- Displays current streak and best streak
- Auto-refreshes every 30 seconds

## Future Improvements

1. **Backfill completed_at**: For existing completed assignments, we could:
   - Use `updated_at` as fallback
   - Or set a default date

2. **Streak notifications**: Notify users when they achieve milestones

3. **Streak history**: Track streak changes over time

4. **Exams/Milestones**: Add status tracking to include them in streak calculation

