'use client';

import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

export function CourseFilter() {
  return (
    <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-white to-blue-50/30 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex-1 relative">
        <Search className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 transform -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search courses..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400 bg-white transition-all"
        />
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        className="gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-700"
      >
        <Filter className="w-4 h-4" />
        Filter
      </Button>
    </div>
  );
}

