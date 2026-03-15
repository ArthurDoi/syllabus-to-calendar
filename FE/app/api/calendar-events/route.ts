import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query } from '@/lib/db';
import { resolveUserId } from '@/lib/user-resolver';

const EVENT_COLORS: Record<string, { bg: string; text?: string }> = {
    assignment: { bg: '#2563eb', text: '#ffffff' }, // blue
    exam: { bg: '#dc2626', text: '#ffffff' }, // red
};

const getColorsForType = (type: string, fallback: string) => {
    const config = EVENT_COLORS[type];
    return {
        backgroundColor: config?.bg ?? fallback,
        textColor: config?.text ?? '#ffffff',
        indicatorColor: config?.bg ?? fallback,
    };
};

// Interface for Assignments and Exams
interface DbEventItem {
    id: string;
    title: string;
    date?: string;
    course_name: string;
    course_color: string;
    type: 'assignment' | 'exam';
}

// Interface for Class Schedules (Recurring)
interface DbClassItem {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    course_name: string;
    course_color: string;
    course_start_date: string;
    course_end_date: string;
}

// Interface for Milestones
interface DbMilestoneItem {
    id: string;
    title: string;
    date: string;
    course_name: string;
    course_color: string;
    type: 'milestone';
}

export async function GET(request: Request) {
    try {
        const session = await requireAuth();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = await resolveUserId(session);

        // Get courseId from query parameter
        const { searchParams } = new URL(request.url);
        const courseId = searchParams.get('courseId');

        const events = [];

        // --- Query 1: Get Assignments ---
        let assignmentQuery = `SELECT 
            a.id, a.title, a.due_date as date, 
            c.name as course_name, c.color as course_color, 'assignment' as type
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE c.user_id = ?`;

        const assignmentParams: any[] = [userId];

        if (courseId) {
            assignmentQuery += ` AND c.id = ?`;
            assignmentParams.push(courseId);
        }

        const assignments = await query<DbEventItem>(assignmentQuery, assignmentParams);

        // --- Query 2: Get Exams ---
        let examQuery = `SELECT 
            e.id, e.title, e.date,
            c.name as course_name, c.color as course_color, 'exam' as type
        FROM exams e
        JOIN courses c ON e.course_id = c.id
        WHERE c.user_id = ?`;

        const examParams: any[] = [userId];

        if (courseId) {
            examQuery += ` AND c.id = ?`;
            examParams.push(courseId);
        }

        const exams = await query<DbEventItem>(examQuery, examParams);

        // --- Query 3: Get Milestones ---
        let milestoneQuery = `SELECT 
            m.id, m.title, m.date,
            c.name as course_name, c.color as course_color, 'milestone' as type
        FROM milestones m
        JOIN courses c ON m.course_id = c.id
        WHERE c.user_id = ?`;

        const milestoneParams: any[] = [userId];

        if (courseId) {
            milestoneQuery += ` AND c.id = ?`;
            milestoneParams.push(courseId);
        }

        const milestones = await query<DbMilestoneItem>(milestoneQuery, milestoneParams);

        // --- Query 4: Get Class Schedules (Recurring) ---
        let classQuery = `SELECT 
            cs.id, cs.day_of_week, cs.start_time, cs.end_time,
            c.name as course_name, c.color as course_color,
            c.start_date as course_start_date, 
            c.end_date as course_end_date
        FROM class_schedules cs
        JOIN courses c ON cs.course_id = c.id
        WHERE c.user_id = ?`;

        const classParams: any[] = [userId];

        if (courseId) {
            classQuery += ` AND c.id = ?`;
            classParams.push(courseId);
        }

        const classSchedules = await query<DbClassItem>(classQuery, classParams);

        // --- Format Assignments ---
        for (const item of assignments) {
            if (item.date) {
                const colors = getColorsForType(item.type, item.course_color);
                events.push({
                    id: `assign-${item.id}`,
                    title: item.title,
                    start: item.date,
                    backgroundColor: colors.backgroundColor,
                    textColor: colors.textColor,
                    extendedProps: {
                        type: item.type,
                        courseName: item.course_name,
                        indicatorColor: colors.indicatorColor,
                    }
                });
            }
        }

        // --- Format Exams ---
        for (const item of exams) {
            if (item.date) {
                const colors = getColorsForType(item.type, item.course_color);
                events.push({
                    id: `exam-${item.id}`,
                    title: item.title,
                    start: item.date,
                    backgroundColor: colors.backgroundColor,
                    textColor: colors.textColor,
                    extendedProps: {
                        type: item.type,
                        courseName: item.course_name,
                        indicatorColor: colors.indicatorColor,
                    }
                });
            }
        }

        // --- Format Milestones ---
        for (const item of milestones) {
            if (item.date) {
                events.push({
                    id: `milestone-${item.id}`,
                    title: item.title,
                    start: item.date,
                    allDay: true,
                    backgroundColor: item.course_color,
                    textColor: '#ffffff',
                    extendedProps: {
                        type: item.type,
                        courseName: item.course_name,
                        indicatorColor: item.course_color,
                    }
                });
            }
        }

        // --- Format Class Schedules (Recurring) ---
        for (const item of classSchedules) {
            events.push({
                id: `class-${item.id}`,
                title: item.course_name,
                daysOfWeek: [item.day_of_week],
                startTime: item.start_time,
                endTime: item.end_time,
                startRecur: item.course_start_date,
                endRecur: item.course_end_date,
                backgroundColor: item.course_color,
                textColor: '#ffffff',
                extendedProps: {
                    type: 'class',
                    courseName: item.course_name,
                    indicatorColor: item.course_color,
                }
            });
        }

        return NextResponse.json(events);

    } catch (error) {
        console.error('Error fetching calendar events:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: 'Server error', details: errorMessage }, { status: 500 });
    }
}
