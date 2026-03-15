'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, FileText, GraduationCap, Flag, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
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

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

export function TaskDetail({ task, onClose, onUpdate }: TaskDetailProps) {
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.status);

  const dueDate = new Date(task.due_date);
  const now = new Date();
  
  // Normalize dates to midnight for accurate comparison
  const dueDateNormalized = new Date(dueDate);
  dueDateNormalized.setHours(0, 0, 0, 0);
  const nowNormalized = new Date(now);
  nowNormalized.setHours(0, 0, 0, 0);
  
  // A task is overdue only if it's due before today (not including today)
  const isOverdue = dueDateNormalized < nowNormalized && currentStatus !== 'completed';

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

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleStatusChange = async (newStatus: 'pending' | 'in-progress' | 'completed') => {
    if (task.type !== 'assignment') {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update task status');
      }

      setCurrentStatus(newStatus);
      onUpdate();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert('Failed to update task status. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0 border-0 shadow-2xl">
        {/* Header with Course Color Background */}
        <div className="relative px-6 pt-8 pb-6 border-b border-gray-100">
          <div 
            className="absolute inset-0 opacity-[0.08]"
            style={{ 
              background: `linear-gradient(135deg, ${task.course_color} 0%, white 100%)`
            }}
          />
          
          <div className="relative flex items-start gap-5">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm bg-white border-2"
              style={{ borderColor: hexToRgba(task.course_color, 0.2) }}
            >
              <IconComponent 
                className="w-8 h-8" 
                style={{ color: task.course_color }}
                strokeWidth={1.5}
              />
            </div>
            
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-white/80 backdrop-blur-sm border-gray-200 text-gray-600 font-medium">
                  <TypeIcon className="w-3 h-3 mr-1.5" />
                  {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                </Badge>
                <Badge variant="outline" className={cn("capitalize", statusColors[currentStatus])}>
                  {currentStatus === 'in-progress' ? 'In Progress' : currentStatus}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100">
                    Overdue
                  </Badge>
                )}
              </div>
              
              <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight mb-1">
                {task.title}
              </DialogTitle>
              
              <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <span 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: task.course_color }}
                />
                {task.course_name}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto">
          {/* Description */}
          {task.description && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Description
              </h4>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap border border-gray-100">
                {task.description}
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-0.5">Due Date</div>
                  <div className={cn("text-sm font-medium", isOverdue ? "text-red-600" : "text-gray-900")}>
                    {formatDateTime(dueDate)}
                  </div>
                </div>
              </div>
              
              {task.time && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-0.5">Time</div>
                    <div className="text-sm font-medium text-gray-900">{task.time}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {task.location && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-0.5">Location</div>
                    <div className="text-sm font-medium text-gray-900">{task.location}</div>
                  </div>
                </div>
              )}

              {task.estimated_hours && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-0.5">Estimated Effort</div>
                    <div className="text-sm font-medium text-gray-900">{task.estimated_hours} hours</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Actions */}
          {task.type === 'assignment' && (
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">Update Status</h4>
                {task.priority && (
                  <Badge variant="secondary" className={cn("text-xs font-medium border", priorityColors[task.priority])}>
                    {task.priority} Priority
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('pending')}
                  disabled={updating}
                  className={cn(
                    "h-auto py-3 flex flex-col gap-1.5 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-all",
                    currentStatus === 'pending' && "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-200"
                  )}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-medium">To Do</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('in-progress')}
                  disabled={updating}
                  className={cn(
                    "h-auto py-3 flex flex-col gap-1.5 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all",
                    currentStatus === 'in-progress' && "bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200"
                  )}
                >
                  {updating && currentStatus !== 'in-progress' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                  )}
                  <span className="text-xs font-medium">In Progress</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => handleStatusChange('completed')}
                  disabled={updating}
                  className={cn(
                    "h-auto py-3 flex flex-col gap-1.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all",
                    currentStatus === 'completed' && "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200"
                  )}
                >
                  {updating && currentStatus !== 'completed' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                  <span className="text-xs font-medium">Complete</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

