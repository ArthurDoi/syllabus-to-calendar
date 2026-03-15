export const APP_CONFIG = {
  APP_NAME: "Syllabus to Calendar",
  REMINDER_DAYS_BEFORE: 3,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
  WEEK_START_DAY: 1, // Monday (0 = Sunday, 1 = Monday)
} as const;

export const COURSE_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
] as const;

