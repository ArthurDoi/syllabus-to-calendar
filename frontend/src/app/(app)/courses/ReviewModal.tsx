"use client";
import { useState, useEffect } from "react";
import { courseService, eventService } from "@/lib/services";
import type { SyllabusUpload, Course, CourseCreate, EventCreate, EventLabel } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Props {
  upload: SyllabusUpload;
  onClose: () => void;
  onCourseCreated: (course: Course) => void;
}

const LABEL_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  assignment: { color: "#e53e3e", bg: "#fff5f5", label: "Assignment", icon: "📝" },
  exam:       { color: "#d97706", bg: "#fffbeb", label: "Exam",       icon: "📋" },
  lecture:    { color: "#2563eb", bg: "#eff6ff", label: "Lecture",    icon: "📚" },
  holiday:    { color: "#16a34a", bg: "#f0fdf4", label: "Holiday",    icon: "🏖️" },
};

// ── Single editable event card ────────────────────────────────────────────────
function EventCard({
  ev, index, onChange, onRemove,
}: {
  ev: EventCreate;
  index: number;
  onChange: (i: number, patch: Partial<EventCreate>) => void;
  onRemove: (i: number) => void;
}) {
  const cfg = LABEL_CONFIG[ev.label || "lecture"] || LABEL_CONFIG.lecture;
  return (
    <div style={{
      border: `1px solid ${cfg.color}30`,
      borderRadius: 10,
      marginBottom: 10,
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
    }}>
      {/* Card header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", background: cfg.bg, borderBottom: `1px solid ${cfg.color}20`,
      }}>
        <input
          value={ev.title}
          onChange={e => onChange(index, { title: e.target.value })}
          style={{
            flex: 1, border: "none", background: "transparent", fontWeight: 600,
            fontSize: 13, color: "#111", outline: "none",
          }}
          placeholder="Tiêu đề sự kiện..."
        />
        <button
          onClick={() => onRemove(index)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, marginLeft: 8, lineHeight: 1 }}
        >✕</button>
      </div>

      {/* Card body */}
      <div style={{ padding: "10px 12px", display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* Date */}
        <div style={{ flex: "1 1 130px" }}>
          <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>NGÀY</label>
          <input
            type="date"
            value={ev.start_time ? ev.start_time.split("T")[0] : ""}
            onChange={e => onChange(index, { start_time: e.target.value ? e.target.value + "T00:00:00" : undefined })}
            style={{
              width: "100%", padding: "6px 8px", border: "1px solid #e5e7eb",
              borderRadius: 6, fontSize: 12, background: "#f9fafb", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Time */}
        <div style={{ flex: "1 1 100px" }}>
          <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>GIỜ</label>
          <input
            type="time"
            value={ev.start_time && ev.start_time.includes("T") ? ev.start_time.split("T")[1]?.slice(0, 5) || "" : ""}
            onChange={e => {
              const datePart = ev.start_time?.split("T")[0] || new Date().toISOString().split("T")[0];
              onChange(index, { start_time: e.target.value ? `${datePart}T${e.target.value}:00` : `${datePart}T00:00:00` });
            }}
            style={{
              width: "100%", padding: "6px 8px", border: "1px solid #e5e7eb",
              borderRadius: 6, fontSize: 12, background: "#f9fafb", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Label */}
        <div style={{ flex: "1 1 110px" }}>
          <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>LOẠI</label>
          <select
            value={ev.label || "lecture"}
            onChange={e => onChange(index, { label: e.target.value as EventLabel })}
            style={{
              width: "100%", padding: "6px 8px", border: `1px solid ${cfg.color}60`,
              borderRadius: 6, fontSize: 12, background: cfg.bg, color: cfg.color,
              fontWeight: 600, cursor: "pointer", boxSizing: "border-box",
            }}
          >
            {Object.entries(LABEL_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.icon} {c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: "0 12px 10px" }}>
        <textarea
          value={ev.description || ""}
          onChange={e => onChange(index, { description: e.target.value || undefined })}
          placeholder="Mô tả (tuỳ chọn)..."
          rows={2}
          style={{
            width: "100%", padding: "6px 8px", border: "1px solid #e5e7eb",
            borderRadius: 6, fontSize: 12, resize: "vertical", background: "#f9fafb",
            boxSizing: "border-box", fontFamily: "inherit", color: "#374151",
          }}
        />
      </div>
    </div>
  );
}

// ── Group of events by label ──────────────────────────────────────────────────
function EventGroup({
  labelKey, events, globalIndices, onChangeByGlobal, onRemoveByGlobal, onAdd,
}: {
  labelKey: string;
  events: { ev: EventCreate; globalIndex: number }[];
  globalIndices: number[];
  onChangeByGlobal: (gi: number, patch: Partial<EventCreate>) => void;
  onRemoveByGlobal: (gi: number) => void;
  onAdd: () => void;
}) {
  const [open, setOpen] = useState(true);
  const cfg = LABEL_CONFIG[labelKey] || LABEL_CONFIG.lecture;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Group header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: open ? 8 : 0,
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 13, color: "#111", padding: 0,
          }}
        >
          <span style={{
            background: cfg.bg, color: cfg.color, padding: "2px 10px",
            borderRadius: 20, fontSize: 12, border: `1px solid ${cfg.color}40`,
          }}>
            {cfg.icon} {cfg.label}
          </span>
          <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400 }}>
            ({events.length}) {open ? "▲" : "▼"}
          </span>
        </button>
        <button
          onClick={onAdd}
          style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 6,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}50`,
            cursor: "pointer", fontWeight: 600,
          }}
        >+ Thêm</button>
      </div>

      {open && events.map(({ ev, globalIndex }) => (
        <EventCard
          key={globalIndex}
          ev={ev}
          index={globalIndex}
          onChange={(_, patch) => onChangeByGlobal(globalIndex, patch)}
          onRemove={() => onRemoveByGlobal(globalIndex)}
        />
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
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

  const [events, setEvents] = useState<EventCreate[]>(parsed?.events || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);

  const existingCourseId = upload.course_id;

  // Build authenticated image URL via blob
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    let objectUrl: string;
    fetch(`${API_BASE}/syllabus/${upload.id}/file`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      })
      .catch(() => setImageUrl(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [upload.id]);

  const handleEventChange = (i: number, patch: Partial<EventCreate>) => {
    setEvents(prev => prev.map((ev, idx) => idx === i ? { ...ev, ...patch } : ev));
  };

  const handleRemoveEvent = (i: number) => {
    setEvents(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleAddEvent = (label: string) => {
    setEvents(prev => [...prev, { title: "Sự kiện mới", label: label as EventLabel, status: "pending" }]);
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
        course = await courseService.update(existingCourseId, payload);
        const dbEvents = await eventService.list({ course_id: existingCourseId });
        for (let i = 0; i < Math.min(events.length, dbEvents.length); i++) {
          const local = events[i];
          const db = dbEvents[i];
          const needsUpdate =
            local.title !== db.title ||
            local.label !== db.label ||
            local.description !== db.description ||
            (local.start_time || null) !== (db.start_time || null);
          if (needsUpdate) {
            await eventService.update(db.id, {
              title: local.title,
              label: local.label,
              description: local.description,
              start_time: local.start_time || undefined,
              end_time: local.end_time || undefined,
            });
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
          try { await eventService.create({ ...ev, course_id: course.id }); } catch { /* skip */ }
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

  // Group events by label
  const LABEL_ORDER = ["assignment", "exam", "lecture", "holiday"];
  const grouped = LABEL_ORDER.reduce<Record<string, { ev: EventCreate; globalIndex: number }[]>>(
    (acc, lbl) => { acc[lbl] = []; return acc; }, {}
  );
  events.forEach((ev, i) => {
    const key = ev.label && grouped[ev.label] !== undefined ? ev.label : "lecture";
    grouped[key].push({ ev, globalIndex: i });
  });
  // Any unknown labels
  events.forEach((ev, i) => {
    if (!ev.label || !grouped[ev.label]) {
      grouped["lecture"].push({ ev, globalIndex: i });
    }
  });

  const isImage = upload.file_type?.startsWith("image/");

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 300,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 1060,
        height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
      }}>
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid #f3f4f6", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>Xem lại &amp; Chỉnh sửa</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              So sánh tài liệu gốc và chỉnh sửa danh sách lịch trước khi xác nhận.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}
          >✕</button>
        </div>

        {/* ── Body: 2 columns ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* LEFT: Document viewer */}
          <div style={{
            width: "44%", borderRight: "1px solid #f3f4f6", display: "flex",
            flexDirection: "column", background: "#fafafa",
          }}>
            {/* File info bar */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 16px", background: "#fff", borderBottom: "1px solid #f3f4f6",
            }}>
              <span style={{ fontSize: 20 }}>{isImage ? "🖼️" : "📄"}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {upload.original_name}
                </div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>
                  {upload.file_size ? (upload.file_size / 1024).toFixed(1) + " KB" : ""} · {upload.file_type || ""}
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <a
                  href={imageUrl || "#"}
                  download={upload.original_name}
                  style={{
                    fontSize: 18, color: "#9ca3af", textDecoration: "none",
                    display: imageUrl ? "block" : "none",
                  }}
                  title="Tải xuống"
                >⬇</a>
              </div>
            </div>

            {/* Image / preview */}
            <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 16 }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={upload.original_name}
                  style={{ maxWidth: "100%", borderRadius: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.12)", border: "1px solid #e5e7eb" }}
                />
              ) : (
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  justifyContent: "center", height: "100%", color: "#9ca3af", gap: 10,
                }}>
                  <span style={{ fontSize: 48 }}>📄</span>
                  <div style={{ fontSize: 13 }}>{upload.file_type?.includes("pdf") ? "PDF — xem trực tiếp chưa được hỗ trợ" : "Đang tải ảnh..."}</div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Editable event list */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Course info toggle */}
            <div style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6", flexShrink: 0 }}>
              <button
                onClick={() => setShowCourseForm(o => !o)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "1px solid #e5e7eb", borderRadius: 8,
                  padding: "6px 14px", cursor: "pointer", fontSize: 12, color: "#374151",
                  fontWeight: 600, width: "100%", justifyContent: "space-between",
                }}
              >
                <span>🎓 {form.name || "Thông tin khóa học"}</span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{showCourseForm ? "▲ Thu gọn" : "▼ Chỉnh sửa"}</span>
              </button>

              {showCourseForm && (
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {(([["Tên môn học", "name"], ["Giảng viên", "instructor"], ["Ngày bắt đầu", "start_date"], ["Ngày kết thúc", "end_date"], ["Mã môn", "code"], ["Học kỳ", "term"]] as const)).map(([lbl, key]) => (
                    <div key={key}>
                      <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 3 }}>{lbl}</label>
                      <input
                        value={(form as unknown as Record<string, string>)[key] || ""}
                        onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ width: "100%", padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 6, fontSize: 12, boxSizing: "border-box" }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 10, color: "#9ca3af", display: "block", marginBottom: 6 }}>Màu sắc</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"].map(c => (
                        <div key={c} onClick={() => setForm(prev => ({ ...prev, color: c }))}
                          style={{ width: 22, height: 22, borderRadius: "50%", background: c, cursor: "pointer", border: form.color === c ? "2.5px solid #111" : "2px solid transparent" }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Events list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>
                  📋 Danh sách lịch trình
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#9ca3af", marginLeft: 6 }}>({events.length} sự kiện)</span>
                </div>
              </div>

              {events.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af", fontSize: 13 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
                  Không có sự kiện nào. Hãy thêm mới.
                </div>
              ) : (
                LABEL_ORDER.map(lbl => (
                  grouped[lbl].length > 0 || true ? (
                    <EventGroup
                      key={lbl}
                      labelKey={lbl}
                      events={grouped[lbl]}
                      globalIndices={grouped[lbl].map(x => x.globalIndex)}
                      onChangeByGlobal={handleEventChange}
                      onRemoveByGlobal={handleRemoveEvent}
                      onAdd={() => handleAddEvent(lbl)}
                    />
                  ) : null
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 24px", borderTop: "1px solid #f3f4f6", flexShrink: 0, background: "#fff",
        }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {existingCourseId
              ? <>Sẽ <b>cập nhật</b> khóa học và đồng bộ <b>{events.length}</b> sự kiện</>
              : <>Sẽ tạo <b>{events.length}</b> sự kiện trong calendar</>}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {error && (
              <div style={{ fontSize: 12, color: "#dc2626", maxWidth: 280, textAlign: "right" }}>❌ {error}</div>
            )}
            <button
              onClick={onClose}
              style={{ padding: "9px 20px", border: "1px solid #d1d5db", borderRadius: 8, background: "#fff", fontSize: 13, cursor: "pointer", color: "#374151" }}
            >Đóng</button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: "9px 22px", background: loading ? "#6b7280" : "#111", color: "#fff",
                border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {loading ? (
                <><span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> Đang xử lý...</>
              ) : (
                existingCourseId ? "✓ Xác nhận & Cập nhật" : "✓ Tạo khóa học"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
