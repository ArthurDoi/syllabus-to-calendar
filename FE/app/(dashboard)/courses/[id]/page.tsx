import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { queryOne } from "@/lib/db";
import { resolveUserId } from "@/lib/user-resolver";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DeleteCourseButton } from "@/components/course/DeleteCourseButton";
import { EditCourseIcon } from "@/components/course/EditCourseIcon";
import { COURSE_ICONS } from "@/constants/course-icons";
import { LucideIcon } from "lucide-react";

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
}

type CoursePageParams = { params: Promise<{ id: string }> };

export default async function CourseDetailPage({ params }: CoursePageParams) {
  const sessionResult = await getSession();
  
  // Redirect to login if not authenticated (layout should handle this, but double-check)
  if (!sessionResult.session) {
    redirect('/login');
  }
  
  const userId = await resolveUserId(sessionResult.session);
  const resolvedParams = await params;
  const id = resolvedParams?.id;

  if (!id) {
    notFound();
  }

  const course = await queryOne<Course>(
    `SELECT id, name, code, term, instructor, start_date, end_date, color, icon 
     FROM courses 
     WHERE id = ? AND user_id = ?`,
    [id, userId]
  );

  if (!course) {
    notFound();
  }

  // Get icon component from icon name
  const getIconComponent = (iconName?: string): LucideIcon => {
    const iconData = COURSE_ICONS.find(i => i.name === iconName);
    return iconData ? iconData.icon : COURSE_ICONS[0].icon;
  };

  const IconComponent = getIconComponent(course.icon);

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link href="/courses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </Link>
      </div>

      <Card className="p-6 bg-white border border-gray-200 shadow-sm">
        <div className="mb-4 flex items-center gap-4">
          <div 
            className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ 
              backgroundColor: `${course.color}15`,
            }}
          >
            <IconComponent 
              className="w-8 h-8" 
              style={{ color: course.color }}
            />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{course.name}</h1>
          </div>
          <EditCourseIcon
            courseId={course.id}
            currentIcon={course.icon || 'Calendar'}
            courseColor={course.color}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {course.code && (
            <div>
              <p className="text-sm text-gray-500">Course Code</p>
              <p className="font-medium">{course.code}</p>
            </div>
          )}
          {course.term && (
            <div>
              <p className="text-sm text-gray-500">Term</p>
              <p className="font-medium">{course.term}</p>
            </div>
          )}
          {course.instructor && (
            <div>
              <p className="text-sm text-gray-500">Instructor</p>
              <p className="font-medium">{course.instructor}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <p className="font-medium">
              {new Date(course.start_date).toLocaleDateString()} -{" "}
              {new Date(course.end_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <p className="text-sm text-gray-500 mb-4">
            Week-by-week view and calendar integration coming soon!
          </p>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/courses/${id}/edit`}>Edit Course</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/calendar?courseId=${id}`}>View Calendar</Link>
            </Button>
            <DeleteCourseButton courseId={id} courseName={course.name} />
          </div>
        </div>
      </Card>
    </div>
  );
}
