'use client';

import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type SortField = 'due_date' | 'priority' | 'course_name' | 'created_at';
export type SortDirection = 'asc' | 'desc';

interface TaskSortProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
}

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'due_date', label: 'Due Date' },
  { value: 'priority', label: 'Priority' },
  { value: 'course_name', label: 'Course Name' },
  { value: 'created_at', label: 'Created Date' },
];

export function TaskSort({ sortField, sortDirection, onSortChange }: TaskSortProps) {
  const currentOption = sortOptions.find(opt => opt.value === sortField);

  const handleSortClick = (field: SortField) => {
    // If clicking the same field, toggle direction; otherwise, set to ascending
    if (field === sortField) {
      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9 px-3 font-medium">
          <ArrowUpDown className="w-4 h-4" />
          Sort: {currentOption?.label}
          {sortDirection === 'asc' ? (
            <ArrowUp className="w-3.5 h-3.5" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleSortClick(option.value)}
            className={cn(
              "flex items-center justify-between",
              sortField === option.value && "bg-gray-100"
            )}
          >
            <span>{option.label}</span>
            {sortField === option.value && (
              <span className="text-xs text-gray-500">
                {sortDirection === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

