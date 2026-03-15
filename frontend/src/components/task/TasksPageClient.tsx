'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { TaskSort, SortField, SortDirection } from './TaskSort';
import { Card } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { eventService, courseService } from '@/lib/services';
import type { CalEvent, Course } from '@/types';

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
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

export function TasksPageClient() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [courseFilter, setCourseFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Load filters from session storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedStatus = sessionStorage.getItem('taskStatusFilter');
      const savedCourses = sessionStorage.getItem('taskCourseFilter');
      const savedSortField = sessionStorage.getItem('taskSortField');
      const savedSortDirection = sessionStorage.getItem('taskSortDirection');
      
      if (savedStatus) setStatusFilter(savedStatus as any);
      if (savedCourses) setCourseFilter(JSON.parse(savedCourses));
      if (savedSortField) setSortField(savedSortField as SortField);
      if (savedSortDirection) setSortDirection(savedSortDirection as SortDirection);
    }
  }, []);

  // Save filters to session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('taskStatusFilter', statusFilter);
      sessionStorage.setItem('taskCourseFilter', JSON.stringify(courseFilter));
      sessionStorage.setItem('taskSortField', sortField);
      sessionStorage.setItem('taskSortDirection', sortDirection);
    }
  }, [statusFilter, courseFilter, sortField, sortDirection]);

  // Map CalEvent back to Task to reuse UI components cleanly
  const tasks: Task[] = useMemo(() => {
    return events.map(ev => {
      const course = courses.find(c => c.id === ev.course_id);
      return {
        id: ev.id,
        title: ev.title,
        description: ev.description || null,
        due_date: ev.start_time || new Date().toISOString(),
        status: (ev.status as 'pending' | 'in-progress' | 'completed') || 'pending',
        priority: 'medium', // Default
        type: (ev.label as 'assignment' | 'exam' | 'milestone') || 'assignment',
        course_id: ev.course_id || '',
        course_name: course ? course.name : 'Unknown Course',
        course_color: course ? course.color : '#9ca3af',
        course_icon: course?.icon || '',
        location: undefined,
        time: undefined,
        estimated_hours: undefined,
      };
    });
  }, [events, courses]);

  // Derived filtered & sorted tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== 'all') {
      result = result.filter(t => t.status === statusFilter);
    }
    if (courseFilter.length > 0) {
      result = result.filter(t => courseFilter.includes(t.course_id));
    }
    result = result.sort((a, b) => {
      if (sortField === 'due_date') {
        const valA = new Date(a.due_date).getTime();
        const valB = new Date(b.due_date).getTime();
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });
    return result;
  }, [tasks, statusFilter, courseFilter, sortField, sortDirection]);

  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdueCount = tasks.filter(t => {
      const dueDate = new Date(t.due_date);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < now && t.status !== 'completed';
    }).length;

    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      overdue: overdueCount,
    };
  }, [tasks]);

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedEvents, fetchedCourses] = await Promise.all([
        eventService.list(),
        courseService.list()
      ]);
      setEvents(fetchedEvents);
      setCourses(fetchedCourses);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Tasks
            </h1>
            <p className="text-gray-500 max-w-2xl leading-relaxed">
              {stats.total > 0
                ? 'Stay organized and track your progress across all your courses.'
                : 'Welcome to your task board. Upload a syllabus or add a milestone to start building your plan.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/chat">
              <Button variant="outline" className="bg-white hover:bg-gray-50 border-gray-200 shadow-sm transition-all hover:shadow-md">
                Ask Assistant
              </Button>
            </Link>
            <Button 
              className="gap-2 shadow-md hover:shadow-lg transition-all bg-primary hover:bg-primary/90" 
              onClick={() => router.push('/courses')}
            >
              <Plus className="w-4 h-4" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Filters and Sort Bar */}
        {stats.total > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
            <TaskFilters
              statusFilter={statusFilter}
              courseFilter={courseFilter}
              courses={courses}
              onStatusChange={setStatusFilter}
              onCourseChange={setCourseFilter}
              stats={{
                pending: stats.pending,
                inProgress: stats.inProgress,
                completed: stats.completed,
              }}
            />
            <TaskSort
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={(field, direction) => {
                setSortField(field);
                setSortDirection(direction);
              }}
            />
          </div>
        )}

        {/* Task List */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">Loading tasks...</p>
            </div>
          ) : (
            <TaskList 
              tasks={filteredTasks} 
              onTaskUpdate={refreshTasks} 
              loading={loading}
              onAddTask={() => router.push('/courses')}
              onStatusChange={async (taskId, status) => {
                try {
                  await eventService.update(taskId, { status });
                  refreshTasks();
                } catch (error) {
                  console.error('Error updating task status:', error);
                }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

