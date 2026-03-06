"use client";
import { useState } from "react";
import { courseService, eventService } from "@/lib/services";
import type { SyllabusUpload, Course, CourseCreate, EventCreate } from "@/types";

interface Props {
  upload: SyllabusUpload;
  onClose: () => void;
  onCourseCreated: (course: Course) => void;
}

// Editable row for a single event
function EventRow({
  ev, index, onChange, onRemove,
}: {
  ev: EventCreate;
  index: number;
  onChange: (i: number, field: keyof EventCreate, val: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
      <td style={{ border: "1px solid #e5e7eb", padding: "4px 6px", width: 32, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
        {ev.week_number || index + 1}
      </td>
      <td style={{ border: "1px solid #e5e7eb", padding: "4px 4px" }}>
        <input
          value={ev.title}
          onChange={e => onChange(index, "title", e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 12, background: "transparent" }}
        />
      </td>
      <td style={{ border: "1px solid #e5e7eb", padding: "4px 4px" }}>
        <input
          type="date"
          value={ev.start_time ? ev.start_time.split("T")[0] : ""}
          onChange={e => onChange(index, "start_time", e.target.value ? e.target.value + "T00:00:00" : "")}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 11, background: "transparent" }}
        />
      </td>
      <td style={{ border: "1px solid #e5e7eb", padding: "4px 4px" }}>
        <select
          value={ev.label || "lecture"}
          onChange={e => onChange(index, "label", e.target.value)}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 11, background: "transparent", color: ev.label === "exam" ? "#dc2626" : ev.label === "assignment" ? "#2563eb" : "#374151" }}
        >
          <option value="lecture">lecture</option>
          <option value="assignment">assignment</option>
          <option value="exam">exam</option>
          <option value="holiday">holiday</option>
        </select>
      </td>
      <td style={{ border: "1px solid #e5e7eb", padding: "4px 6px" }}>
        <button onClick={() => onRemove(index)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: 13 }}>✕</button>
      </td>
    </tr>
  );
}

