/** Shared event label configuration used across the app */

export interface LabelConfig {
  color: string;
  bg: string;
  label: string;
}

export const LABEL_CONFIG: Record<string, LabelConfig> = {
  assignment: { color: "#1a73e8", bg: "#e8f0fe", label: "Assignment" },
  exam:       { color: "#d93025", bg: "#fce8e6", label: "Exam" },
  lecture:    { color: "#1e8e3e", bg: "#e6f4ea", label: "Lecture" },
  holiday:    { color: "#f29900", bg: "#fef7e0", label: "Holiday" },
};

/** Quick lookup: label key → display color */
export const LABEL_COLOR: Record<string, string> = Object.fromEntries(
  Object.entries(LABEL_CONFIG).map(([k, v]) => [k, v.color])
);

/** Quick lookup: label key → display text */
export const LABEL_TEXT: Record<string, string> = Object.fromEntries(
  Object.entries(LABEL_CONFIG).map(([k, v]) => [k, v.label])
);

/** Canonical display order for event groups */
export const LABEL_ORDER = ["assignment", "exam", "lecture", "holiday"] as const;
