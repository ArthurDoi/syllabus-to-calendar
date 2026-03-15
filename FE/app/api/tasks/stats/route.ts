import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { resolveUserId } from '@/lib/user-resolver';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = await resolveUserId(session);

    // Fetch all tasks (same query as tasks page)
    const tasksQuery = `
      (
        SELECT 
          a.id,
          a.due_date,
          a.status,
          COALESCE(a.completed_at, a.updated_at) as completed_at
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE c.user_id = ?
      )
      UNION ALL
      (
        SELECT 
          e.id,
          e.date as due_date,
          'pending' as status,
          NULL as completed_at
        FROM exams e
        JOIN courses c ON e.course_id = c.id
        WHERE c.user_id = ?
      )
      UNION ALL
      (
        SELECT 
          m.id,
          m.date as due_date,
          'pending' as status,
          NULL as completed_at
        FROM milestones m
        JOIN courses c ON m.course_id = c.id
        WHERE c.user_id = ?
      )
    `;

    const tasks = await query<{
      id: string;
      due_date: Date;
      status: 'pending' | 'in-progress' | 'completed';
      completed_at: Date | null;
    }>(tasksQuery, [userId, userId, userId]);

    // Calculate statistics (same logic as tasks page)
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdueCount = tasks.filter(t => {
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      // A task is overdue only if it's due before today (not including today)
      return dueDate < now && t.status !== 'completed';
    }).length;

    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: overdueCount,
    };

    // Get last streak date from user_stats
    const userStats = await query<{
      last_streak_date: string | null;
    }>(
      `SELECT last_streak_date FROM user_stats WHERE user_id = ?`,
      [userId]
    );
    
    const lastStreakDate = userStats.length > 0 ? userStats[0].last_streak_date : null;
    
    // Calculate streak based on new logic
    const { streak, lastStreakDate: newLastStreakDate } = calculateStreak(tasks, now, lastStreakDate);
    const bestStreak = await getBestStreak(userId, streak, newLastStreakDate);

    return NextResponse.json({ 
      stats,
      streak,
      bestStreak 
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task statistics' },
      { status: 500 }
    );
  }
}

/**
 * Calculate streak based on new logic:
 * - Streak increases when a task is marked as "Done" (once per day, even if multiple tasks completed)
 * - Streak increases on days with no pending or overdue assignments
 * - Streak is consecutive days from the start to today
 */
function calculateStreak(
  tasks: Array<{
    id: string;
    due_date: Date;
    status: 'pending' | 'in-progress' | 'completed';
    completed_at: Date | null;
  }>,
  now: Date,
  lastStreakDate: string | null
): { streak: number; lastStreakDate: string | null } {
  // Only consider assignments for streak (exams and milestones don't have status tracking)
  const assignments = tasks.filter(t => {
    return t.status === 'completed' || t.status === 'pending' || t.status === 'in-progress';
  });

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toISOString().split('T')[0];

  // Get all completed tasks with their completion dates
  const completedTasks = assignments.filter(t => t.status === 'completed' && t.completed_at);
  
  // Group completed tasks by completion date (date only, ignore time)
  const completedByDate = new Map<string, number>();
  completedTasks.forEach(task => {
    if (task.completed_at) {
      const completedDate = new Date(task.completed_at);
      completedDate.setHours(0, 0, 0, 0);
      const dateKey = completedDate.toISOString().split('T')[0];
      completedByDate.set(dateKey, (completedByDate.get(dateKey) || 0) + 1);
    }
  });

  // Get all incomplete assignments (pending or in-progress)
  const incompleteAssignments = assignments.filter(t => t.status !== 'completed');
  
  // Helper function to check if a date has any pending or overdue tasks
  // A task is "pending/overdue on a date" if:
  // - It's due on or before that date AND it's not completed
  const hasPendingOrOverdueOnDate = (checkDate: Date): boolean => {
    const checkDateKey = checkDate.toISOString().split('T')[0];
    return incompleteAssignments.some(task => {
      const dueDate = new Date(task.due_date);
      dueDate.setHours(0, 0, 0, 0);
      // Task is pending/overdue on this date if due date <= check date
      return dueDate <= checkDate;
    });
  };

  // Calculate streak by going backwards from today
  // Streak = consecutive days ending today where each day either:
  // - Has a completed task, OR
  // - Has tasks in the system AND has no pending/overdue tasks
  let streak = 0;
  let lastCountedDate: string | null = null;
  let currentDate = new Date(today);
  
  // If user has no tasks at all, streak is 0
  if (assignments.length === 0) {
    return {
      streak: 0,
      lastStreakDate: null
    };
  }
  
  // Limit to prevent infinite loops
  const maxDays = 365;
  let daysChecked = 0;
  
  // Go backwards from today until we find a day that breaks the streak
  while (daysChecked < maxDays) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    // Check if this day should count towards streak
    const hasCompletedTask = completedByDate.has(dateKey);
    const hasPendingOrOverdue = hasPendingOrOverdueOnDate(currentDate);
    
    // Day counts if:
    // 1. A task was completed on this day (only counts once per day, even if multiple tasks)
    // 2. OR there are tasks in the system AND there are no pending/overdue tasks on this day
    // Note: We already checked assignments.length > 0 above, so we know there are tasks
    if (hasCompletedTask || !hasPendingOrOverdue) {
      streak++;
      lastCountedDate = dateKey;
      currentDate.setDate(currentDate.getDate() - 1);
      daysChecked++;
    } else {
      // If there are pending/overdue tasks and no completions, streak breaks
      break;
    }
  }
  
  return {
    streak,
    lastStreakDate: lastCountedDate
  };
}

