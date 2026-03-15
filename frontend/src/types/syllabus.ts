export interface SyllabusUpload {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  status: "uploading" | "processing" | "completed" | "failed";
  courseId?: string;
}

export interface NormalizedSyllabusEvent {
  type: "assignment" | "exam";
  title: string;
  dueDate: string;
  description?: string;
}

export interface NormalizedSyllabusData {
  courseName: string;
  instructor: string | null;
  startDate: string | null;
  endDate: string | null;
  events: NormalizedSyllabusEvent[];
}

export interface NormalizedSyllabusResult {
  success: boolean;
  data: NormalizedSyllabusData;
  error?: string;
}

export interface ParsedSyllabus {
  courseName?: string;
  instructor?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  assignments?: ParsedAssignment[];
  exams?: ParsedExam[];
  classSchedule?: ParsedClassSchedule[];
  rawText?: string;
  confidence?: number;
}

export interface ParsedAssignment {
  title: string;
  dueDate?: Date | string;
  description?: string;
}

export interface ParsedExam {
  title: string;
  date?: Date | string;
  time?: string;
  location?: string;
}

export interface ParsedClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location?: string;
}

