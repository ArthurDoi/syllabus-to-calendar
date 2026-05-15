// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface LoginRequest {
  username: string; // OAuth2PasswordRequestForm dùng username
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

// ── Course ────────────────────────────────────────────────────────────────────
export interface Course {
  id: string;
  user_id: string;
  name: string;
  code?: string;
  term?: string;
  instructor?: string;
  start_date?: string;
  end_date?: string;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
}

export interface CourseCreate {
  name: string;
  code?: string;
  term?: string;
  instructor?: string;
  start_date?: string;
  end_date?: string;
  color?: string;
  icon?: string;
}

// ── Event ─────────────────────────────────────────────────────────────────────
export type EventLabel = string;

export type EventStatus = "pending" | "in-progress" | "completed";

export interface CalEvent {
  id: string;
  user_id: string;
  course_id?: string;
  title: string;
  label?: EventLabel;
  description?: string;
  start_time?: string;
  end_time?: string;
  status?: EventStatus;
  week_number?: number;
  metadata_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EventCreate {
  title: string;
  label?: EventLabel;
  description?: string;
  start_time?: string;
  end_time?: string;
  course_id?: string;
  status?: EventStatus;
  week_number?: number;
}

export interface EventUpdate extends Partial<EventCreate> {}

// ── Syllabus ──────────────────────────────────────────────────────────────────
export type UploadStatus = "uploading" | "uploaded" | "processing" | "done" | "error";

export interface SyllabusUpload {
  id: string;
  file_name: string;
  original_name: string;
  file_type?: string;
  file_size?: number;
  status: UploadStatus;
  parsed_data?: {
    course_info?: CourseCreate;
    events?: EventCreate[];
  };
  error_message?: string;
  course_id?: string;
  created_at: string;
}

// ── Calendar ──────────────────────────────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  event_type?: string;
  google_event_id?: string;
  event_id?: string;
}

export interface GoogleSyncStatus {
  connected: boolean;
  calendar_id?: string;
  last_synced_at?: string;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
export interface UserStats {
  current_streak: number;
  best_streak: number;
  last_streak_date?: string;
}

// ── Task (shared UI type — mapped từ CalEvent + Course) ───────────────────────
export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;                                              // từ start_time
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  type: "assignment" | "exam" | "milestone";                    // lecture/holiday → milestone
  course_id: string;
  course_name: string;
  course_color: string;
  course_icon: string;
  location?: string;
  time?: string;
  estimated_hours?: number;
}

/** Map CalEvent + Course → Task UI model */
export function mapEventToTask(ev: CalEvent, courses: Course[]): Task {
  const course = courses.find((c) => c.id === ev.course_id);
  // Map any label → Task.type (only 3 valid task types)
  const labelToType = (label?: string): Task["type"] => {
    if (label === "assignment") return "assignment";
    if (label === "exam") return "exam";
    return "milestone"; // lecture, holiday, travel, meeting, custom → milestone
  };
  return {
    id: ev.id,
    title: ev.title,
    description: ev.description || null,
    due_date: ev.start_time || new Date().toISOString(),
    status: (ev.status as Task["status"]) || "pending",
    priority: "medium",
    type: labelToType(ev.label),
    course_id: ev.course_id || "",
    course_name: course?.name ?? "Unknown Course",
    course_color: course?.color ?? "#9ca3af",
    course_icon: course?.icon ?? "",
  };
}

