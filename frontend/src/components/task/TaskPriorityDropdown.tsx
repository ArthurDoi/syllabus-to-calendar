'use client';

import { useState, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Simple filled flag icon - rectangular flag on a pole
const FilledFlag = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Flag pole */}
    <rect x="2" y="2" width="1.5" height="12" fill="currentColor" />
    {/* Filled rectangular flag */}
    <rect x="3.5" y="2" width="8" height="4" fill="currentColor" />
  </svg>
);

// Clear/No priority icon
const ClearIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export type PriorityValue = 'urgent' | 'high' | 'normal' | 'low' | 'none';

interface PriorityOption {
  value: PriorityValue;
  label: string;
  flagColor: string;
  flagFill: string;
}

const priorityOptions: PriorityOption[] = [
  { value: 'urgent', label: 'Urgent', flagColor: 'text-red-500', flagFill: 'fill-red-500' },
  { value: 'high', label: 'High', flagColor: 'text-yellow-500', flagFill: 'fill-yellow-500' },
  { value: 'normal', label: 'Normal', flagColor: 'text-blue-500', flagFill: 'fill-blue-500' },
  { value: 'low', label: 'Low', flagColor: 'text-gray-400', flagFill: 'fill-gray-400' },
  { value: 'none', label: 'Clear', flagColor: 'text-transparent', flagFill: 'fill-transparent' },
];

// Map our internal priority system to ClickUp-style priorities
const mapToInternalPriority = (priority: PriorityValue): 'low' | 'medium' | 'high' => {
  switch (priority) {
    case 'urgent':
    case 'high':
      return 'high';
    case 'normal':
      return 'medium';
    case 'low':
    case 'none':
      return 'low';
  }
};

// Map internal priority to ClickUp-style priority for display
const mapFromInternalPriority = (priority: 'low' | 'medium' | 'high', taskType: 'assignment' | 'exam' | 'milestone'): PriorityValue => {
  // Exams always show as "High"
  if (taskType === 'exam') {
    return 'high';
  }
  
  switch (priority) {
    case 'high':
      return 'high';
    case 'medium':
      return 'normal';
    case 'low':
      return 'low';
  }
};

interface TaskPriorityDropdownProps {
  currentPriority: 'low' | 'medium' | 'high';
  taskType: 'assignment' | 'exam' | 'milestone';
  onPriorityChange?: (priority: 'low' | 'medium' | 'high') => void;
  disabled?: boolean;
}

export function TaskPriorityDropdown({
  currentPriority,
  taskType,
  onPriorityChange,
  disabled = false,
}: TaskPriorityDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Exams always show "High" and are read-only
  const displayPriority = mapFromInternalPriority(currentPriority, taskType);
  const isReadOnly = taskType === 'exam' || disabled;
  const selectedOption = priorityOptions.find(opt => opt.value === displayPriority) || priorityOptions[3]; // Default to Low

  const handleSelect = (priority: PriorityValue) => {
    if (isReadOnly) return;
    
    const internalPriority = mapToInternalPriority(priority);
    if (onPriorityChange) {
      onPriorityChange(internalPriority);
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (!isReadOnly) {
              setOpen(!open);
            }
          }}
          disabled={isReadOnly}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-1",
            isReadOnly && "cursor-default opacity-60"
          )}
        >
          {selectedOption.value === 'none' ? (
            <ClearIcon className={cn("w-4 h-4", selectedOption.flagColor)} />
          ) : (
            <FilledFlag className={cn("w-4 h-4", selectedOption.flagColor)} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-48 p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Task Priority
        </div>
        {priorityOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 cursor-pointer",
              displayPriority === option.value && "bg-gray-50"
            )}
          >
            {option.value === 'none' ? (
              <ClearIcon className={cn("w-4 h-4", option.flagColor)} />
            ) : (
              <FilledFlag className={cn("w-4 h-4", option.flagColor)} />
            )}
            <span className="text-sm text-gray-900">
              {option.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

