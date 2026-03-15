'use client';

import { TaskGroup } from './TaskGroup';
import { Card } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

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

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  onTaskUpdate?: () => void;
  onStatusChange?: (taskId: string, status: 'pending' | 'in-progress' | 'completed') => void;
  onAddTask?: () => void;
}

export function TaskList({ tasks, loading, onTaskUpdate, onStatusChange, onAddTask }: TaskListProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Loading tasks...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
          <div className="relative bg-white p-6 rounded-full shadow-sm border border-gray-100 ring-4 ring-gray-50">
            <AlertCircle className="w-12 h-12 text-gray-400 group-hover:text-primary transition-colors duration-300" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">No tasks found</h3>
        <p className="text-gray-500 text-center max-w-md mb-8 leading-relaxed">
          You don't have any tasks matching your current filters. Try adjusting your filters or add assignments, exams, or milestones to your courses.
        </p>
        
        <div className="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm text-gray-600">
          <span className="text-xl">💡</span>
          <span>Tasks will appear here once you add them to your courses</span>
        </div>
      </div>
    );
  }

  // Group tasks by due date
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const overdue: Task[] = [];
  const today: Task[] = [];
  const tomorrow: Task[] = [];
  const futureGroups: { [key: string]: { title: string; tasks: Task[] } } = {};

  tasks.forEach(task => {
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dueDate < now && task.status !== 'completed') {
      overdue.push(task);
    } else if (diffDays === 0) {
      today.push(task);
    } else if (diffDays === 1) {
      tomorrow.push(task);
    } else {
      // Group by actual date to avoid duplicate weekday names
      // Use date string as key to ensure unique groups
      const dateKey = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const weekday = dueDate.toLocaleDateString('en-US', { weekday: 'long' });
      
      // Show weekday in uppercase to match design
      const title = weekday.toUpperCase();
      
      if (!futureGroups[dateKey]) {
        futureGroups[dateKey] = {
          title: title,
          tasks: []
        };
      }
      futureGroups[dateKey].tasks.push(task);
    }
  });

  // Sort future groups by date
  const sortedFutureGroups = Object.entries(futureGroups)
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort by date string
    .map(([dateKey, group]) => ({
      title: group.title,
      tasks: group.tasks.sort((a, b) => {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        return dateA.getTime() - dateB.getTime();
      })
    }));

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <TaskGroup
          title="Overdue"
          count={overdue.length}
          tasks={overdue}
          onTaskUpdate={onTaskUpdate}
          onStatusChange={onStatusChange}
          onAddTask={onAddTask}
        />
      )}
      
      {today.length > 0 && (
        <TaskGroup
          title="Today"
          count={today.length}
          tasks={today}
          onTaskUpdate={onTaskUpdate}
          onStatusChange={onStatusChange}
          onAddTask={onAddTask}
        />
      )}

      {tomorrow.length > 0 && (
        <TaskGroup
          title="Tomorrow"
          count={tomorrow.length}
          tasks={tomorrow}
          onTaskUpdate={onTaskUpdate}
          onStatusChange={onStatusChange}
          onAddTask={onAddTask}
        />
      )}

      {sortedFutureGroups.map((group, index) => (
        <TaskGroup
          key={`${group.title}-${group.tasks[0].due_date}-${index}`}
          title={group.title}
          count={group.tasks.length}
          tasks={group.tasks}
          onTaskUpdate={onTaskUpdate}
          onStatusChange={onStatusChange}
          onAddTask={onAddTask}
        />
      ))}
    </div>
  );
}

