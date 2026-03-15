import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import { resolveUserId } from "@/lib/user-resolver";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseFilter } from "@/components/course/CourseFilter";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

interface Course {
  id: string;
  name: string;
  code: string | null;
  term: string | null;
  instructor: string | null;
  start_date: Date;
  end_date: Date;
  color: string;
  icon?: string;
  created_at: Date;
}

export default async function CoursesPage() {
  // Layout handles authentication check, so we can safely get session here
  // The layout will redirect if not authenticated, so if we reach here, we have a session
  const sessionResult = await getSession();
  
  // Type guard - should never be null due to layout protection
  if (!sessionResult.session) {
    redirect('/login');
    return; // TypeScript needs this
  }
  
  const userId = await resolveUserId(sessionResult.session);

  // Fetch courses with error handling to prevent infinite re-renders
  let courses: Course[] = [];
  try {
    courses = await query<Course>(
      `SELECT id, name, code, term, instructor, start_date, end_date, color, icon, created_at 
       FROM courses 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    );
  } catch (error) {
    console.error('Error fetching courses:', error);
    // Return empty array instead of throwing to prevent infinite re-renders
    courses = [];
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500 mb-2">
              Courses
            </p>
            <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
            <p className="text-sm text-gray-500 mt-1">
              {courses.length === 0
                ? 'Upload a syllabus or add a course manually to start planning.'
                : `Tracking ${courses.length} ${courses.length === 1 ? 'course' : 'courses'} across the term.`}
            </p>
          </div>
          <Link href="/courses/new">
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all">
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Content Section */}
      {courses.length === 0 ? (
        <Card className="p-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-gray-200">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Plus className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
              Get started by uploading your first course syllabus or creating a course manually.
            </p>
            <Link href="/courses/new">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Course
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

