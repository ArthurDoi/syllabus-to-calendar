import { getSession } from "@/lib/session";
import { resolveUserId } from "@/lib/user-resolver";
import { query } from "@/lib/db";
import { TasksPageClient } from "@/components/task/TasksPageClient";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: Date;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: 'assignment' | 'exam' | 'milestone';
  course_id: string;
  course_name: string;
  course_color: string;
  course_icon: string;
  location?: string;
  time?: string;
  estimated_hours?: number;
}

export default async function TasksPage() {
  const sessionResult = await getSession();
  
  // Redirect to login if not authenticated (layout should handle this, but double-check)
  if (!sessionResult.session) {
    redirect('/login');
  }
  
  const userId = await resolveUserId(sessionResult.session);

  // Fetch all tasks
  const tasksQuery = `
    (
      SELECT 
        a.id,
        a.title,
        a.description,
        a.due_date,
        a.status,
        a.priority,
        'assignment' as type,
        c.id as course_id,
        c.name as course_name,
        c.color as course_color,
        c.icon as course_icon,
        NULL as location,
        NULL as time,
        a.estimated_hours,
        a.week_number,
        a.created_at
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE c.user_id = ?
    )
    UNION ALL
    (
      SELECT 
        e.id,
        e.title,
        NULL as description,
        e.date as due_date,
        'pending' as status,
        'high' as priority,
        'exam' as type,
        c.id as course_id,
        c.name as course_name,
        c.color as course_color,
        c.icon as course_icon,
        e.location,
        e.time,
        NULL as estimated_hours,
        e.week_number,
        e.created_at
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      WHERE c.user_id = ?
    )
    UNION ALL
    (
      SELECT 
        m.id,
        m.title,
        m.description,
        m.date as due_date,
        'pending' as status,
        'medium' as priority,
        'milestone' as type,
        c.id as course_id,
        c.name as course_name,
        c.color as course_color,
        c.icon as course_icon,
        NULL as location,
        NULL as time,
        NULL as estimated_hours,
        m.week_number,
        m.created_at
      FROM milestones m
      JOIN courses c ON m.course_id = c.id
      WHERE c.user_id = ?
    )
      ORDER BY 
      CASE WHEN DATE(due_date) < CURDATE() AND status != 'completed' THEN 0 ELSE 1 END,
      due_date ASC
  `;

  const tasks = await query<Task>(tasksQuery, [userId, userId, userId]);

  // Calculate statistics
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

  // Fetch courses for filter dropdown
  const courses = await query<{
    id: string;
    name: string;
    color: string;
    icon?: string;
  }>(
    `SELECT id, name, color, icon 
     FROM courses 
     WHERE user_id = ? 
     ORDER BY name ASC`,
    [userId]
  );

  return (
    <TasksPageClient 
      initialTasks={tasks.map(t => ({
        ...t,
        due_date: t.due_date instanceof Date ? t.due_date.toISOString() : t.due_date as any,
      }))}
      initialStats={stats}
      courses={courses}
    />
  );
}

