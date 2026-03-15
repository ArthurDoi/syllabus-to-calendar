'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, LucideIcon, Edit2, Trash2, Loader2 } from 'lucide-react';
import { COURSE_ICONS } from '@/constants/course-icons';

interface CourseCardProps {
  course: {
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
  };
}

export function CourseCard({ course }: CourseCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const startDate = new Date(course.start_date);
  const endDate = new Date(course.end_date);

  // Get icon component from icon name
  const getIconComponent = (iconName?: string): LucideIcon => {
    const iconData = COURSE_ICONS.find(i => i.name === iconName);
    return iconData ? iconData.icon : Calendar;
  };

  const IconComponent = getIconComponent(course.icon);

  // Convert hex to rgba for subtle background tint
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/courses/${course.id}`);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;

    const confirmed = window.confirm(`Delete "${course.name}"? This can’t be undone.`);
    if (!confirmed) return;

    try {
      setDeleting(true);
      setActionError(null);
      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Failed to delete course');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting course:', error);
      setActionError(error instanceof Error ? error.message : 'Unable to delete course.');
      setDeleting(false);
    }
  };

  return (
    <Link href={`/courses/${course.id}`}>
      <Card
        className="p-4 bg-white border-l-4 cursor-pointer group relative overflow-hidden transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] active:shadow-md"
        style={{
          borderLeftColor: course.color,
          backgroundColor: hexToRgba(course.color, 0.02)
        }}
      >
        {/* Subtle gradient overlay */}
        <div
          className="absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${course.color} 0%, transparent 70%)`
          }}
        />

        <div className="flex items-start gap-4 relative z-10">
          {/* Color indicator with icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: hexToRgba(course.color, 0.1) }}
          >
            <IconComponent
              className="w-6 h-6"
              style={{ color: course.color }}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base text-gray-900 mb-1 truncate">
                  {course.name}
                </h3>
                {course.code && (
                  <span
                    className="inline-block px-2 py-0.5 text-xs font-medium rounded-md mb-1"
                    style={{
                      backgroundColor: hexToRgba(course.color, 0.15),
                      color: course.color
                    }}
                  >
                    {course.code}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all duration-150 active:scale-95"
                  onClick={handleEditClick}
                  aria-label={`Edit ${course.name} course`}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-150 active:scale-95"
                  onClick={handleDeleteClick}
                  aria-label={`Delete ${course.name} course`}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Course details */}
            <div className="space-y-1.5 mb-3">
              {course.term && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium">
                    {course.term}
                  </span>
                </div>
              )}
              {course.instructor && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Instructor:</span>
                  <span>{course.instructor}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="p-1.5 rounded-md"
                  style={{ backgroundColor: hexToRgba(course.color, 0.1) }}
                >
                  <IconComponent
                    className="w-3 h-3"
                    style={{ color: course.color }}
                  />
                </div>
                <span className="text-gray-600">
                  {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
            {actionError && (
              <p className="mt-2 text-xs text-red-500">{actionError}</p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

