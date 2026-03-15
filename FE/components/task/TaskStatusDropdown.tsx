'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface StatusOption {
  value: 'pending' | 'in-progress' | 'completed';
  label: string;
  displayLabel: string;
  dotColor: string;
}

const statusOptions: StatusOption[] = [
  { value: 'pending', label: 'To Do', displayLabel: 'TO DO', dotColor: 'bg-gray-400' },
  { value: 'in-progress', label: 'In Progress', displayLabel: 'IN PROG', dotColor: 'bg-purple-500' },
  { value: 'completed', label: 'Complete', displayLabel: 'COMPLETE', dotColor: 'bg-green-500' },
];

interface TaskStatusDropdownProps {
  currentStatus: 'pending' | 'in-progress' | 'completed';
  taskType: 'assignment' | 'exam' | 'milestone';
  onStatusChange?: (status: 'pending' | 'in-progress' | 'completed') => void;
  disabled?: boolean;
}

export function TaskStatusDropdown({
  currentStatus,
  taskType,
  onStatusChange,
  disabled = false,
}: TaskStatusDropdownProps) {
  const [open, setOpen] = useState(false);

  // Only assignments can change status
  const isReadOnly = taskType !== 'assignment' || disabled;
  const selectedOption = statusOptions.find(opt => opt.value === currentStatus) || statusOptions[0];

  const handleSelect = (status: 'pending' | 'in-progress' | 'completed') => {
    if (isReadOnly) return;
    
    if (onStatusChange) {
      onStatusChange(status);
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isReadOnly) {
              setOpen(!open);
            }
          }}
          disabled={isReadOnly}
          className={cn(
            "flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1 whitespace-nowrap",
            currentStatus === 'pending' && "bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100",
            currentStatus === 'in-progress' && "bg-purple-50 border-purple-200 text-gray-900 hover:bg-purple-100",
            currentStatus === 'completed' && "bg-green-50 border-green-200 text-gray-900 hover:bg-green-100",
            isReadOnly && "cursor-default bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-50"
          )}
        >
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", selectedOption.dotColor)} />
          <span className="text-gray-900">{selectedOption.displayLabel}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Status
        </div>
        {statusOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 cursor-pointer",
              currentStatus === option.value && "bg-gray-50"
            )}
          >
            <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", option.dotColor)} />
            <span className="text-sm text-gray-900 font-medium">
              {option.value === 'in-progress' ? 'IN PROGRESS' : option.displayLabel}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

