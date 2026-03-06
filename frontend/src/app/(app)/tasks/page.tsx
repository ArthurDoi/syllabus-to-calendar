"use client";
import { useEffect, useState } from "react";
import { eventService } from "@/lib/services";
import type { CalEvent } from "@/types";

const LABEL_COLOR: Record<string, string> = { assignment: "#2563eb", exam: "#dc2626", lecture: "#16a34a" };

function groupByWeekday(events: CalEvent[]) {
  const days: Record<string, CalEvent[]> = {};
  events.forEach(ev => {
    if (!ev.start_time) { (days["Chưa có ngày"] ||= []).push(ev); return; }
    const d = new Date(ev.start_time).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    (days[d] ||= []).push(ev);
  });
  return days;
}

// Confirm dialog
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
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

  if (loading) return <div style={{ padding: 40, color: "#9ca3af", fontSize: 14 }}>Đang tải...</div>;

  const grouped = groupByWeekday(events);
  const toDelete = confirmId ? events.find(e => e.id === confirmId) : null;

  return (
    <div style={{ flex: 1, overflowY: "auto", fontFamily: "system-ui, sans-serif" }}>
      {events.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "#9ca3af" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div>Chưa có sự kiện nào. Upload syllabus để bắt đầu!</div>
        </div>
      ) : Object.entries(grouped).map(([day, items]) => (
        <div key={day}>
          <div style={{ padding: "10px 32px", fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: 1, display: "flex", alignItems: "center", gap: 8 }}>
            {day}
            <span style={{ background: "#f3f4f6", borderRadius: 99, padding: "1px 7px", fontWeight: 600 }}>{items.length}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
                {["", "TASK", "COURSE", "DUE DATE", "PRIORITY", "STATUS", ""].map((h, i) => (
                  <th key={i} style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textAlign: "left", letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(ev => {
                const isOverdue = ev.start_time && new Date(ev.start_time) < new Date() && ev.status !== "completed";
                const isDone = ev.status === "completed";
                return (
                  <tr key={ev.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: isDone ? 0.5 : 1 }}>
                    <td style={{ padding: "13px 16px", width: 40 }}>
                      <div onClick={() => !isDone && markDone(ev.id)}
                        style={{ width: 18, height: 18, border: "2px solid #d1d5db", borderRadius: "50%", cursor: "pointer", background: isDone ? "#16a34a" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isDone && <span style={{ color: "#fff", fontSize: 10 }}>✓</span>}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                        <span>{ev.label === "exam" ? "🎓" : "📄"}</span>
                        <span style={{ textDecoration: isDone ? "line-through" : "none" }}>{ev.title}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", fontSize: 13 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: LABEL_COLOR[ev.label || "lecture"] || "#9ca3af" }} />
                        {ev.course_id ? "Course" : "—"}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {ev.start_time ? (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>{new Date(ev.start_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                          {isOverdue && <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Overdue</div>}
                        </>
                      ) : <span style={{ color: "#9ca3af", fontSize: 13 }}>—</span>}
                    </td>
                    <td style={{ padding: "13px 16px" }}><span style={{ color: "#2563eb" }}>🚩</span></td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: ev.status === "completed" ? "#dcfce7" : "#f3f4f6", color: ev.status === "completed" ? "#16a34a" : "#374151", fontWeight: 500 }}>
                        {ev.status === "completed" ? "DONE" : ev.status === "in-progress" ? "IN PROGRESS" : "TO DO"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <button onClick={() => setConfirmId(ev.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14 }}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {confirmId && toDelete && (
        <ConfirmDialog
          message={`Bạn có chắc muốn xóa task "${toDelete.title}"?`}
          onConfirm={() => deleteEvent(confirmId)}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
