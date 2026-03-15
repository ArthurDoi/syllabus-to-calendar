export interface Course {
  id: string;
  name: string;
  code: string;
  term: string;
  instructor: string;
  startDate: Date;
  endDate: Date;
  weeks: Week[];
  color: string; // For calendar visualization
  createdAt: Date;
  updatedAt: Date;
}

export interface Week {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  assignments: Assignment[];
  exams: Exam[];
  milestones: Milestone[];
  classSchedule?: ClassSchedule;
  notes?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  courseId: string;
  weekNumber: number;
  status: "pending" | "in-progress" | "completed";
  priority: "low" | "medium" | "high";
  estimatedHours?: number;
}

export interface Exam {
  id: string;
  title: string;
  date: Date;
  time?: string;
  location?: string;
  courseId: string;
  weekNumber: number;
}

export interface Milestone {
  id: string;
  title: string;
  date: Date;
  description?: string;
  courseId: string;
  weekNumber: number;
}

export interface ClassSchedule {
  id: string;
  courseId: string;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  location?: string;
}

