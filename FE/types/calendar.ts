import { Assignment, Exam, Milestone } from "./course";

export type CalendarView = "month" | "week" | "agenda";

export interface CalendarEvent {
  id: string;
  title: string;
  type: "assignment" | "exam" | "milestone" | "class";
  startDate: Date;
  endDate?: Date;
  courseId: string;
  courseName: string;
  courseColor: string;
  data: Assignment | Exam | Milestone | null;
}

export interface CalendarFilter {
  courses: string[]; // Course IDs to show
  types: ("assignment" | "exam" | "milestone" | "class")[];
  status?: ("pending" | "in-progress" | "completed")[];
  priority?: ("low" | "medium" | "high")[];
}

