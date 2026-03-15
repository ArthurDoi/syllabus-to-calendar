'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle, FileText, GraduationCap, Flag } from 'lucide-react';
import { COURSE_ICONS } from '@/constants/course-icons';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const dueDate = new Date(task.due_date);
  const now = new Date();
  
  // Normalize dates to midnight for accurate comparison
  const dueDateNormalized = new Date(dueDate);
  dueDateNormalized.setHours(0, 0, 0, 0);
  const nowNormalized = new Date(now);
  nowNormalized.setHours(0, 0, 0, 0);
  
  // A task is overdue only if it's due before today (not including today)
  const isOverdue = dueDateNormalized < nowNormalized && task.status !== 'completed';
  const isDueSoon = !isOverdue && (dueDate.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000;

  // Get icon component
  const getIconComponent = (iconName?: string): LucideIcon => {
    const iconData = COURSE_ICONS.find(i => i.name === iconName);
    return iconData ? iconData.icon : Calendar;
  };

  const IconComponent = getIconComponent(task.course_icon);

  // Type icons
  const typeIcons = {
    assignment: FileText,
    exam: GraduationCap,
    milestone: Flag,
  };

  const TypeIcon = typeIcons[task.type];

  // Status colors - refined palette
  const statusColors = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200/60',
    'in-progress': 'bg-blue-50 text-blue-700 border-blue-200/60',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  };

  // Priority colors - refined palette
  const priorityColors = {
    low: 'bg-slate-50 text-slate-600 border-slate-200/60',
    medium: 'bg-orange-50 text-orange-700 border-orange-200/60',
    high: 'bg-rose-50 text-rose-700 border-rose-200/60',
  };

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDate = new Date(date);
    taskDate.setHours(0, 0, 0, 0);
    
    if (taskDate.getTime() === today.getTime()) {
      return 'Today';
    }
    if (taskDate.getTime() === today.getTime() + 86400000) {
      return 'Tomorrow';
    }
    return taskDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: taskDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <div
      onClick={onClick}
      className="group relative w-full"
    >
      <div className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300 ease-out",
        "hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 cursor-pointer",
        "border-gray-100/80",
        isOverdue && "border-red-100 bg-red-50/10",
        isDueSoon && !isOverdue && "border-orange-100 bg-orange-50/10"
      )}>
        {/* Decorative gradient background */}
        <div 
          className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 rounded-full opacity-[0.03] blur-3xl transition-opacity group-hover:opacity-[0.08]"
          style={{ background: task.course_color }}
        />

        <div className="relative z-10 flex gap-4">
          {/* Left Column: Icon */}
          <div className="flex-shrink-0 pt-1">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
              style={{ 
                backgroundColor: hexToRgba(task.course_color, 0.1),
                color: task.course_color
              }}
            >
              <IconComponent className="w-6 h-6" strokeWidth={2} />
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-1">
                  <span className="flex items-center gap-1.5">
                    <span 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: task.course_color }}
                    />
                    {task.course_name}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <TypeIcon className="w-3 h-3" />
                    {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg leading-tight truncate pr-2 group-hover:text-primary transition-colors">
                  {task.title}
                </h3>
              </div>
              
              {/* Status Badge */}
              <Badge variant="outline" className={cn("flex-shrink-0 capitalize border shadow-sm", statusColors[task.status])}>
                {task.status === 'in-progress' ? 'In Progress' : task.status}
              </Badge>
            </div>

            {/* Footer Info */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
              <div className="flex items-center gap-4 text-sm">
                <div className={cn(
                  "flex items-center gap-1.5 font-medium transition-colors",
                  isOverdue ? "text-red-600" : isDueSoon ? "text-orange-600" : "text-gray-600"
                )}>
                  <Calendar className="w-4 h-4" />
                  {formatDate(dueDate)}
                </div>
                
                {task.estimated_hours && (
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Clock className="w-4 h-4" />
                    {task.estimated_hours}h
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {task.type === 'assignment' && (
                  <Badge variant="secondary" className={cn("text-xs font-medium px-2 py-0.5 border", priorityColors[task.priority])}>
                    {task.priority}
                  </Badge>
                )}
                
                {isOverdue && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    Overdue
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

