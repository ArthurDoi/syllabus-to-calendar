'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileText, GraduationCap, Flag, Link2 } from 'lucide-react';
import { COURSE_ICONS } from '@/constants/course-icons';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskPriorityDropdown } from './TaskPriorityDropdown';
import { TaskStatusDropdown } from './TaskStatusDropdown';

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

interface TaskListItemProps {
  task: Task;
  onTaskClick: () => void;
  onStatusChange?: (status: 'pending' | 'in-progress' | 'completed') => void;
  onPriorityChange?: (priority: 'low' | 'medium' | 'high') => void;
}

export function TaskListItem({ task, onTaskClick, onStatusChange, onPriorityChange }: TaskListItemProps) {
  const dueDate = new Date(task.due_date);
  const now = new Date();
  
  // Normalize dates to midnight for accurate comparison
  const dueDateNormalized = new Date(dueDate);
  dueDateNormalized.setHours(0, 0, 0, 0);
  const nowNormalized = new Date(now);
  nowNormalized.setHours(0, 0, 0, 0);
  
  // A task is overdue only if it's due before today (not including today)
  const isOverdue = dueDateNormalized < nowNormalized && task.status !== 'completed';
  const isDueToday = dueDateNormalized.getTime() === nowNormalized.getTime();
  const isDueTomorrow = dueDateNormalized.getTime() === nowNormalized.getTime() + 86400000;

  // Type icons
  const typeIcons = {
    assignment: FileText,
    exam: GraduationCap,
    milestone: Flag,
  };

  const TypeIcon = typeIcons[task.type];

  const formatDate = (date: Date) => {
    if (isDueToday) return 'Today';
    if (isDueTomorrow) return 'Tomorrow';
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    
    // For dates within 7 days, show weekday
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 7) {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short',
      });
    }
    
    // For dates beyond 7 days, show actual date
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };


  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <tr 
      className={cn(
        "hover:bg-gray-50/80 transition-colors cursor-pointer group",
        task.status === 'completed' && "opacity-70 bg-gray-50/40"
      )}
      onClick={onTaskClick}
    >
      {/* Checkbox */}
      <td className="px-6 py-4 w-14 align-middle">
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={task.status === 'completed'}
            onCheckedChange={(checked) => {
              if (onStatusChange && task.type === 'assignment') {
                onStatusChange(checked ? 'completed' : 'pending');
              }
            }}
            className="cursor-pointer"
          />
        </div>
      </td>

      {/* Task Name */}
      <td className="px-6 py-4 overflow-hidden align-middle">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            task.status === 'completed'
              ? "bg-gray-100 text-gray-400"
              : "bg-gray-50 text-gray-500 group-hover:bg-gray-100"
          )}>
            <TypeIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <span className={cn(
              "text-sm font-semibold text-gray-900 truncate block",
              task.status === 'completed' && "line-through text-gray-500"
            )}>
              {task.title}
            </span>
            {task.description && (
              <div className="flex items-center gap-1 mt-0.5">
                <Link2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs text-gray-500 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {task.description.substring(0, 40)}...
                </span>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Course */}
      <td className="px-6 py-4 hidden sm:table-cell overflow-hidden w-44 align-middle">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: task.course_color }}
          />
          <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md bg-gray-50 text-gray-700 border border-gray-200/60 truncate max-w-full">
            {task.course_name}
          </span>
        </div>
      </td>

      {/* Due Date */}
      <td className="px-6 py-4 w-36 align-middle">
        <div className="flex flex-col">
          <span className={cn(
            "text-sm font-semibold whitespace-nowrap",
            isOverdue && "text-red-600",
            !isOverdue && "text-gray-700"
          )}>
            {formatDate(dueDate)}
          </span>
          {isOverdue && (
            <span className="text-xs text-red-600 font-medium mt-0.5">Overdue</span>
          )}
        </div>
      </td>

      {/* Priority */}
      <td className="px-6 py-4 hidden md:table-cell w-24 align-middle">
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {task.type === 'assignment' || task.type === 'exam' ? (
            <TaskPriorityDropdown
              currentPriority={task.priority}
              taskType={task.type}
              onPriorityChange={onPriorityChange}
            />
          ) : (
            <span className="text-gray-300 text-sm">—</span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 w-36 align-middle">
        <div onClick={(e) => e.stopPropagation()}>
          <TaskStatusDropdown
            currentStatus={task.status}
            taskType={task.type}
            onStatusChange={onStatusChange}
          />
        </div>
      </td>
    </tr>
  );
}

