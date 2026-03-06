"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { syllabusService, courseService, eventService } from "@/lib/services";
import type { SyllabusUpload, Course, CourseCreate, CalEvent } from "@/types";
import ReviewModal from "./ReviewModal";

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
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Chi tiết khóa học</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>Xem và chỉnh sửa thông tin khóa học</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          {/* Left: form */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: "#374151" }}>Thông tin khóa học</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {([["Tên môn học", "name"], ["Mã môn", "code"], ["Học kỳ", "term"], ["Giảng viên", "instructor"], ["Ngày bắt đầu", "start_date"], ["Ngày kết thúc", "end_date"]] as const).map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>{label}</label>
                  <input
                    type={key.includes("date") ? "date" : "text"}
                    value={(form as unknown as Record<string, string>)[key] || ""}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }}
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
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 14, color: "#374151" }}>
              Lịch học ({events.length} sự kiện)
            </div>
            {events.length === 0 ? (
              <div style={{ padding: "30px 16px", textAlign: "center", color: "#9ca3af", fontSize: 13, background: "#f9fafb", borderRadius: 10 }}>
                Chưa có sự kiện nào
              </div>
            ) : (
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {events.map(ev => (
                  <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: "1px solid #f3f4f6", borderRadius: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{ev.label === "exam" ? "🎓" : ev.label === "assignment" ? "📝" : "📖"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                      {ev.start_time && (
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {new Date(ev.start_time).toLocaleDateString("vi-VN")}
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99,
                      background: ev.status === "completed" ? "#dcfce7" : ev.label === "exam" ? "#fee2e2" : "#eff6ff",
                      color: ev.status === "completed" ? "#16a34a" : ev.label === "exam" ? "#dc2626" : "#2563eb" }}>
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
  const inputRef = useRef<HTMLInputElement>(null);
  const pollCleanups = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    syllabusService.list().then(setUploads);
    courseService.list().then(setCourses);
    return () => pollCleanups.current.forEach(fn => fn());
  }, []);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    for (const file of Array.from(files)) {
      try {
        const upload = await syllabusService.upload(file);
        setUploads(prev => [upload, ...prev]);
        const stop = syllabusService.pollUntilDone(upload.id, (updated) => {
          setUploads(prev => prev.map(u => u.id === updated.id ? updated : u));
          if (updated.status === "done") courseService.list().then(setCourses);
        });
        pollCleanups.current.set(upload.id, stop);
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (err instanceof Error ? err.message : `Không thể upload "${file.name}"`);
        setUploadError(typeof msg === "string" ? msg : `Upload thất bại: ${file.name}`);
      }
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
  const done = uploads.filter(u => u.status === "done" || u.status === "error");

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div style={{ padding: "28px 32px", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>Khóa học của bạn</div>
            <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
              {courses.length > 0 ? `${courses.length} khóa học` : "Chưa có khóa học nào"}
            </div>
          </div>
          <button onClick={() => setView("upload")}
            style={{ padding: "10px 20px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>＋</span> Thêm khóa học
          </button>
        </div>

        {courses.length === 0 && (
          <div style={{ border: "2px dashed #e5e7eb", borderRadius: 16, padding: "60px 24px", textAlign: "center", background: "#fafafa" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📚</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Chưa có khóa học nào</div>
            <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>Upload syllabus để AI tự động tạo khóa học và lịch học</div>
            <button onClick={() => setView("upload")}
              style={{ padding: "10px 24px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Upload syllabus đầu tiên
            </button>
          </div>
        )}

        {courses.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 16 }}>
            {courses.map(c => (
              <div key={c.id}
                onClick={() => setSelectedCourse(c)}
                style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, borderTop: `4px solid ${c.color}`, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", cursor: "pointer", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)")}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)")}
              >
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>
                  {[c.code, c.instructor].filter(Boolean).join(" · ")}
                </div>
                {c.term && <div style={{ fontSize: 11, color: "#9ca3af" }}>{c.term}</div>}
                {(c.start_date || c.end_date) && (
                  <div style={{ marginTop: 12, fontSize: 11, color: "#9ca3af", borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
                    📅 {c.start_date ? new Date(c.start_date).toLocaleDateString("vi-VN") : "?"} –{" "}
                    {c.end_date ? new Date(c.end_date).toLocaleDateString("vi-VN") : "?"}
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 12, color: "#9ca3af" }}>Click để xem chi tiết →</div>
              </div>
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

        {selectedUpload && (
          <ReviewModal upload={selectedUpload} onClose={() => setSelectedUpload(null)}
            onCourseCreated={(c) => handleCourseCreated(c, selectedUpload.id)} />
        )}
      </div>
    );
  }

  // ── UPLOAD VIEW ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "28px 32px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Upload syllabus</div>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>AI sẽ tự động trích xuất thông tin khóa học và lịch học</div>
        </div>
        <button onClick={() => { setView("list"); setUploadError(null); }}
          style={{ padding: "8px 18px", border: "1px solid #d1d5db", borderRadius: 10, background: "#fff", fontSize: 14, cursor: "pointer", color: "#374151" }}>
          ← Quay lại
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 24, marginBottom: 20 }}>
        {uploadError && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>❌ {uploadError}</span>
            <button onClick={() => setUploadError(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#dc2626" }}>✕</button>
          </div>
        )}
        <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? "#2563eb" : "#d1d5db"}`, borderRadius: 12, padding: "52px 24px", textAlign: "center", background: dragging ? "#eff6ff" : "#fafafa", cursor: "pointer", transition: "all 0.2s" }}>
          <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
          <div style={{ fontSize: 32, marginBottom: 10 }}>⬆️</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Kéo thả file vào đây</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 2 }}>hoặc click để chọn file</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Hỗ trợ PDF, JPEG, PNG (Tối đa 10MB)</div>
        </div>
      </div>

      {processing.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Đang xử lý ({processing.length})</div>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{(processing.reduce((s, u) => s + (u.file_size || 0), 0) / 1024).toFixed(2)} KB tổng</div>
            </div>
            <button style={{ padding: "7px 16px", background: "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "default" }}>
              <span>⟳</span> Đang xử lý...
            </button>
          </div>
          <div style={{ background: "#e5e7eb", borderRadius: 99, height: 6, marginBottom: 14 }}>
            <div style={{ width: "60%", height: "100%", background: "#111", borderRadius: 99, transition: "width 0.5s" }} />
          </div>
          {processing.map(u => (
            <div key={u.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{u.original_name}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{u.file_size ? (u.file_size / 1024).toFixed(2) + " KB" : ""}</div>
              </div>
              <span style={{ fontSize: 12, color: "#f59e0b" }}>⏳</span>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Kết quả xử lý</div>
          {done.map(u => (
            <div key={u.id} onClick={() => u.status === "done" && setSelectedUpload(u)}
              style={{ border: `1px solid ${u.status === "done" ? "#bbf7d0" : "#fecaca"}`, borderRadius: 10, padding: "14px 18px", marginBottom: 10, background: u.status === "done" ? "#f0fdf4" : "#fef2f2", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: u.status === "done" ? "pointer" : "default" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{u.status === "done" ? "✅" : "❌"}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.original_name}</div>
                  <div style={{ fontSize: 12, color: u.status === "done" ? "#16a34a" : "#dc2626" }}>
                    {u.status === "done" ? "Xử lý thành công – click để xem và tạo khóa học" : u.error_message || "Xử lý thất bại"}
                  </div>
                </div>
              </div>
              {u.status === "done" && <span style={{ fontSize: 12, color: "#6b7280" }}>Xem chi tiết →</span>}
              {u.status === "error" && (
                <button onClick={e => { e.stopPropagation(); syllabusService.delete(u.id).then(() => setUploads(prev => prev.filter(x => x.id !== u.id))); }}
                  style={{ padding: "4px 10px", fontSize: 12, border: "none", borderRadius: 6, cursor: "pointer", background: "#fee2e2", color: "#dc2626" }}>✕ Xóa</button>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedUpload && (
        <ReviewModal upload={selectedUpload} onClose={() => setSelectedUpload(null)}
          onCourseCreated={(c) => handleCourseCreated(c, selectedUpload.id)} />
      )}
    </div>
  );
}
