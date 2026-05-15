"use client";
import { TasksPageClient } from "@/components/task/TasksPageClient";

export default function TasksPage() {
  return (
    <div className="p-6 h-full w-full flex flex-col">
      {/* ── Header (chuẩn /ai) ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            My Tasks
          </h1>
        </div>
        <p className="text-sm text-gray-500 ml-4">
          Theo dõi deadline, bài tập và lịch thi của bạn
        </p>
      </div>

      {/* ── Task content (filter + sort + list) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <TasksPageClient />
      </div>
    </div>
  );
}