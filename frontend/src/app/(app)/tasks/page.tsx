"use client";
import { useEffect, useState } from "react";
import { eventService } from "@/lib/services";
import type { CalEvent } from "@/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LABEL_COLOR, LABEL_TEXT } from "@/constants/event-labels";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, ListTodo, X } from "lucide-react";

function groupByWeekday(events: CalEvent[]) {
  const days: Record<string, CalEvent[]> = {};
  events.forEach(ev => {
    if (!ev.start_time) { (days["No date"] ||= []).push(ev); return; }
    const d = new Date(ev.start_time).toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "numeric" });
    (days[d] ||= []).push(ev);
  });
  return days;
}

export default function TasksPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    eventService.list().then(data => { setEvents(data); setLoading(false); });
  }, []);

  const markDone = async (id: string) => {
    const updated = await eventService.update(id, { status: "completed" });
    setEvents(prev => prev.map(e => e.id === id ? updated : e));
  };

  const deleteEvent = async (id: string) => {
    await eventService.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
    setConfirmId(null);
  };

  const grouped = groupByWeekday(events);
  const toDelete = confirmId ? events.find(e => e.id === confirmId) : null;

  return (
    <div className="p-6 h-full flex flex-col gap-3 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-gray-700" />
          <h1 className="text-xl font-semibold text-gray-900">Your tasks</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-6 min-h-0">
        <Card className="p-4 bg-white border border-gray-200 flex-1 min-w-0 shadow-sm relative overflow-hidden flex flex-col">
          {loading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </div>
            </div>
          )}

          {!loading && events.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-gray-500 gap-2 z-10 bg-white/90">
              <CheckCircle2 className="w-8 h-8 text-gray-300" />
              <p className="font-medium">No tasks found</p>
              <p className="text-sm">You have completed all tasks or have not added any new tasks.</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-2">
            {Object.entries(grouped).map(([day, items]) => (
              <div key={day} className="mt-6 first:mt-2">
                <div className="py-2 text-sm font-medium text-gray-900 flex items-center gap-2">
                  {day}
                  <span className="text-xs text-gray-500 font-normal">({items.length})</span>
                </div>

                <div className="border-t border-gray-100">
                  {items.map(ev => {
                    const isOverdue = ev.start_time && new Date(ev.start_time) < new Date() && ev.status !== "completed";
                    const isDone = ev.status === "completed";
                    const labelColor = LABEL_COLOR[ev.label || "lecture"] || "#5f6368";
                    const labelText = LABEL_TEXT[ev.label || "lecture"] || "Task";

                    return (
                      <div key={ev.id} className={`group flex items-start py-3 border-b border-gray-100 transition-opacity ${isDone ? 'opacity-60 bg-white' : 'opacity-100 hover:bg-gray-50 bg-white'}`}>
                        {/* Checkbox */}
                        <div className="pt-0.5 mr-4 ml-2">
                          <button
                            onClick={() => !isDone && markDone(ev.id)}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-blue-600 border-blue-600' : 'border-gray-400 bg-white hover:border-blue-500 cursor-pointer'
                              } ${isDone ? 'cursor-default' : ''}`}
                          >
                            {isDone && <span className="text-white text-xs leading-none">✓</span>}
                          </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm text-gray-900 font-medium mb-1 truncate ${isDone ? 'line-through text-gray-500' : ''}`}>
                            {ev.title}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                            <span style={{ color: labelColor }} className="font-medium">{labelText}</span>
                            {ev.course_id && <span>• Attached course</span>}
                            {ev.start_time && (
                              <>
                                <span>• {new Date(ev.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                                {isOverdue && <span className="text-red-600 font-medium">Overdue</span>}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="ml-4 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setConfirmId(ev.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete Task"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {confirmId && toDelete && (
        <ConfirmDialog
          message={`Are you sure you want to delete the task "${toDelete.title}"?`}
          onConfirm={() => deleteEvent(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}