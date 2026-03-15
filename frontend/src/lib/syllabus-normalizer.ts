import {
  NormalizedSyllabusData,
  ParsedAssignment,
  ParsedExam,
  ParsedSyllabus,
} from "@/types/syllabus";

const toISO = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
};

const extractTime = (isoString: string): string => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[1]?.substring(0, 5) || "";
};

export function normalizedToParsedSyllabus(
  data: NormalizedSyllabusData
): ParsedSyllabus {
  const assignments: ParsedAssignment[] = data.events
    .filter((event) => event.type === "assignment")
    .map((event) => ({
      title: event.title,
      dueDate: toISO(event.dueDate),
      description: event.description,
    }));

  const exams: ParsedExam[] = data.events
    .filter((event) => event.type === "exam")
    .map((event) => ({
      title: event.title,
      date: toISO(event.dueDate),
      time: extractTime(event.dueDate),
      location: "",
    }));

  return {
    courseName: data.courseName,
    instructor: data.instructor || undefined,
    startDate: data.startDate ? toISO(data.startDate) : undefined,
    endDate: data.endDate ? toISO(data.endDate) : undefined,
    assignments,
    exams,
    classSchedule: [],
  };
}

