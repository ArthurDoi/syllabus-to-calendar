import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { resolveUserId } from "@/lib/user-resolver";
import { getPool, queryOne } from "@/lib/db";
import type { ResultSetHeader } from "mysql2";

type RouteParams = { params: Promise<{ id: string }> };

interface UpdateCourseRequest {
  name?: string;
  code?: string;
  term?: string;
  instructor?: string;
  startDate?: string | null;
  endDate?: string | null;
  color?: string;
  icon?: string;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const userId = await resolveUserId(session);
    const resolvedParams = await params;
    const courseId = resolvedParams?.id;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // Remove dependent records first to satisfy FK constraints
    await pool.execute("DELETE FROM assignments WHERE course_id = ?", [
      courseId,
    ]);
    await pool.execute("DELETE FROM exams WHERE course_id = ?", [courseId]);
    await pool.execute("DELETE FROM milestones WHERE course_id = ?", [
      courseId,
    ]);
    await pool.execute("DELETE FROM class_schedules WHERE course_id = ?", [
      courseId,
    ]);
    await pool.execute(
      "UPDATE syllabus_uploads SET course_id = NULL WHERE course_id = ?",
      [courseId]
    );

    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM courses WHERE id = ? AND user_id = ?",
      [courseId, userId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete course error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete course",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const userId = await resolveUserId(session);
    const resolvedParams = await params;
    const courseId = resolvedParams?.id;
    const body: UpdateCourseRequest = await request.json();

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    // Verify course belongs to user
    const existingCourse = await queryOne(
      `SELECT id FROM courses WHERE id = ? AND user_id = ?`,
      [courseId, userId]
    );

    if (!existingCourse) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (body.name !== undefined) {
      updates.push("name = ?");
      values.push(body.name);
    }
    if (body.code !== undefined) {
      updates.push("code = ?");
      values.push(body.code || null);
    }
    if (body.term !== undefined) {
      updates.push("term = ?");
      values.push(body.term || null);
    }
    if (body.instructor !== undefined) {
      updates.push("instructor = ?");
      values.push(body.instructor || null);
    }
    if (body.startDate !== undefined) {
      updates.push("start_date = ?");
      values.push(body.startDate ? new Date(body.startDate) : null);
    }
    if (body.endDate !== undefined) {
      updates.push("end_date = ?");
      values.push(body.endDate ? new Date(body.endDate) : null);
    }
    if (body.color !== undefined) {
      updates.push("color = ?");
      values.push(body.color);
    }
    if (body.icon !== undefined) {
      updates.push("icon = ?");
      values.push(body.icon);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(courseId, userId);

    const pool = await getPool();
    await pool.execute(
      `UPDATE courses SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      values
    );

    // Get updated course
    const course = await queryOne(
      `SELECT id, name, code, term, instructor, start_date, end_date, color, icon, created_at, updated_at 
       FROM courses WHERE id = ?`,
      [courseId]
    );

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Update course error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update course",
      },
      { status: 500 }
    );
  }
}

