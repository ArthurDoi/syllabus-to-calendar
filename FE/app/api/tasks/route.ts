import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { query } from "@/lib/db";
import { resolveUserId } from "@/lib/user-resolver";

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
  week_number?: number;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = await resolveUserId(session);
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const overdueOnly = searchParams.get('overdue') === 'true';
    const courseFilter = searchParams.get('courses'); // Comma-separated course IDs
    const sortField = searchParams.get('sort') || 'due_date';
    const sortDirection = searchParams.get('direction') || 'asc';

    // Parse course filter
    const courseIds: string[] = courseFilter ? courseFilter.split(',').filter(Boolean) : [];
    
    // Build course filter condition
    let courseCondition = '';
    if (courseIds.length > 0) {
      const placeholders = courseIds.map(() => '?').join(',');
      courseCondition = `AND c.id IN (${placeholders})`;
    }
    
    // Build query parameters for assignments query
    const assignmentParams: any[] = [userId];
    
    // Build status filter condition (only for assignments)
    let statusCondition = '';
    if (statusFilter && statusFilter !== 'all') {
      statusCondition = `AND a.status = ?`;
      assignmentParams.push(statusFilter);
    }

    // Add course filter params to assignments
    if (courseIds.length > 0) {
      assignmentParams.push(...courseIds);
    }

    // Get all tasks (assignments, exams, milestones) in a unified query
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
        WHERE c.user_id = ? ${statusCondition} ${courseCondition}
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
        WHERE c.user_id = ? ${courseCondition}
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
        WHERE c.user_id = ? ${courseCondition}
      )
      ORDER BY 
        CASE WHEN DATE(due_date) < CURDATE() AND status != 'completed' THEN 0 ELSE 1 END,
        due_date ASC
    `;

    // Build query parameters array in order: assignments (userId, status?, courses?), exams (userId, courses?), milestones (userId, courses?)
    const queryParams: any[] = [userId];
    
    // Add status filter for assignments if needed
    if (statusFilter && statusFilter !== 'all') {
      queryParams.push(statusFilter);
    }
    
    // Add course filter for assignments if needed
    if (courseIds.length > 0) {
      queryParams.push(...courseIds);
    }
    
    // Add userId for exams
    queryParams.push(userId);
    
    // Add course filter for exams if needed
    if (courseIds.length > 0) {
      queryParams.push(...courseIds);
    }
    
    // Add userId for milestones
    queryParams.push(userId);
    
    // Add course filter for milestones if needed
    if (courseIds.length > 0) {
      queryParams.push(...courseIds);
    }

    const tasks = await query<Task>(tasksQuery, queryParams);

    // Client-side sorting (since UNION makes SQL sorting complex)
    const sortedTasks = [...tasks].sort((a, b) => {
      let comparison = 0;
      
      // Normalize dates to midnight for accurate overdue comparison
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const aDueDate = new Date(a.due_date);
      aDueDate.setHours(0, 0, 0, 0);
      const bDueDate = new Date(b.due_date);
      bDueDate.setHours(0, 0, 0, 0);
      
      // Always prioritize overdue tasks first (due before today, not including today)
      const aOverdue = aDueDate < now && a.status !== 'completed';
      const bOverdue = bDueDate < now && b.status !== 'completed';
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // Then sort by selected field
      switch (sortField) {
        case 'due_date':
          comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          break;
        case 'course_name':
          comparison = a.course_name.localeCompare(b.course_name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        default:
          comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Filter overdue tasks if requested
    let filteredTasks = sortedTasks;
    if (overdueOnly) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      filteredTasks = sortedTasks.filter(task => {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);
        // A task is overdue only if it's due before today (not including today)
        return dueDate < now && task.status !== 'completed';
      });
    }

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

    return NextResponse.json({
      success: true,
      tasks: filteredTasks,
      stats,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get tasks",
      },
      { status: 500 }
    );
  }
}

