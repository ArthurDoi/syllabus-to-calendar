/** Shared event label configuration used across the app */

export interface LabelConfig {
  color: string;
  bg: string;
  label: string;
}

/** Built-in label definitions */
export const LABEL_CONFIG: Record<string, LabelConfig> = {
  assignment: { color: "#1a73e8", bg: "#e8f0fe", label: "Assignment" },
  exam:       { color: "#d93025", bg: "#fce8e6", label: "Exam" },
  lecture:    { color: "#1e8e3e", bg: "#e6f4ea", label: "Lecture" },
  holiday:    { color: "#f29900", bg: "#fef7e0", label: "Holiday" },
  // ── Extended labels ──────────────────────────────────────────────────────────
  travel:     { color: "#9334e6", bg: "#f3e8fd", label: "Travel" },
  meeting:    { color: "#0288d1", bg: "#e1f5fe", label: "Meeting" },
  sport:      { color: "#2e7d32", bg: "#e8f5e9", label: "Sport" },
  personal:   { color: "#e91e63", bg: "#fce4ec", label: "Personal" },
  seminar:    { color: "#f57c00", bg: "#fff3e0", label: "Seminar" },
  lab:        { color: "#00838f", bg: "#e0f7fa", label: "Lab" },
  project:    { color: "#6d4c41", bg: "#efebe9", label: "Project" },
};

/**
 * Get label config for any label key.
 * Falls back gracefully to a generated color for unknown/custom labels.
 */
export function getLabelConfig(label?: string | null): LabelConfig {
  if (!label) return LABEL_CONFIG.lecture;
  const known = LABEL_CONFIG[label.toLowerCase()];
  if (known) return known;

  // Dynamic fallback: derive a consistent color from the label string
  const hue = [...label].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return {
    color: `hsl(${hue}, 55%, 42%)`,
    bg:    `hsl(${hue}, 70%, 94%)`,
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
}

/** Quick lookup: label key → display color (with fallback) */
export const LABEL_COLOR: Record<string, string> = Object.fromEntries(
  Object.entries(LABEL_CONFIG).map(([k, v]) => [k, v.color])
);

/** Quick lookup: label key → display text (with fallback) */
export const LABEL_TEXT: Record<string, string> = Object.fromEntries(
  Object.entries(LABEL_CONFIG).map(([k, v]) => [k, v.label])
);

/** All known built-in labels in display order */
export const LABEL_ORDER = [
  "assignment", "exam", "lecture", "holiday",
  "travel", "meeting", "sport", "personal", "seminar", "lab", "project",
] as const;
