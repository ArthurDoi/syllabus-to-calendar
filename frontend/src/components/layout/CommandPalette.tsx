'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  shortcut?: string;
  group?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandAction[];
}

export function CommandPalette({ open, onOpenChange, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((action) => {
      return (
        action.label.toLowerCase().includes(q) ||
        action.description?.toLowerCase().includes(q)
      );
    });
  }, [actions, query]);

  const groupedActions = useMemo(() => {
    return filteredActions.reduce<Record<string, CommandAction[]>>((acc, action) => {
      const group = action.group || 'General';
      acc[group] = acc[group] ? [...acc[group], action] : [action];
      return acc;
    }, {});
  }, [filteredActions]);

  const handleSelect = (action: CommandAction) => {
    action.onSelect();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] gap-0 overflow-hidden border border-gray-200 p-0">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
          <Search className="w-4 h-4 text-gray-400" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search for a page…"
            className="border-none shadow-none focus-visible:ring-0 px-0"
          />
          <div className="hidden text-xs text-gray-400 font-semibold md:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded">↵</kbd>
            <span>select</span>
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {filteredActions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-500">
              No matches found. Try a different keyword.
            </div>
          ) : (
            Object.entries(groupedActions).map(([group, groupActions]) => (
              <div key={group} className="px-2 py-3">
                <p className="px-4 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  {group}
                </p>
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
                  {groupActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleSelect(action)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex items-center justify-between',
                        'text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                      )}
                    >
                      <div>
                        <p className="font-medium text-gray-900">{action.label}</p>
                        {action.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                        )}
                      </div>
                      {action.shortcut && (
                        <span className="text-xs font-semibold text-gray-400 border border-gray-200 rounded px-2 py-0.5">
                          {action.shortcut}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}


