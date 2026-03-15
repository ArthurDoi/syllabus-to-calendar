'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

interface Course {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

interface TaskFiltersProps {
  statusFilter: 'all' | 'pending' | 'in-progress' | 'completed';
  courseFilter: string[]; // Array of course IDs
  courses: Course[];
  onStatusChange: (status: 'all' | 'pending' | 'in-progress' | 'completed') => void;
  onCourseChange: (courseIds: string[]) => void;
  stats: {
    pending: number;
    inProgress: number;
    completed: number;
  };
}

export function TaskFilters({
  statusFilter,
  courseFilter,
  courses,
  onStatusChange,
  onCourseChange,
  stats,
}: TaskFiltersProps) {
  const hasActiveFilters = statusFilter !== 'all' || courseFilter.length > 0;

  const handleCourseToggle = (courseId: string) => {
    if (courseFilter.includes(courseId)) {
      onCourseChange(courseFilter.filter(id => id !== courseId));
    } else {
      onCourseChange([...courseFilter, courseId]);
    }
  };

  const clearAllFilters = () => {
    onStatusChange('all');
    onCourseChange([]);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 h-9 px-3 font-medium transition-all",
              statusFilter !== 'all' && "bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200"
            )}
          >
            <Filter className="w-4 h-4" />
            Status
            {statusFilter !== 'all' && (
              <Badge variant="secondary" className="ml-1.5 bg-gray-200 text-gray-700 border-0">
                {statusFilter === 'in-progress' ? 'In Progress' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onStatusChange('all')}
            className={cn(statusFilter === 'all' && 'bg-gray-100')}
          >
            <div className="flex items-center justify-between w-full">
              <span>All</span>
              <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-700 border-gray-200">
                {stats.pending + stats.inProgress + stats.completed}
              </Badge>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onStatusChange('pending')}
            className={cn(statusFilter === 'pending' && 'bg-gray-100')}
          >
            <div className="flex items-center justify-between w-full">
              <span>Pending</span>
              <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-700 border-gray-200">
                {stats.pending}
              </Badge>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onStatusChange('in-progress')}
            className={cn(statusFilter === 'in-progress' && 'bg-gray-100')}
          >
            <div className="flex items-center justify-between w-full">
              <span>In Progress</span>
              <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-700 border-gray-200">
                {stats.inProgress}
              </Badge>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onStatusChange('completed')}
            className={cn(statusFilter === 'completed' && 'bg-gray-100')}
          >
            <div className="flex items-center justify-between w-full">
              <span>Completed</span>
              <Badge variant="outline" className="ml-2 bg-gray-100 text-gray-700 border-gray-200">
                {stats.completed}
              </Badge>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Course Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 h-9 px-3 font-medium transition-all",
              courseFilter.length > 0 && "bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200"
            )}
          >
            <Filter className="w-4 h-4" />
            Course
            {courseFilter.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 bg-gray-200 text-gray-700 border-0">
                {courseFilter.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
          <DropdownMenuLabel>Filter by Course</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {courses.length === 0 ? (
            <DropdownMenuItem disabled>No courses available</DropdownMenuItem>
          ) : (
            courses.map((course) => (
              <DropdownMenuCheckboxItem
                key={course.id}
                checked={courseFilter.includes(course.id)}
                onCheckedChange={() => handleCourseToggle(course.id)}
                className="flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0 bg-gray-300" />
                <span className="truncate flex-1">{course.name}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="gap-2 h-9 px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 font-medium"
        >
          <X className="w-4 h-4" />
          Clear All
        </Button>
      )}
    </div>
  );
}