/**
 * Get or update best streak for user
 * Retrieves best streak from user_stats table and updates it if current streak is higher
 */
async function getBestStreak(
  userId: string, 
  currentStreak: number, 
  lastStreakDate: string | null
): Promise<number> {
  try {
    // Get or create user stats record
    let userStats = await query<{
      user_id: string;
      best_streak: number;
      current_streak: number;
      last_streak_date: string | null;
      last_streak_update: Date | null;
    }>(
      `SELECT user_id, best_streak, current_streak, last_streak_date, last_streak_update 
       FROM user_stats 
       WHERE user_id = ?`,
      [userId]
    );

    const today = new Date().toISOString().split('T')[0];
    
    if (userStats.length === 0) {
      // Create new user stats record
      await query(
        `INSERT INTO user_stats (user_id, best_streak, current_streak, last_streak_date, last_streak_update) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, currentStreak, currentStreak, lastStreakDate, today]
      );
      return currentStreak;
    }

    const stats = userStats[0];
    let bestStreak = stats.best_streak;
    
    // If best streak is 365 and current streak is 0, it's likely incorrect data from the bug
    // Reset best streak to 0 in this case
    if (bestStreak === 365 && currentStreak === 0) {
      bestStreak = 0;
      await query(
        `UPDATE user_stats 
         SET best_streak = ?, 
             current_streak = ?, 
             last_streak_date = ?,
             last_streak_update = ? 
         WHERE user_id = ?`,
        [0, currentStreak, lastStreakDate, today, userId]
      );
    } else if (currentStreak > bestStreak) {
      // Update best streak if current streak is higher
      await query(
        `UPDATE user_stats 
         SET best_streak = ?, 
             current_streak = ?, 
             last_streak_date = ?,
             last_streak_update = ? 
         WHERE user_id = ?`,
        [currentStreak, currentStreak, lastStreakDate, today, userId]
      );
      bestStreak = currentStreak;
    } else {
      // Just update current streak, last streak date, and last update date
      await query(
        `UPDATE user_stats 
         SET current_streak = ?, 
             last_streak_date = ?,
             last_streak_update = ? 
         WHERE user_id = ?`,
        [currentStreak, lastStreakDate, today, userId]
      );
    }

    return bestStreak;
  } catch (error) {
    console.error('Error updating user stats:', error);
    // Return current streak as fallback
    return currentStreak;
  }
}
