"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Calendar, Home, ListTodo, LogOut, ChevronDown, Bot, Eye, EyeOff, Flame, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { eventService } from "@/lib/services";
import api from "@/lib/api";

const navItems = [
  { href: "/courses", label: "Courses", icon: Home },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/ai", label: "AI Assistant", icon: Bot },
];

function TopNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const displayName = user?.name?.trim() || (user?.email ? user.email.split("@")[0] : "Student");
  const displayEmail = user?.email || "Signed in";
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join("") || "U";

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-6">
      {/* Left: Logo and App Name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">Syllabus to Calendar</span>
        </div>
      </div>

      {/* Center: Navigation Links */}
      <div className="flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "h-9 px-4 rounded-md",
                  isActive ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Right: Profile */}
      <div className="flex items-center">
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className={cn(
              "flex items-center gap-3 rounded-2xl px-3 py-2 border border-gray-200 bg-white shadow-sm",
              "hover:shadow-md transition-all min-w-[180px] focus:outline-none focus:ring-2 focus:ring-purple-400"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold flex items-center justify-center border border-gray-200">
              {initials}
            </div>
            <div className="text-left">
              <div className="text-[13px] font-semibold text-gray-900 truncate max-w-[120px]">
                {displayName}
              </div>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-500 transition-transform", profileMenuOpen && "rotate-180")} />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl py-3 z-50">
              <div className="px-4 pb-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{displayEmail}</p>
              </div>
              <div className="py-2">
                <button
                  onClick={() => { setProfileMenuOpen(false); logout(); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors",
                    "text-left"
                  )}
                >
                  <LogOut className="w-4 h-4 text-purple-500" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, completed: 0, overdue: 0 });
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const events = await eventService.list();
      const now = new Date();
      const total = events.length;
      const completed = events.filter(e => e.status === "completed").length;
      const overdue = events.filter(e => e.status !== "completed" && e.start_time && new Date(e.start_time) < now).length;
      const pending = events.filter(e => e.status !== "completed" && (!e.start_time || new Date(e.start_time) >= now)).length;
      setStats({ total, completed, pending, overdue });
    } catch { /* ignore */ }
    try {
      const res = await api.get("/auth/stats");
      setStreak({ current: res.data.current_streak, best: res.data.best_streak });
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (mounted) loadStats();
    const interval = setInterval(() => mounted && loadStats(), 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [loadStats]);

  const total = stats.total;
  const completedPercent = total > 0 ? (stats.completed / total) * 100 : 0;
  const overduePercent = total > 0 ? (stats.overdue / total) * 100 : 0;
  const pendingNonOverdue = Math.max(0, stats.pending - stats.overdue);
  const pendingPercent = total > 0 ? (pendingNonOverdue / total) * 100 : 0;

  const circumference = 2 * Math.PI * 28;
  const completedDash = (completedPercent / 100) * circumference;
  const pendingDash = (pendingPercent / 100) * circumference;
  const overdueDash = (overduePercent / 100) * circumference;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSummaryVisible(!summaryVisible)}>
            {summaryVisible ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
          </Button>
        </div>

        {summaryVisible && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                  {completedDash > 0 && (
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray={`${completedDash} ${circumference}`} strokeDashoffset="0" strokeLinecap="round" />
                  )}
                  {pendingDash > 0 && (
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#eab308" strokeWidth="4" strokeDasharray={`${pendingDash} ${circumference}`} strokeDashoffset={-completedDash} strokeLinecap="round" />
                  )}
                  {overdueDash > 0 && (
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray={`${overdueDash} ${circumference}`} strokeDashoffset={-(completedDash + pendingDash)} strokeLinecap="round" />
                  )}
                </svg>
                {!loading && total > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-xs font-bold text-gray-900 block leading-none">{Math.round(completedPercent)}%</span>
                      <span className="text-[10px] text-gray-500 block leading-none mt-0.5">Done</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-700 flex-1">Completed</span>
                  <span className="text-sm font-semibold text-gray-900">{loading ? '...' : stats.completed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-700 flex-1">Pending</span>
                  <span className="text-sm font-semibold text-gray-900">{loading ? '...' : stats.pending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-700 flex-1">Overdue</span>
                  <span className="text-sm font-semibold text-gray-900">{loading ? '...' : stats.overdue}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-gray-700">On-time completion streak</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-orange-600">{streak.current}</span>
                  <span className="text-xs text-gray-500">days</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 rounded-md">
                  <Trophy className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="text-xs font-semibold text-yellow-700">Best: {streak.best}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  if (loading || !user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 14, color: "#9ca3af" }}>Đang tải...</div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <TopNav />
      <div className="flex w-full pt-16">
        {!pathname.startsWith('/calendar') && <Sidebar />}
        <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">
          <main className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}
