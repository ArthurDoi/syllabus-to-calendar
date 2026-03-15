'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COURSE_ICONS } from '@/constants/course-icons';

interface IconPickerProps {
  selectedIcon?: string;
  onIconSelect: (iconName: string) => void;
  courseColor?: string;
}

export function IconPicker({ selectedIcon = 'Calendar', onIconSelect, courseColor = '#3b82f6' }: IconPickerProps) {
  const selectedIconData = COURSE_ICONS.find(i => i.name === selectedIcon) || COURSE_ICONS[0];
  const SelectedIcon = selectedIconData.icon;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-gray-200"
          style={{ backgroundColor: `${courseColor}15` }}
        >
          <SelectedIcon 
            className="w-6 h-6" 
            style={{ color: courseColor }}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Selected Icon</p>
          <p className="text-xs text-gray-500">{selectedIconData.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
        {COURSE_ICONS.map((iconData) => {
          const Icon = iconData.icon;
          const isSelected = iconData.name === selectedIcon;
          return (
            <button
              key={iconData.name}
              type="button"
              onClick={() => onIconSelect(iconData.name)}
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                "hover:scale-110 hover:shadow-md",
                isSelected
                  ? "ring-2 ring-offset-2"
                  : "hover:bg-white border border-gray-200"
              )}
              style={isSelected ? {
                backgroundColor: `${courseColor}20`,
                borderColor: courseColor,
              } : {}}
              title={iconData.name}
            >
              <Icon 
                className={cn(
                  "w-5 h-5",
                  isSelected ? "" : "text-gray-600"
                )}
                style={isSelected ? { color: courseColor } : {}}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

