"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, X, AlertCircle } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { IconPicker } from "./IconPicker";
import { COURSE_COLORS } from "@/constants/config";

interface Assignment {
  title: string;
  dueDate: string;
  description: string;
}

interface Exam {
  title: string;
  date: string;
  time: string;
  location: string;
}

interface ClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  location: string;
}

export function ManualEntryForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Course info
  const [courseName, setCourseName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Calendar");

  // Assignments
  const [assignments, setAssignments] = useState<Assignment[]>([
    { title: "", dueDate: "", description: "" },
  ]);

  // Exams
  const [exams, setExams] = useState<Exam[]>([
    { title: "", date: "", time: "", location: "" },
  ]);

  // Class schedule
  const [classSchedules, setClassSchedules] = useState<ClassSchedule[]>([
    { dayOfWeek: 1, startTime: "", endTime: "", location: "" },
  ]);

  const addAssignment = () => {
    setAssignments([...assignments, { title: "", dueDate: "", description: "" }]);
  };

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, field: keyof Assignment, value: string) => {
    const updated = [...assignments];
    updated[index] = { ...updated[index], [field]: value };
    setAssignments(updated);
  };

  const addExam = () => {
    setExams([...exams, { title: "", date: "", time: "", location: "" }]);
  };

  const removeExam = (index: number) => {
    setExams(exams.filter((_, i) => i !== index));
  };

  const updateExam = (index: number, field: keyof Exam, value: string) => {
    const updated = [...exams];
    updated[index] = { ...updated[index], [field]: value };
    setExams(updated);
  };

  const addClassSchedule = () => {
    setClassSchedules([
      ...classSchedules,
      { dayOfWeek: 1, startTime: "", endTime: "", location: "" },
    ]);
  };

  const removeClassSchedule = (index: number) => {
    setClassSchedules(classSchedules.filter((_, i) => i !== index));
  };

  const updateClassSchedule = (
    index: number,
    field: keyof ClassSchedule,
    value: string | number
  ) => {
    const updated = [...classSchedules];
    updated[index] = { ...updated[index], [field]: value };
    setClassSchedules(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!courseName.trim()) {
      setError("Course name is required");
      setLoading(false);
      return;
    }

    if (!startDate || !endDate) {
      setError("Start date and end date are required");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: courseName,
          instructor,
          startDate,
          endDate,
          icon: selectedIcon,
          assignments: assignments.filter((a) => a.title.trim() && a.dueDate),
          exams: exams.filter((e) => e.title.trim() && e.date),
          classSchedule: classSchedules.filter(
            (c) => c.startTime && c.endTime
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create course");
        setLoading(false);
        return;
      }

      // Navigate to course detail page
      router.push(`/courses/${data.course.id}`);
      router.refresh();
    } catch (error) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const dayOptions = [
    { value: 1, label: "Monday" },
    { value: 2, label: "Tuesday" },
    { value: 3, label: "Wednesday" },
    { value: 4, label: "Thursday" },
    { value: 5, label: "Friday" },
    { value: 6, label: "Saturday" },
    { value: 0, label: "Sunday" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Course Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Course Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="courseName">
              Course Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="courseName"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              required
              disabled={loading}
              placeholder="Introduction to Computer Science"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructor">Instructor</Label>
            <Input
              id="instructor"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              disabled={loading}
              placeholder="Dr. Smith"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">
              Start Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">
              End Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
              disabled={loading}
            />
          </div>
        </div>
        <div className="mt-4">
          <Label>Course Icon (Optional)</Label>
          <IconPicker
            selectedIcon={selectedIcon}
            onIconSelect={setSelectedIcon}
            courseColor={COURSE_COLORS[Math.floor(Math.random() * COURSE_COLORS.length)]}
          />
        </div>
      </Card>

      {/* Assignments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assignments</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addAssignment}
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Assignment
          </Button>
        </div>
        <div className="space-y-4">
          {assignments.map((assignment, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium">Assignment {index + 1}</span>
                {assignments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAssignment(index)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={assignment.title}
                    onChange={(e) =>
                      updateAssignment(index, "title", e.target.value)
                    }
                    disabled={loading}
                    placeholder="Assignment 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={assignment.dueDate}
                    onChange={(e) =>
                      updateAssignment(index, "dueDate", e.target.value)
                    }
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={assignment.description}
                    onChange={(e) =>
                      updateAssignment(index, "description", e.target.value)
                    }
                    disabled={loading}
                    placeholder="Complete exercises 1-5"
                    rows={2}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Exams */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Exams</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addExam}
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Exam
          </Button>
        </div>
        <div className="space-y-4">
          {exams.map((exam, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium">Exam {index + 1}</span>
                {exams.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExam(index)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={exam.title}
                    onChange={(e) => updateExam(index, "title", e.target.value)}
                    disabled={loading}
                    placeholder="Midterm Exam"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={exam.date}
                    onChange={(e) => updateExam(index, "date", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={exam.time}
                    onChange={(e) => updateExam(index, "time", e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={exam.location}
                    onChange={(e) =>
                      updateExam(index, "location", e.target.value)
                    }
                    disabled={loading}
                    placeholder="Room 101"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Class Schedule */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Class Schedule</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addClassSchedule}
            disabled={loading}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Schedule
          </Button>
        </div>
        <div className="space-y-4">
          {classSchedules.map((schedule, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-medium">Schedule {index + 1}</span>
                {classSchedules.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeClassSchedule(index)}
                    disabled={loading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={schedule.dayOfWeek}
                    onChange={(e) =>
                      updateClassSchedule(
                        index,
                        "dayOfWeek",
                        parseInt(e.target.value)
                      )
                    }
                    disabled={loading}
                  >
                    {dayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={schedule.location}
                    onChange={(e) =>
                      updateClassSchedule(index, "location", e.target.value)
                    }
                    disabled={loading}
                    placeholder="Room 101"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={schedule.startTime}
                    onChange={(e) =>
                      updateClassSchedule(index, "startTime", e.target.value)
                    }
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={schedule.endTime}
                    onChange={(e) =>
                      updateClassSchedule(index, "endTime", e.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Course...
            </>
          ) : (
            "Create Course"
          )}
        </Button>
      </div>
    </form>
  );
}

