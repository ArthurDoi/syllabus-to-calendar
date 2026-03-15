"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { syllabusService, courseService, eventService } from "@/lib/services";
import type { SyllabusUpload, Course, CourseCreate, CalEvent } from "@/types";
import ReviewModal from "./ReviewModal";
import { CourseCard } from "@/components/course/CourseCard";
import { cn } from "@/lib/utils";

type View = "list" | "upload";

// ─── Reusable confirm dialog ─────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 380, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>🗑️</div>
        <div style={{ fontSize: 15, fontWeight: 600, textAlign: "center", marginBottom: 8 }}>Xác nhận xóa</div>
        <div style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24 }}>{message}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "9px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 14, cursor: "pointer" }}>Hủy</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "9px", border: "none", borderRadius: 8, background: "#dc2626", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Xóa</button>
        </div>
      </div>
    </div>
  );
}

// ─── Course detail / edit modal ───────────────────────────────────────────────
function CourseModal({ course, onClose, onSaved, onDeleted }: {
  course: Course;
  onClose: () => void;
  onSaved: (c: Course) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState<CourseCreate>({
    name: course.name, code: course.code || "", term: course.term || "",
    instructor: course.instructor || "",
    start_date: course.start_date ? course.start_date.split("T")[0] : "",
    end_date: course.end_date ? course.end_date.split("T")[0] : "",
    color: course.color, icon: course.icon,
  });
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    eventService.list({ course_id: course.id }).then(setEvents).catch(() => {});
  }, [course.id]);

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      const payload: CourseCreate = {
        ...form,
        start_date: form.start_date || undefined,
        end_date: form.end_date || undefined,
        code: form.code || undefined,
        term: form.term || undefined,
        instructor: form.instructor || undefined,
      };
      const saved = await courseService.update(course.id, payload);
      onSaved(saved);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Không thể lưu khóa học";
      setError(typeof msg === "string" ? msg : "Lỗi khi lưu");
    } finally { setSaving(false); }
  };

  const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760, maxHeight: "90vh", overflowY: "auto", padding: 32, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>

        <div style={{ borderTop: `4px solid ${form.color}`, borderRadius: 4, marginBottom: 20, marginTop: -4 }} />
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Chi tiết khóa học</div>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24 }}>Xem và chỉnh sửa thông tin khóa học</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          {/* Left: form */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: "#374151" }}>Thông tin khóa học</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {([["Tên môn học", "name"], ["Mã môn", "code"], ["Học kỳ", "term"], ["Giảng viên", "instructor"], ["Ngày bắt đầu", "start_date"], ["Ngày kết thúc", "end_date"]] as const).map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 5, fontWeight: 500 }}>{label}</label>
                  <input
                    type={key.includes("date") ? "date" : "text"}
                    value={(form as unknown as Record<string, string>)[key] || ""}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, boxSizing: "border-box" as const }}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 6 }}>Màu sắc</label>
              <div style={{ display: "flex", gap: 8 }}>
                {COLORS.map(c => (
                  <div key={c} onClick={() => setForm(prev => ({ ...prev, color: c }))}
                    style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "3px solid #111" : "3px solid transparent" }} />
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626", marginBottom: 10 }}>
                ❌ {error}
              </div>
            )}
          </div>

          {/* Right: events list */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: "#374151" }}>
              Lịch học ({events.length} sự kiện)
            </div>
            {events.length === 0 ? (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "#9ca3af", fontSize: 14, background: "#f9fafb", borderRadius: 10 }}>
                Chưa có sự kiện nào
              </div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {events.map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", border: "1px solid #f3f4f6", borderRadius: 10, marginBottom: 6, background: "#fafafa" }}>
                    <span style={{ fontSize: 16 }}>{ev.label === "exam" ? "🎓" : ev.label === "assignment" ? "📝" : "📖"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                      {ev.start_time && (
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                          {new Date(ev.start_time).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 99,
                      background: ev.status === "completed" ? "#dcfce7" : ev.label === "exam" ? "#fee2e2" : "#eff6ff",
                      color: ev.status === "completed" ? "#16a34a" : ev.label === "exam" ? "#dc2626" : "#2563eb",
                      fontWeight: 500 }}>
                      {ev.label || "lecture"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
          <button onClick={() => setConfirmDelete(true)}
            style={{ padding: "9px 18px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            🗑 Xóa khóa học
          </button>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "9px 22px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 14, cursor: "pointer" }}>Hủy</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: "9px 22px", background: saving ? "#6b7280" : "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          message={`Bạn có chắc muốn xóa "${course.name}"? Tất cả sự kiện liên quan cũng sẽ bị xóa.`}
          onConfirm={async () => { await courseService.delete(course.id); onDeleted(course.id); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CoursesPage() {
  const [view, setView] = useState<View>("list");
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<SyllabusUpload[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<SyllabusUpload | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUpload, setPreviewUpload] = useState<SyllabusUpload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollCleanups = useRef<Map<string, () => void>>(new Map());
  const localBlobUrls = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    syllabusService.list().then(setUploads);
    courseService.list().then(setCourses);
    return () => {
      pollCleanups.current.forEach(fn => fn());
      localBlobUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const stageFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files as Iterable<File>);
    if (!arr.length) return;
    setPendingFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const incoming = arr.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...incoming];
    });
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploadError(null);
    setUploading(true);
    for (const file of files) {
      const blobUrl = URL.createObjectURL(file);
      try {
        const upload = await syllabusService.upload(file);
        localBlobUrls.current.set(upload.id, blobUrl);
        setUploads(prev => [upload, ...prev]);
        setPreviewUpload(upload);
      } catch (err: unknown) {
        URL.revokeObjectURL(blobUrl);
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (err instanceof Error ? err.message : `Không thể upload "${file.name}"`);
        setUploadError(typeof msg === "string" ? msg : `Upload thất bại: ${file.name}`);
      }
    }
    setUploading(false);
    setPendingFiles([]);
  }, []);

  const handleExtract = useCallback(async (upload: SyllabusUpload) => {
    setExtractingIds(prev => new Set(prev).add(upload.id));
    try {
      const updated = await syllabusService.extract(upload.id);
      setUploads(prev => prev.map(u => u.id === updated.id ? updated : u));
      const stop = syllabusService.pollUntilDone(upload.id, (polled) => {
        setUploads(prev => prev.map(u => u.id === polled.id ? polled : u));
        if (polled.status === "done") courseService.list().then(setCourses);
      });
      pollCleanups.current.set(upload.id, stop);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : "Không thể trích xuất");
      setUploadError(typeof msg === "string" ? msg : "Trích xuất thất bại");
    } finally {
      setExtractingIds(prev => { const s = new Set(prev); s.delete(upload.id); return s; });
    }
  }, []);

  const handleCourseCreated = useCallback(async (course: Course, uploadId: string) => {
    try { await syllabusService.delete(uploadId); } catch { /* ignore */ }
    setCourses(prev => [course, ...prev]);
    setUploads(prev => prev.filter(u => u.id !== uploadId));
    setSelectedUpload(null);
    setView("list");
  }, []);

  const processing = uploads.filter(u => u.status === "processing" || u.status === "uploading");
  const uploaded = uploads.filter(u => u.status === "uploaded");
  const done = uploads.filter(u => u.status === "done" || u.status === "error");

  if (view === "list") {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500 mb-2">
                Courses
              </p>
              <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
              <p className="text-sm text-gray-500 mt-1">
                {courses.length === 0
                  ? 'Upload a syllabus or add a course manually to start planning.'
                  : `Tracking ${courses.length} ${courses.length === 1 ? 'course' : 'courses'} across the term.`}
              </p>
            </div>
            <Button
              onClick={() => setView("upload")}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </div>
        </div>

        {courses.length === 0 ? (
          <Card className="p-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-gray-200">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                <Plus className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Get started by uploading your first course syllabus or creating a course manually.
              </p>
              <Button
                onClick={() => setView("upload")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Course
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onEdit={c => setSelectedCourse(c)} onDeleted={id => setCourses(prev => prev.filter(c => c.id !== id))} />
            ))}
          </div>
        )}

        {selectedCourse && (
          <CourseModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
            onSaved={(updated) => { setCourses(prev => prev.map(c => c.id === updated.id ? updated : c)); setSelectedCourse(null); }}
            onDeleted={(id) => { setCourses(prev => prev.filter(c => c.id !== id)); setSelectedCourse(null); }}
          />
        )}
      </div>
    );
  }

  // ── UPLOAD VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500 mb-2">Courses</p>
          <h1 className="text-3xl font-bold text-gray-900">Upload Syllabus</h1>
          <p className="text-sm text-gray-500 mt-1">Upload your syllabus files and extract course schedule with AI.</p>
        </div>
        <Button onClick={() => { setView("list"); setUploadError(null); setPendingFiles([]); }} variant="outline">
          ← Back
        </Button>
      </div>

      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between items-center">
          <span>❌ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* ── SECTION 1: Drag & Drop Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); stageFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn("border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all mb-5", dragging ? "border-purple-500 bg-purple-50" : "border-gray-300 bg-white shadow-sm")}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
          onChange={e => { stageFiles(e.target.files); e.target.value = ""; }} />
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#7c3aed" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </div>
        <div className="text-sm font-semibold text-gray-900 mb-1">Drag and drop files here</div>
        <div className="text-sm text-gray-500 mb-1">or click to browse</div>
        <div className="text-xs text-gray-400">Supports PDF, JPEG, PNG (Max 10MB)</div>
      </div>

      {/* ── SECTION 2: Selected Files + Upload button ── */}
      {pendingFiles.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="font-semibold text-gray-900">Selected files ({pendingFiles.length})</div>
              <div className="text-xs text-gray-500">Total {(pendingFiles.reduce((s, f) => s + f.size, 0) / 1024).toFixed(2)} KB</div>
            </div>
            <Button onClick={() => handleFiles(pendingFiles)} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload & Process"}
            </Button>
          </div>
          <div className="space-y-2">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-900">{f.name}</div>
                  <div className="text-xs text-gray-500">{(f.size / 1024).toFixed(2)} KB</div>
                </div>
                <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Uploaded (pending extract) */}
      {uploaded.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="font-semibold text-sm mb-3">Chờ trích xuất ({uploaded.length})</div>
          <div className="space-y-2">
            {uploaded.map(u => {
              const isExtracting = extractingIds.has(u.id);
              return (
                <div key={u.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex-1 cursor-pointer" onClick={() => setPreviewUpload(previewUpload?.id === u.id ? null : u)}>
                    <div className="text-sm font-medium text-gray-900 truncate">{u.original_name}</div>
                    <div className="text-xs text-gray-500">{u.file_size ? (u.file_size / 1024).toFixed(2) + " KB" : ""}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button onClick={() => handleExtract(u)} disabled={isExtracting} size="sm" variant={isExtracting ? "secondary" : "default"}>
                      {isExtracting ? "⟳ Đang xử lý..." : "✨ Trích xuất"}
                    </Button>
                    <button onClick={() => syllabusService.delete(u.id).then(() => setUploads(prev => prev.filter(x => x.id !== u.id)))} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Processing */}
      {processing.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="flex justify-between items-center mb-3">
            <div className="font-semibold text-sm">Đang xử lý ({processing.length})</div>
            <div className="text-xs text-blue-600 flex items-center gap-1">
              <span className="animate-spin inline-block">⟳</span> AI đang phân tích...
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-1.5 rounded-full" style={{ width: "65%" }}></div>
          </div>
          <div className="space-y-2">
            {processing.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-900">{u.original_name}</div>
                  <div className="text-xs text-gray-500">{u.file_size ? (u.file_size / 1024).toFixed(2) + " KB" : ""}</div>
                </div>
                <span>⏳</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Done/Error */}
      {done.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="font-semibold text-sm mb-3">Kết quả xử lý</div>
          <div className="space-y-2">
            {done.map(u => (
              <div key={u.id} onClick={() => u.status === "done" && setSelectedUpload(u)}
                className={cn("flex justify-between items-center p-3 border rounded-lg", u.status === "done" ? "border-green-200 bg-green-50 cursor-pointer" : "border-red-200 bg-red-50")}>
                <div className="flex items-center gap-3">
                  <span>{u.status === "done" ? "✅" : "❌"}</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{u.original_name}</div>
                    <div className={cn("text-xs", u.status === "done" ? "text-green-700" : "text-red-600")}>
                      {u.status === "done" ? "Trích xuất thành công – nhấn để xem và tạo khóa học" : u.error_message || "Xử lý thất bại"}
                    </div>
                  </div>
                </div>
                {u.status === "done" && <span className="text-xs font-medium text-gray-600">Xem chi tiết →</span>}
                {u.status === "error" && (
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); syllabusService.delete(u.id).then(() => setUploads(prev => prev.filter(x => x.id !== u.id))); }} className="text-red-600 hover:text-red-700 hover:bg-red-100">✕ Xóa</Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── SECTION 3: Document Preview ── */}
      {previewUpload && (
        <Card className="overflow-hidden mb-5">
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded text-blue-600 flex items-center justify-center">🖼</div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{previewUpload.original_name}</div>
                <div className="text-xs text-gray-500">{previewUpload.file_size ? (previewUpload.file_size / 1024).toFixed(2) + " KB" : ""}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreviewUpload(null)}>✕</Button>
          </div>
          <div className="p-6 min-h-[300px] flex items-center justify-center bg-gray-50">
            {(() => {
              const blobUrl = localBlobUrls.current.get(previewUpload.id);
              const isImage = previewUpload.file_type?.startsWith("image/");
              const isPdf = previewUpload.file_type === "application/pdf";
              if (isImage && blobUrl) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={blobUrl} alt={previewUpload.original_name} className="max-w-full max-h-[520px] rounded shadow object-contain" />
                );
              }
              if (isPdf) {
                return (
                  <div className="text-center">
                    <div className="text-5xl mb-3">📄</div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">{previewUpload.original_name}</div>
                    <div className="text-xs text-gray-500">PDF</div>
                  </div>
                );
              }
              return (
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">📁</div>
                  <div className="text-sm">Không thể hiển thị xem trước</div>
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      {selectedUpload && (
        <ReviewModal upload={selectedUpload} onClose={() => setSelectedUpload(null)}
          onCourseCreated={(c) => handleCourseCreated(c, selectedUpload.id)} />
      )}
    </div>
  );
}
