'use client';

import { TaskListItem } from './TaskListItem';
import { TaskDetail } from './TaskDetail';
import { useState } from 'react';
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

interface TaskGroupProps {
  title: string;
  count: number;
  tasks: Task[];
  onTaskUpdate?: () => void;
  onStatusChange?: (taskId: string, status: 'pending' | 'in-progress' | 'completed') => void;
  onAddTask?: () => void;
}

export function TaskGroup({ title, count, tasks, onTaskUpdate, onStatusChange, onAddTask }: TaskGroupProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = () => {
    setSelectedTask(null);
    if (onTaskUpdate) {
      onTaskUpdate();
    }
  };

  if (tasks.length === 0) return null;

  return (
    <>
      <div className="mb-6">
        {/* Group Header */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-3">
            <h2 className={cn(
              "text-sm font-bold uppercase tracking-wider",
              title === "Overdue" 
                ? "text-red-600" 
                : "text-gray-700"
            )}>
              {title}
            </h2>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
              {count}
            </span>
          </div>
        </div>

        {/* Table Layout */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left w-14"></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Task</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell w-44">Course</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">Due Date</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell w-24">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-36">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/80">
              {tasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  onTaskClick={() => handleTaskClick(task)}
                  onStatusChange={(status) => {
                    if (onStatusChange) {
                      onStatusChange(task.id, status);
                    }
                  }}
                  onPriorityChange={async (priority) => {
                    try {
                      const response = await fetch(`/api/tasks/${task.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priority }),
                      });
                      if (response.ok && onTaskUpdate) {
                        onTaskUpdate();
                      }
                    } catch (error) {
                      console.error('Error updating task priority:', error);
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
        />
      )}
    </>
  );
}

