"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { eventService } from "@/lib/services";
import api from "@/lib/api";

const TABS = [
  { id: "courses", label: "Courses", href: "/courses", icon: "🏠" },
  { id: "tasks", label: "Tasks", href: "/tasks", icon: "☰" },
  { id: "calendar", label: "Calendar", href: "/calendar", icon: "📅" },
  { id: "ai", label: "AI Assistant", href: "/ai", icon: "🤖" },
];

function TopNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const initial = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <nav style={{ height: 56, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "#fff", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15 }}>
        <span style={{ background: "#2563eb", color: "#fff", borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📘</span>
        Syllabus to Calendar
      </div>

      <div style={{ display: "flex", gap: 2 }}>
        {TABS.map(t => {
          const active = pathname.startsWith(t.href);
          return (
            <Link key={t.id} href={t.href}
              style={{ padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: active ? 600 : 400,
                background: active ? "#f3f4f6" : "transparent", color: active ? "#111" : "#6b7280",
                display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <span style={{ fontSize: 13 }}>{t.icon}</span>{t.label}
            </Link>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#374151", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
          {initial}
        </div>
        <span style={{ color: "#374151" }}>{user?.name || user?.email}</span>
        <button onClick={logout} style={{ marginLeft: 4, fontSize: 12, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
          Đăng xuất
        </button>
      </div>
    </nav>
  );
}

function Sidebar() {
  const [stats, setStats] = useState({ completed: 0, pending: 0, overdue: 0 });
  const [streak, setStreak] = useState({ current: 0, best: 0 });

  const loadStats = useCallback(async () => {
    try {
      const events = await eventService.list();
      const now = new Date();
      const completed = events.filter(e => e.status === "completed").length;
      const overdue = events.filter(e => e.status !== "completed" && e.start_time && new Date(e.start_time) < now).length;
      const pending = events.filter(e => e.status !== "completed" && (!e.start_time || new Date(e.start_time) >= now)).length;
      setStats({ completed, pending, overdue });
    } catch { /* ignore */ }
    try {
      const res = await api.get("/auth/stats");
      setStreak({ current: res.data.current_streak, best: res.data.best_streak });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const total = stats.completed + stats.pending + stats.overdue;
  const pct = total ? Math.round((stats.completed / total) * 100) : 0;
  const r = 26, circ = 2 * Math.PI * r;

  return (
    <aside style={{ width: 256, borderRight: "1px solid #e5e7eb", padding: "20px 16px", background: "#fff", flexShrink: 0, overflowY: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>Summary</span>
        <span style={{ color: "#9ca3af", cursor: "pointer", fontSize: 13 }} onClick={loadStats} title="Refresh">↻</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <svg width={64} height={64} viewBox="0 0 64 64">
          <circle cx={32} cy={32} r={r} fill="none" stroke="#f3f4f6" strokeWidth={6} />
          <circle cx={32} cy={32} r={r} fill="none" stroke={pct > 0 ? "#16a34a" : "#e5e7eb"} strokeWidth={6}
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} strokeLinecap="round" transform="rotate(-90 32 32)" />
          <text x={32} y={35} textAnchor="middle" fontSize={11} fontWeight={700} fill="#111">{pct}%</text>
          <text x={32} y={47} textAnchor="middle" fontSize={8} fill="#9ca3af">Done</text>
        </svg>
        <div>
          {([["Completed", "#16a34a", stats.completed], ["Pending", "#f59e0b", stats.pending], ["Overdue", "#dc2626", stats.overdue]] as const).map(([l, c, v]) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
              <span style={{ color: "#6b7280", flex: 1, fontSize: 13 }}>{l}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 8 }}>
          <span>🔥</span><span style={{ color: "#374151" }}>On-time completion streak</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
          <span><b style={{ fontSize: 20 }}>{streak.current}</b> <span style={{ color: "#9ca3af" }}>days</span></span>
          <span style={{ color: "#d97706", fontWeight: 600 }}>🏆 Best: {streak.best}</span>
        </div>
      </div>

      {total === 0 && (
        <div style={{ marginTop: 20, padding: "12px", background: "#f9fafb", borderRadius: 10, fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
          Chưa có dữ liệu.<br />Upload syllabus để bắt đầu!
        </div>
      )}
    </aside>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "#9ca3af" }}>Đang tải...</div>
    </div>
  );

  if (!user) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      <TopNav />
      <div style={{ display: "flex", height: "calc(100vh - 56px)" }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: "auto" }}>{children}</main>
      </div>
    </div>
  );
}
