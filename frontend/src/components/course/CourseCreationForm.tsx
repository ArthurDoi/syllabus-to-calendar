"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2, Plus, X } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { ParsedSyllabus } from "@/types/syllabus";
import { IconPicker } from "./IconPicker";
import { COURSE_COLORS } from "@/constants/config";

interface CourseCreationFormProps {
  parsedData?: ParsedSyllabus | null;
  uploadId?: string;
}

export function CourseCreationForm({ parsedData, uploadId }: CourseCreationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Course info - pre-fill from parsed data
  const [courseName, setCourseName] = useState(parsedData?.courseName || "");
  const [instructor, setInstructor] = useState(parsedData?.instructor || "");
  const [startDate, setStartDate] = useState(
    parsedData?.startDate ? formatDate(new Date(parsedData.startDate)) : ""
  );
  const [endDate, setEndDate] = useState(
    parsedData?.endDate ? formatDate(new Date(parsedData.endDate)) : ""
  );
  const [selectedIcon, setSelectedIcon] = useState("Calendar");

  // Assignments - pre-fill from parsed data
  const [assignments, setAssignments] = useState(
    parsedData?.assignments?.map((a) => ({
      title: a.title || "",
      dueDate: a.dueDate
        ? formatDateTime(new Date(a.dueDate))
        : "",
      description: a.description || "",
    })) || []
  );

  // Exams - pre-fill from parsed data
  const [exams, setExams] = useState(
    parsedData?.exams?.map((e) => ({
      title: e.title || "",
      date: e.date ? formatDate(new Date(e.date)) : "",
      time: e.time || "",
      location: e.location || "",
    })) || []
  );

  // Class schedule - pre-fill from parsed data
  const [classSchedules, setClassSchedules] = useState(
    parsedData?.classSchedule || []
  );

  const addAssignment = () => {
    setAssignments([...assignments, { title: "", dueDate: "", description: "" }]);
  };

  const removeAssignment = (index: number) => {
    setAssignments(assignments.filter((_, i) => i !== index));
  };

  const updateAssignment = (index: number, field: string, value: string) => {
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

  const updateExam = (index: number, field: string, value: string) => {
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
    field: string,
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

    if (!courseName.trim()) {
      setError("Course name is required");
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
          startDate: startDate || null,
          endDate: endDate || null,
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

      // Update upload status if uploadId provided
      if (uploadId) {
        try {
          await fetch("/api/parse-syllabus", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uploadId,
              courseId: data.course.id,
            }),
          });
        } catch (err) {
          // Ignore errors updating upload status
        }
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/calendar?courseId=${data.course.id}`);
      }, 800);
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

  if (success) {
    return (
      <Alert className="max-w-2xl mx-auto">
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          Course created successfully! Redirecting...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {parsedData && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Data extracted from syllabus. Please review and edit as needed.
          </AlertDescription>
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instructor">Instructor</Label>
            <Input
              id="instructor"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
            Add Assignment
          </Button>
        </div>
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No assignments found. Click "Add Assignment" to add one.
            </p>
          ) : (
            assignments.map((assignment, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium">Assignment {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAssignment(index)}
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
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
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))
          )}
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
            Add Exam
          </Button>
        </div>
        <div className="space-y-4">
          {exams.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No exams found. Click "Add Exam" to add one.
            </p>
          ) : (
            exams.map((exam, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium">Exam {index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeExam(index)}
                    disabled={loading}
                  >
                    ×
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={exam.title}
                      onChange={(e) => updateExam(index, "title", e.target.value)}
                      disabled={loading}
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
                    />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Class Schedule */}
      {classSchedules.length > 0 && (
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
                      ×
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/courses")}
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

