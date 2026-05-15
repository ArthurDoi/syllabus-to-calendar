'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { TaskList } from './TaskList';
import { TaskFilters } from './TaskFilters';
import { TaskSort, SortField, SortDirection } from './TaskSort';
import { Loader2 } from 'lucide-react';
import { eventService, courseService } from '@/lib/services';
import type { CalEvent, Course } from '@/types';
import { mapEventToTask } from '@/types';

export function TasksPageClient() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter and sort state (persisted to sessionStorage)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in-progress' | 'completed'>('all');
  const [courseFilter, setCourseFilter] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('due_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = sessionStorage;
    const savedStatus = s.getItem('taskStatusFilter');
    const savedCourses = s.getItem('taskCourseFilter');
    const savedSortField = s.getItem('taskSortField');
    const savedSortDir = s.getItem('taskSortDirection');
    if (savedStatus) setStatusFilter(savedStatus as typeof statusFilter);
    if (savedCourses) setCourseFilter(JSON.parse(savedCourses));
    if (savedSortField) setSortField(savedSortField as SortField);
    if (savedSortDir) setSortDirection(savedSortDir as SortDirection);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = sessionStorage;
    s.setItem('taskStatusFilter', statusFilter);
    s.setItem('taskCourseFilter', JSON.stringify(courseFilter));
    s.setItem('taskSortField', sortField);
    s.setItem('taskSortDirection', sortDirection);
  }, [statusFilter, courseFilter, sortField, sortDirection]);

  const tasks = useMemo(
    () => events.map((ev) => mapEventToTask(ev, courses)),
    [events, courses]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (statusFilter !== 'all') result = result.filter((t) => t.status === statusFilter);
    if (courseFilter.length > 0) result = result.filter((t) => courseFilter.includes(t.course_id));
    return result.sort((a, b) => {
      if (sortField === 'due_date') {
        const diff = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        return sortDirection === 'asc' ? diff : -diff;
      }
      return 0;
    });
  }, [tasks, statusFilter, courseFilter, sortField, sortDirection]);

  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      overdue: tasks.filter((t) => {
        const d = new Date(t.due_date);
        d.setHours(0, 0, 0, 0);
        return d < now && t.status !== 'completed';
      }).length,
    };
  }, [tasks]);

  const refreshTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedEvents, fetchedCourses] = await Promise.all([
        eventService.list(),
        courseService.list(),
      ]);
      setEvents(fetchedEvents);
      setCourses(fetchedCourses);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshTasks(); }, [refreshTasks]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Đang tải tasks...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter & Sort bar */}
      {stats.total > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-gray-200">
          <TaskFilters
            statusFilter={statusFilter}
            courseFilter={courseFilter}
            courses={courses}
            onStatusChange={setStatusFilter}
            onCourseChange={setCourseFilter}
            stats={{ pending: stats.pending, inProgress: stats.inProgress, completed: stats.completed }}
          />
          <TaskSort
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={(field, direction) => { setSortField(field); setSortDirection(direction); }}
          />
        </div>
      )}

      {/* Task list */}
      <TaskList
        tasks={filteredTasks}
        onTaskUpdate={refreshTasks}
        loading={false}
        onStatusChange={async (taskId, status) => {
          try {
            await eventService.update(taskId, { status });
            refreshTasks();
          } catch (error) {
            console.error('Error updating task status:', error);
          }
        }}
      />
    </div>
  );
}
