import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { query, queryOne } from "@/lib/db";
import { resolveUserId } from "@/lib/user-resolver";
import { getPool } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

interface UpdateTaskRequest {
  status?: 'pending' | 'in-progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const userId = await resolveUserId(session);
    const resolvedParams = await params;
    const taskId = resolvedParams?.id;
    const body: UpdateTaskRequest = await request.json();

    if (!taskId) {
      return NextResponse.json(
        { error: "Task ID is required" },
        { status: 400 }
      );
    }

    // Determine which table the task belongs to by checking all three
    const assignment = await queryOne(
      `SELECT a.id, a.course_id 
       FROM assignments a
       JOIN courses c ON a.course_id = c.id
       WHERE a.id = ? AND c.user_id = ?`,
      [taskId, userId]
    );

    const exam = await queryOne(
      `SELECT e.id, e.course_id 
       FROM exams e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id = ? AND c.user_id = ?`,
      [taskId, userId]
    );

    const milestone = await queryOne(
      `SELECT m.id, m.course_id 
       FROM milestones m
       JOIN courses c ON m.course_id = c.id
       WHERE m.id = ? AND c.user_id = ?`,
      [taskId, userId]
    );

    if (!assignment && !exam && !milestone) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const pool = await getPool();
    let updateQuery = '';
    const updates: string[] = [];
    const values: any[] = [];

    if (body.status !== undefined) {
      // Only assignments have status field
      if (assignment) {
        // Get current status to check if we're changing to/from completed
        const currentTask = await queryOne(
          `SELECT status, completed_at FROM assignments WHERE id = ?`,
          [taskId]
        );
        
        updates.push('status = ?');
        values.push(body.status);
        
        // Set completed_at when status changes to 'completed'
        if (body.status === 'completed') {
          // Only set completed_at if it's not already set (first time completing)
          if (currentTask && currentTask.status !== 'completed') {
            updates.push('completed_at = NOW()');
          }
        } else if ((body.status as string) !== 'completed' && currentTask?.status === 'completed') {
          // Clear completed_at if status changes away from completed
          updates.push('completed_at = NULL');
        }
      }
    }

    if (body.priority !== undefined) {
      // Only assignments have priority field
      if (assignment) {
        updates.push('priority = ?');
        values.push(body.priority);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    if (assignment) {
      values.push(taskId);
      await pool.execute(
        `UPDATE assignments SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } else {
      // Exams and milestones don't have status/priority, return success but no-op
      return NextResponse.json({
        success: true,
        message: "Task updated (exams and milestones don't support status/priority)",
      });
    }

    // Get updated task
    const updatedTask = await queryOne(
      `SELECT 
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
        a.estimated_hours,
        a.week_number,
        a.created_at
      FROM assignments a
      JOIN courses c ON a.course_id = c.id
      WHERE a.id = ?`,
      [taskId]
    );

    return NextResponse.json({
      success: true,
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update task",
      },
      { status: 500 }
    );
  }
}