export default function ReviewModal({ upload, onClose, onCourseCreated }: Props) {
  const parsed = upload.parsed_data;

  const [form, setForm] = useState<CourseCreate>({
    name: parsed?.course_info?.name || "Untitled Course",
    code: parsed?.course_info?.code || "",
    term: parsed?.course_info?.term || "",
    instructor: parsed?.course_info?.instructor || "",
    start_date: parsed?.course_info?.start_date || "",
    end_date: parsed?.course_info?.end_date || "",
    color: parsed?.course_info?.color || "#2563eb",
    icon: "Calendar",
  });

  // Editable events list (local copy to diff against)
  const [events, setEvents] = useState<EventCreate[]>(parsed?.events || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whether backend already created a course for this upload
  const existingCourseId = upload.course_id;

  const handleEventChange = (i: number, field: keyof EventCreate, val: string) => {
    setEvents(prev => prev.map((ev, idx) => idx === i ? { ...ev, [field]: val || undefined } : ev));
  };

  const handleRemoveEvent = (i: number) => {
    setEvents(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleAddEvent = () => {
    setEvents(prev => [...prev, { title: "Buổi học mới", label: "lecture", status: "pending" }]);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
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
        // Backend already created the course → just UPDATE it, don't create again
        course = await courseService.update(existingCourseId, payload);

        // Sync edited events: events already exist in DB from _process_syllabus.
        // We update the ones that have a different title, and create added ones.
        // For simplicity: fetch existing events and patch titles that changed
        const dbEvents = await eventService.list({ course_id: existingCourseId });

        // Update existing events (by position)
        for (let i = 0; i < Math.min(events.length, dbEvents.length); i++) {
          const local = events[i];
          const db = dbEvents[i];
          const needsUpdate =
            local.title !== db.title ||
            local.label !== db.label ||
            (local.start_time || null) !== (db.start_time || null);
          if (needsUpdate) {
            await eventService.update(db.id, {
              title: local.title,
              label: local.label,
              start_time: local.start_time || undefined,
              end_time: local.end_time || undefined,
            });
          }
        }
        // Create extra events that were added
        for (let i = dbEvents.length; i < events.length; i++) {
          await eventService.create({ ...events[i], course_id: existingCourseId });
        }
        // Delete events that were removed
        for (let i = events.length; i < dbEvents.length; i++) {
          await eventService.delete(dbEvents[i].id);
        }
      } else {
        // No course yet → create one
        course = await courseService.create(payload);
        // Events are not yet in DB, create them
        for (const ev of events) {
          try {
            await eventService.create({ ...ev, course_id: course.id });
          } catch { /* skip invalid events */ }
        }
      }

      onCourseCreated(course);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : "Không thể tạo khóa học. Vui lòng thử lại.");
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 1020, maxHeight: "92vh", overflowY: "auto", padding: 32, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af" }}>✕</button>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>Xem lại & Chỉnh sửa Syllabus</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
          {existingCourseId
            ? "AI đã tạo sẵn khóa học. Kiểm tra và chỉnh sửa trước khi xác nhận."
            : "Kiểm tra thông tin AI trích xuất và chỉnh sửa nếu cần."}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 28 }}>
          {/* Left: editable events table */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>📋 Danh sách sự kiện ({events.length})</div>
              <button onClick={handleAddEvent}
                style={{ padding: "4px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, cursor: "pointer" }}>
                + Thêm
              </button>
            </div>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12, color: "#6b7280", padding: "8px 12px", marginBottom: 10 }}>
              📄 {upload.original_name} · {upload.file_size ? (upload.file_size / 1024).toFixed(2) + " KB" : ""}
            </div>
            <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: "#f9fafb" }}>
                  <tr>
                    {["#", "TIÊU ĐỀ", "NGÀY", "LOẠI", ""].map(h => (
                      <th key={h} style={{ border: "1px solid #e5e7eb", padding: "7px 8px", textAlign: "left", fontWeight: 600, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>Không có sự kiện nào</td></tr>
                  ) : events.map((ev, i) => (
                    <EventRow key={i} ev={ev} index={i} onChange={handleEventChange} onRemove={handleRemoveEvent} />
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>💡 Click vào ô để sửa trực tiếp</div>
          </div>

          {/* Right: course form */}
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{upload.original_name}</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 16, color: upload.status === "done" ? "#16a34a" : "#dc2626" }}>
              STATUS: {upload.status === "done" ? "SUCCESS" : "ERROR"}
              {existingCourseId && <span style={{ marginLeft: 8, color: "#2563eb" }}>(sẽ CẬP NHẬT course hiện có)</span>}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Thông tin khóa học</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {([["Tên môn học", "name"], ["Giảng viên", "instructor"], ["Ngày bắt đầu", "start_date"], ["Ngày kết thúc", "end_date"]] as const).map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>{label}</label>
                  <input
                    value={(form as unknown as Record<string, string>)[key] || ""}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, boxSizing: "border-box" as const }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>Mã môn</label>
                <input value={form.code || ""} onChange={e => setForm(prev => ({ ...prev, code: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>Học kỳ</label>
                <input value={form.term || ""} onChange={e => setForm(prev => ({ ...prev, term: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13 }} />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 6 }}>Màu sắc</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"].map(c => (
                  <div key={c} onClick={() => setForm(prev => ({ ...prev, color: c }))}
                    style={{ width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "2px solid #111" : "2px solid transparent" }} />
                ))}
              </div>
            </div>

            <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {existingCourseId
                  ? <>Sẽ <b>cập nhật</b> khóa học và đồng bộ <b>{events.length}</b> sự kiện</>
                  : <>Sẽ tạo <b>{events.length}</b> sự kiện trong calendar</>}
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 14, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626" }}>
                ❌ {error}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 20 }}>
          <button onClick={onClose} style={{ padding: "9px 22px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 14, cursor: "pointer" }}>Hủy</button>
          <button onClick={handleConfirm} disabled={loading}
            style={{ padding: "9px 22px", background: loading ? "#6b7280" : "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Đang xử lý..." : existingCourseId ? "✓ Xác nhận & Cập nhật" : "✓ Tạo khóa học"}
          </button>
        </div>
      </div>
    </div>
  );
}
