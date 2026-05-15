"use client";
import { useState, useEffect, useRef } from "react";
import { courseService, eventService, syllabusService } from "@/lib/services";
import type { SyllabusUpload, Course, CourseCreate, EventCreate, EventLabel } from "@/types";
import { LABEL_CONFIG, getLabelConfig, LABEL_ORDER as BUILT_IN_ORDER } from "@/constants/event-labels";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Loader2, Plus, X, Calendar, FileText, ZoomIn, Info, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function validateDate(dateStr: string | undefined, fieldName: string): string | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return `${fieldName}: Invalid date format (must be YYYY-MM-DD).`;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
    const maxDay = new Date(y, m, 0).getDate();
    return `${fieldName}: Day ${d} does not exist in month ${m} (only ${maxDay} days).`;
  }
  return null;
}

interface Props {
  upload: SyllabusUpload;
  onClose: () => void;
  onCourseCreated: (course: Course) => void;
  onDiscarded?: (uploadId: string) => void;
}

function EventCard({ ev, index, onChange, onRemove }: { ev: EventCreate; index: number; onChange: (i: number, patch: Partial<EventCreate>) => void; onRemove: (i: number) => void; }) {
  const cfg = getLabelConfig(ev.label);

  return (
    <div className="group relative flex flex-col gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100">
      <div className="flex items-start justify-between gap-4 w-full">
        <div className="flex-1 min-w-0">
          <input
            value={ev.title}
            onChange={e => onChange(index, { title: e.target.value })}
            placeholder="Add title..."
            className="w-full text-base font-semibold text-gray-900 bg-transparent border-none rounded focus:ring-2 focus:ring-blue-100/50 outline-none p-1 -ml-1 transition-all"
          />
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="flex items-center gap-1.5 bg-gray-50/80 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <input
                type="date"
                value={ev.start_time ? ev.start_time.split("T")[0] : ""}
                onChange={e => onChange(index, { start_time: e.target.value ? e.target.value + "T00:00:00" : undefined })}
                className="bg-transparent text-[13px] font-medium text-gray-700 border-none outline-none cursor-pointer p-0"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50/80 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors">
              <input
                type="time"
                value={ev.start_time && ev.start_time.includes("T") ? ev.start_time.split("T")[1]?.slice(0, 5) || "" : ""}
                onChange={e => {
                  const datePart = ev.start_time?.split("T")[0] || new Date().toISOString().split("T")[0];
                  onChange(index, { start_time: e.target.value ? `${datePart}T${e.target.value}:00` : `${datePart}T00:00:00` });
                }}
                className="bg-transparent text-[13px] font-medium text-gray-700 border-none outline-none cursor-pointer p-0"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50/80 hover:bg-gray-100 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors pl-3 relative">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />
              <select
                value={ev.label || "lecture"}
                onChange={e => onChange(index, { label: e.target.value as EventLabel })}
                className="bg-transparent text-[13px] font-medium text-gray-700 border-none outline-none cursor-pointer p-0 appearance-none pr-3"
              >
                {Object.entries(LABEL_CONFIG).map(([v, c]) => (
                  <option key={v} value={v} className="text-gray-900">{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <button onClick={() => onRemove(index)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 flex-shrink-0" title="Delete Event">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div>
        <textarea
          value={ev.description || ""}
          onChange={e => onChange(index, { description: e.target.value || undefined })}
          placeholder="Add detailed description (optional)..."
          rows={1}
          className="w-full text-[13px] text-gray-500 bg-transparent border-none outline-none resize-none p-1 -ml-1 focus:ring-2 focus:ring-blue-100/50 rounded transition-all placeholder:text-gray-400"
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
        />
      </div>
    </div>
  );
}

function EventGroup({ labelKey, events, onChangeByGlobal, onRemoveByGlobal, onAdd }: { labelKey: string; events: { ev: EventCreate; globalIndex: number }[]; onChangeByGlobal: any; onRemoveByGlobal: any; onAdd: any; }) {
  const cfg = getLabelConfig(labelKey);
  if (events.length === 0) return null;

  return (
    <div className="mb-8 last:mb-2">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
          <h3 className="text-sm font-semibold text-gray-900">{cfg.label}</h3>
          <span className="text-[11px] text-gray-500 font-semibold px-2 py-0.5 bg-gray-100 rounded-lg">{events.length}</span>
        </div>
        <button onClick={onAdd} className="flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-2 py-1 rounded-md transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add item
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {events.map(({ ev, globalIndex }) => (
          <EventCard key={globalIndex} ev={ev} index={globalIndex} onChange={onChangeByGlobal} onRemove={onRemoveByGlobal} />
        ))}
      </div>
    </div>
  );
}

export default function ReviewModal({ upload, onClose, onCourseCreated, onDiscarded }: Props) {
  const parsed = upload.parsed_data;

  // Extract date part from ISO datetime string (e.g., "2025-01-01T00:00:00" → "2025-01-01")
  const formatDateForInput = (val: any): string => {
    if (!val) return "";
    const str = String(val);
    if (str.includes("T")) {
      return str.split("T")[0]; // Extract date part from ISO
    }
    return str;
  };

  const [form, setForm] = useState<CourseCreate>({
    name: parsed?.course_info?.name || "Untitled Course",
    code: parsed?.course_info?.code || "",
    term: parsed?.course_info?.term || "",
    instructor: parsed?.course_info?.instructor || "",
    start_date: formatDateForInput(parsed?.course_info?.start_date),
    end_date: formatDateForInput(parsed?.course_info?.end_date),
    color: parsed?.course_info?.color || "#2563eb",
  });

  const [events, setEvents] = useState<EventCreate[]>(parsed?.events || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const existingCourseId = upload.course_id;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    let objectUrl: string;
    fetch(`${API_BASE}/syllabus/${upload.id}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => {
      objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);
    }).catch(() => setImageUrl(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [upload.id]);

  const handleEventChange = (i: number, patch: Partial<EventCreate>) => {
    setEvents(prev => prev.map((ev, idx) => idx === i ? { ...ev, ...patch } : ev));
  };
  const handleRemoveEvent = (i: number) => {
    setEvents(prev => prev.filter((_, idx) => idx !== i));
  };
  const handleAddEvent = (label: string) => {
    setEvents(prev => [{ title: "New Event", label: label as EventLabel, status: "pending" }, ...prev]);
  };

  const handleConfirm = async () => {
    setError(null);
    const dateErrors = [
      validateDate(form.start_date, "Course Start Date"),
      validateDate(form.end_date, "Course End Date"),
    ].filter(Boolean);

    events.forEach((ev, idx) => {
      if (ev.start_time) {
        const datePart = ev.start_time.split("T")[0];
        const err = validateDate(datePart, `Event "${ev.title || ('#' + (idx + 1))}"`);
        if (err) dateErrors.push(err);
      }
    });

    if (dateErrors.length > 0) {
      setError(dateErrors.join("\n"));
      return;
    }

    setLoading(true);
    try {
      const payload: CourseCreate = {
        ...form,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        code: form.code || undefined,
        term: form.term || undefined,
        instructor: form.instructor || undefined,
      };

      let course: Course;
      if (existingCourseId) {
        course = await courseService.update(existingCourseId, payload);
        const dbEvents = await eventService.list({ course_id: existingCourseId });
        for (let i = 0; i < Math.min(events.length, dbEvents.length); i++) {
          const local = events[i];
          const db = dbEvents[i];
          const needsUpdate = local.title !== db.title || local.label !== db.label || local.description !== db.description || (local.start_time || null) !== (db.start_time || null);
          if (needsUpdate) {
            await eventService.update(db.id, { title: local.title, label: local.label, description: local.description, start_time: local.start_time || undefined, end_time: local.end_time || undefined });
          }
        }
        for (let i = dbEvents.length; i < events.length; i++) {
          await eventService.create({ ...events[i], course_id: existingCourseId });
        }
        for (let i = events.length; i < dbEvents.length; i++) {
          await eventService.delete(dbEvents[i].id);
        }
      } else {
        course = await courseService.create(payload);
        for (const ev of events) {
          try { await eventService.create({ ...ev, course_id: course.id }); } catch { }
        }
      }
      onCourseCreated(course);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || "Failed to save course. Please try again.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // ── Dynamic grouping: preserves built-in order, appends unknown labels alphabetically
  const [newLabelInput, setNewLabelInput] = useState("");
  const [showNewLabel, setShowNewLabel] = useState(false);
  const newLabelRef = useRef<HTMLInputElement>(null);

  const grouped = (() => {
    const map: Record<string, { ev: EventCreate; globalIndex: number }[]> = {};
    events.forEach((ev, i) => {
      const key = (ev.label || "lecture").toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push({ ev, globalIndex: i });
    });
    return map;
  })();

  // Built-in labels first, then any extra labels from events, alphabetically
  const groupKeys = [
    ...BUILT_IN_ORDER.filter(l => grouped[l]?.length > 0),
    ...Object.keys(grouped).filter(k => !BUILT_IN_ORDER.includes(k as any)).sort(),
  ];

  const handleAddNewLabel = () => {
    const label = newLabelInput.trim().toLowerCase().replace(/\s+/g, "_");
    if (!label) return;
    handleAddEvent(label);
    setNewLabelInput("");
    setShowNewLabel(false);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-3 md:p-6 lg:p-8">
      <div className="bg-white rounded-xl sm:rounded-2xl w-full max-h-[98vh] sm:max-h-[95vh] max-w-2xl md:max-w-5xl lg:max-w-7xl flex flex-col overflow-hidden shadow-2xl border border-gray-200/60 ring-1 ring-black/5">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent truncate">
                Review Extracted Data
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workspace */}
        <div className="flex flex-1 overflow-hidden bg-white flex-col md:flex-row">

          {/* Document Preview Panel */}
          <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 flex flex-col p-3 sm:p-4 md:p-6 relative hidden md:flex">
            <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
              <span className="text-xs sm:text-sm font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" /> Original Document</span>
            </div>
            <div className="flex-1 bg-white rounded-lg sm:rounded-xl border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center relative group">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt={upload.original_name} className="max-w-full max-h-full object-contain p-2" />
                  <button onClick={() => setIsZoomed(true)} className="absolute top-2 right-2 sm:top-4 sm:right-4 p-1.5 sm:p-2.5 bg-white/95 backdrop-blur border border-gray-200 text-gray-700 rounded-lg sm:rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-gray-50 hover:-translate-y-0.5">
                    <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-400 gap-2 sm:gap-3">
                  {upload.file_type?.includes("pdf") ? <FileText className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" /> : <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />}
                  <span className="text-[12px] sm:text-[13px] font-medium text-center px-2">{upload.file_type?.includes("pdf") ? "PDF preview not available" : "Loading file..."}</span>
                </div>
              )}
            </div>
          </div>

          {/* Editor Panel */}
          <div className="flex-1 flex flex-col w-full md:w-7/12 bg-white relative">
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 scroll-smooth">

              {/* Course Info Section */}
              <div className="mb-6 sm:mb-10">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Info className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">Course Information</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-5">
                  {[
                    ["Course Name", "name", "text", "Example: Introduction to AI"],
                    ["Instructor", "instructor", "text", "Example: Dr. John Smith"],
                    ["Course Code", "code", "text", "Example: CS101"],
                    ["Term", "term", "text", "Example: Fall 2024"],
                    ["Start Date", "start_date", "date", ""],
                    ["End Date", "end_date", "date", ""]
                  ].map(([lbl, key, type, placeholder]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-xs sm:text-[13px] font-medium text-gray-700 ml-0.5">{lbl}</label>
                      <input
                        type={type}
                        placeholder={placeholder}
                        value={(form as any)[key] || ""}
                        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full text-xs sm:text-sm text-gray-900 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2.5 outline-none transition-all placeholder:text-gray-400"
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5 sm:col-span-2 mt-1">
                    <label className="text-xs sm:text-[13px] font-medium text-gray-700 ml-0.5">Course Background Color</label>
                    <div className="flex gap-2 sm:gap-3 flex-wrap">
                      {["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#475569", "#0891b2", "#ec4899"].map(c => (
                        <button
                          key={c}
                          onClick={() => setForm(prev => ({ ...prev, color: c }))}
                          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-sm transition-all focus:outline-none ${form.color === c ? 'ring-[3px] ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-110 border border-black/10'}`}
                          style={{ backgroundColor: c }}
                          type="button"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Divider */}
              <div className="h-px w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 mb-6 sm:mb-10" />

              {/* Events Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 uppercase tracking-wider">Schedule List</h3>
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100">{events.length} events</Badge>
                </div>

                {events.length === 0 ? (
                  <div className="text-center py-8 sm:py-16 bg-gray-50 rounded-lg sm:rounded-2xl border border-gray-200 border-dashed">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4 shadow-sm border border-gray-100">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                    <p className="text-sm sm:text-[15px] font-medium text-gray-900 mb-1">No events</p>
                    <p className="text-xs sm:text-[13px] text-gray-500">This document contains no schedule.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupKeys.map(lbl => (
                      <EventGroup
                        key={lbl}
                        labelKey={lbl}
                        events={grouped[lbl]}
                        onChangeByGlobal={handleEventChange}
                        onRemoveByGlobal={handleRemoveEvent}
                        onAdd={() => handleAddEvent(lbl)}
                      />
                    ))}

                    {/* Add new label type */}
                    <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                      {showNewLabel ? (
                        <div className="flex items-center gap-2">
                          <input
                            ref={newLabelRef}
                            autoFocus
                            value={newLabelInput}
                            onChange={e => setNewLabelInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleAddNewLabel(); if (e.key === "Escape") setShowNewLabel(false); }}
                            placeholder="e.g. sport, travel, meeting..."
                            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                          />
                          <Button size="sm" onClick={handleAddNewLabel} className="bg-blue-600 hover:bg-blue-700 text-white">Add</Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowNewLabel(false)}>Cancel</Button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewLabel(true)}
                          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors w-full"
                        >
                          <Plus className="w-4 h-4" />
                          Add new event type
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sticky Actions Footer */}
            <div className="px-3 sm:px-6 lg:px-8 py-3 sm:py-4 border-t border-gray-100 bg-white flex-shrink-0 relative z-10 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
              {/* Error — shown above buttons so they're never pushed off screen */}
              {error && (
                <Alert variant="destructive" className="py-1.5 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-gray-500 hidden sm:block flex-1 min-w-0">
                  {existingCourseId
                    ? <span>Update <strong>existing course</strong></span>
                    : <span>Creating with <Badge variant="secondary">{events.length}</Badge> events</span>}
                </div>
                {/* Buttons always visible — full width on mobile */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDiscard(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 flex-1 sm:flex-none"
                  >
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirm}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm flex-1 sm:flex-none"
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                    {loading ? "Processing..." : (existingCourseId ? "Update course" : "Create course")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && imageUrl && (
        <div onClick={() => setIsZoomed(false)} className="fixed inset-0 z-[9999] bg-gray-900/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-12 cursor-zoom-out">
          <img src={imageUrl} alt="Original" className="max-w-full max-h-full object-contain rounded-lg sm:rounded-xl shadow-2xl ring-1 ring-white/10" />
        </div>
      )}

      {/* Discard Confirmation */}
      {confirmDiscard && (
        <ConfirmDialog
          message="Are you sure you want to permanently delete this document? All extracted data will be discarded immediately."
          confirmLabel="Confirm Delete"
          cancelLabel="Keep"
          onCancel={() => setConfirmDiscard(false)}
          onConfirm={async () => {
            try { await syllabusService.delete(upload.id); onDiscarded?.(upload.id); }
            catch { setError("An error occurred, unable to delete this document."); setConfirmDiscard(false); }
          }}
        />
      )}
    </div>
  );
}