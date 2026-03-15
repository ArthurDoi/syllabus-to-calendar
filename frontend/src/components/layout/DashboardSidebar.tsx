'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, Flame, Trophy, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

export function DashboardSidebar() {
  const [summaryVisible, setSummaryVisible] = useState(true);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Fetch task statistics and streak
  useEffect(() => {
    let mounted = true;
    
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/tasks/stats');
        if (response.ok && mounted) {
          const data = await response.json();
          setStats(data.stats);
          setStreak(data.streak || 0);
          setBestStreak(data.bestStreak || 0);
        }
      } catch (error) {
        console.error('Error fetching task stats:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Calculate percentages for each category
  // Note: Overdue tasks are a subset of pending/in-progress tasks, so we need to separate them
  const total = stats.total;
  const completedPercent = total > 0 ? (stats.completed / total) * 100 : 0;
  const overduePercent = total > 0 ? (stats.overdue / total) * 100 : 0;
  // Pending (non-overdue) = total pending minus overdue (since overdue tasks are counted in pending)
  const pendingNonOverdue = Math.max(0, stats.pending - stats.overdue);
  const pendingPercent = total > 0 ? (pendingNonOverdue / total) * 100 : 0;
  
  // Calculate stroke dasharray values for the circle (circumference = 2 * π * r = 2 * π * 28 ≈ 175.9)
  const circumference = 2 * Math.PI * 28;
  const completedDash = (completedPercent / 100) * circumference;
  const pendingDash = (pendingPercent / 100) * circumference;
  const overdueDash = (overduePercent / 100) * circumference;

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Summary Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSummaryVisible(!summaryVisible)}
          >
            {summaryVisible ? (
              <EyeOff className="w-4 h-4 text-gray-600" />
            ) : (
              <Eye className="w-4 h-4 text-gray-600" />
            )}
          </Button>
        </div>

        {summaryVisible && (
          <div className="space-y-4">
            {/* Task Status Overview */}
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                  {/* Background circle */}
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                  />
                  {/* Render segments in order: Completed → Pending → Overdue */}
                  {/* Completed segment (green) - starts at top (12 o'clock) */}
                  {completedDash > 0 && (
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="4"
                      strokeDasharray={`${completedDash} ${circumference}`}
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  )}
                  {/* Pending segment (yellow) - continues after completed */}
                  {pendingDash > 0 && (
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="4"
                      strokeDasharray={`${pendingDash} ${circumference}`}
                      strokeDashoffset={-completedDash}
                      strokeLinecap="round"
                    />
                  )}
                  {/* Overdue segment (red) - continues after pending */}
                  {overdueDash > 0 && (
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="4"
                      strokeDasharray={`${overdueDash} ${circumference}`}
                      strokeDashoffset={-(completedDash + pendingDash)}
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                {/* Center text showing completion percentage */}
                {!loading && total > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-xs font-bold text-gray-900 block leading-none">
                        {Math.round(completedPercent)}%
                      </span>
                      <span className="text-[10px] text-gray-500 block leading-none mt-0.5">
                        Done
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-700 flex-1">
                    Completed
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {loading ? '...' : stats.completed}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-700 flex-1">
                    Pending
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {loading ? '...' : stats.pending}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-700 flex-1">
                    Overdue
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {loading ? '...' : stats.overdue}
                  </span>
                </div>
              </div>
            </div>

            {/* Streak Section - Motivational metric, separate from task status */}
            <div className="pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-medium text-gray-700">
                  On-time completion streak
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-orange-600">
                    {streak}
                  </span>
                  <span className="text-xs text-gray-500">days</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 rounded-md">
                  <Trophy className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="text-xs font-semibold text-yellow-700">
                    Best: {bestStreak}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

