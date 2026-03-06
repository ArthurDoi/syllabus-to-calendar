"use client";
import { useEffect, useState } from "react";
import { eventService, calendarService } from "@/lib/services";
import type { CalEvent, GoogleSyncStatus } from "@/types";

const LABEL_COLOR: Record<string, string> = { assignment: "#2563eb", exam: "#dc2626", lecture: "#16a34a" };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Confirm dialog
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 28, maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>🗓️</div>
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

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const [view, setView] = useState<"Month" | "Week" | "Day">("Month");
  const [syncStatus, setSyncStatus] = useState<GoogleSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [current, setCurrent] = useState(new Date());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    eventService.list().then(setEvents);
    calendarService.status().then(setSyncStatus).catch(() => {});

    // Detect redirect back from Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      setSyncSuccess("Google Calendar đã được kết nối thành công! Bấm Sync để đồng bộ.");
      calendarService.status().then(setSyncStatus).catch(() => {});
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("error")) {
      setSyncError(`Kết nối thất bại: ${params.get("error")}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const eventsForDay = (day: number) =>
    events.filter(ev => {
      if (!ev.start_time) return false;
      const d = new Date(ev.start_time);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const handleSync = async () => {
    setSyncError(null); setSyncSuccess(null);

    // If not connected → redirect to Google OAuth with JWT as state
    if (!syncStatus?.connected) {
      const token = localStorage.getItem("access_token");
      const redirectUrl = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/login${token ? `?state=${encodeURIComponent(token)}` : ""}`;
      window.location.href = redirectUrl;
      return;
    }

    setSyncing(true);
    try {
      const result = await calendarService.sync();
      setSyncSuccess(result.message || "Sync thành công!");
      const status = await calendarService.status();
      setSyncStatus(status);
      // Reload events in case new ones were synced
      eventService.list().then(setEvents);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : "Sync thất bại. Vui lòng thử lại.");
      setSyncError(typeof msg === "string" ? msg : "Sync thất bại");
    } finally {
      setSyncing(false);
    }
  };

  const deleteEvent = async (id: string) => {
    await eventService.delete(id);
    setEvents(prev => prev.filter(e => e.id !== id));
    if (selected?.id === id) setSelected(null);
    setConfirmDeleteId(null);
  };

  const today = new Date();
  const toDeleteEvent = confirmDeleteId ? events.find(e => e.id === confirmDeleteId) : null;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>
      {/* Sync notifications */}
      {syncError && (
        <div style={{ margin: "8px 24px 0", padding: "10px 16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#dc2626", display: "flex", justifyContent: "space-between" }}>
          <span>❌ {syncError}</span>
          <button onClick={() => setSyncError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>✕</button>
        </div>
      )}
      {syncSuccess && (
        <div style={{ margin: "8px 24px 0", padding: "10px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, fontSize: 13, color: "#16a34a", display: "flex", justifyContent: "space-between" }}>
          <span>✅ {syncSuccess}</span>
          <button onClick={() => setSyncSuccess(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#16a34a" }}>✕</button>
        </div>
      )}

      <div style={{ flex: 1, display: "flex" }}>
        <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
          {/* Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setCurrent(new Date(year, month - 1))} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>‹</button>
              <button onClick={() => setCurrent(new Date())} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Today</button>
              <button onClick={() => setCurrent(new Date(year, month + 1))} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>›</button>
              <span style={{ fontSize: 18, fontWeight: 700, marginLeft: 8 }}>{MONTHS[month]} {year}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Google Calendar Connect/Sync button */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                <button onClick={handleSync} disabled={syncing}
                  style={{ padding: "7px 16px", background: syncStatus?.connected ? "#2563eb" : "#374151", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: syncing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  {syncing ? "⟳ Đang sync..." : syncStatus?.connected ? "🔄 Sync Google Calendar" : "🔗 Kết nối Google Calendar"}
                </button>
                {syncStatus?.connected && syncStatus.last_synced_at && (
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>
                    Sync gần nhất: {new Date(syncStatus.last_synced_at).toLocaleString("vi-VN")}
                  </span>
                )}
              </div>

              <div style={{ display: "flex" }}>
                {(["Month", "Week", "Day"] as const).map((v, i) => (
                  <button key={v} onClick={() => setView(v)}
                    style={{ padding: "6px 14px", border: "1px solid #e5e7eb", background: view === v ? "#f3f4f6" : "#fff", fontSize: 13,
                      fontWeight: view === v ? 600 : 400, cursor: "pointer",
                      borderRadius: i === 0 ? "8px 0 0 8px" : i === 2 ? "0 8px 8px 0" : 0, marginLeft: i > 0 ? -1 : 0 }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar grid */}
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
              {DAYS.map(d => <div key={d} style={{ padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#6b7280" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
              {cells.map((day, i) => {
                const dayEvents = day ? eventsForDay(day) : [];
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                return (
                  <div key={i}
                    style={{ minHeight: 90, padding: "8px", borderRight: (i + 1) % 7 !== 0 ? "1px solid #e5e7eb" : "none",
                      borderBottom: i < 35 ? "1px solid #e5e7eb" : "none", background: isToday ? "#fefce8" : "#fff" }}>
                    {day && (
                      <>
                        <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "#2563eb" : "#374151", marginBottom: 4 }}>{day}</div>
                        {dayEvents.slice(0, 3).map(ev => (
                          <div key={ev.id} onClick={() => setSelected(ev)}
                            style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, marginBottom: 2, cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 4,
                              color: LABEL_COLOR[ev.label || "lecture"] || "#374151",
                              background: (LABEL_COLOR[ev.label || "lecture"] || "#374151") + "18" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: LABEL_COLOR[ev.label || "lecture"] || "#374151", flexShrink: 0 }} />
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && <div style={{ fontSize: 10, color: "#9ca3af" }}>+{dayEvents.length - 3} more</div>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Event detail panel */}
        {selected && (
          <div style={{ width: 240, borderLeft: "1px solid #e5e7eb", padding: "20px 16px", background: "#fff", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Chi tiết</span>
              <span onClick={() => setSelected(null)} style={{ cursor: "pointer", color: "#9ca3af" }}>✕</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: LABEL_COLOR[selected.label || "lecture"] || "#374151" }} />
              <span style={{ fontWeight: 700, fontSize: 15 }}>{selected.title}</span>
            </div>
            {selected.description && <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{selected.description}</div>}
            {selected.start_time && (
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
                📅 {new Date(selected.start_time).toLocaleString("vi-VN")}
              </div>
            )}
            {selected.end_time && (
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>
                🔚 {new Date(selected.end_time).toLocaleString("vi-VN")}
              </div>
            )}
            {selected.label && (
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, background: LABEL_COLOR[selected.label] || "#374151", color: "#fff", fontWeight: 600, display: "inline-block", marginBottom: 12 }}>
                {selected.label}
              </span>
            )}
            {selected.status && (
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
                Trạng thái: <b>{selected.status === "completed" ? "Hoàn thành" : selected.status === "in-progress" ? "Đang làm" : "Chờ"}</b>
              </div>
            )}
            <div style={{ marginTop: 8, borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
              <button onClick={() => setConfirmDeleteId(selected.id)}
                style={{ width: "100%", padding: "8px", fontSize: 13, border: "1px solid #fecaca", borderRadius: 8, cursor: "pointer", background: "#fef2f2", color: "#dc2626" }}>
                🗑 Xóa sự kiện
              </button>
            </div>
          </div>
        )}
      </div>

      {confirmDeleteId && toDeleteEvent && (
        <ConfirmDialog
          message={`Bạn có chắc muốn xóa sự kiện "${toDeleteEvent.title}"?`}
          onConfirm={() => deleteEvent(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
