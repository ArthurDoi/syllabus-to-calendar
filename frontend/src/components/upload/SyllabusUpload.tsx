"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFileSize } from "@/lib/file-utils";
import { FileDropzone } from "./FileDropzone";
import { PDFPreview } from "./PDFPreview";
import { ImagePreview } from "./ImagePreview";

interface UploadStatus {
  status: "idle" | "uploading" | "processing" | "success" | "error";
  progress: number;
  message?: string;
  fileId?: string;
}

interface FileProcessResult {
  fileName: string;
  status: "success" | "error";
  uploadId?: string;
  message?: string;
  data?: any;
  storedFileName?: string;
}

interface ParsedCourseData {
  courseName?: string;
  instructor?: string;
  startDate?: string;
  endDate?: string;
  assignments?: Array<{
    title?: string;
    dueDate?: string;
    dueDateDate?: string;
    dueDateTime?: string;
    description?: string;
  }>;
  exams?: Array<{
    title?: string;
    date?: string;
    time?: string;
    location?: string;
  }>;
  classSchedule?: Array<{
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    location?: string;
  }>;
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type SectionKey = "assignments" | "exams" | "classSchedule";

const formatDateValue = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const formatTimeValue = (value?: string) => (!value ? "-" : value);

export function SyllabusUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: "idle",
    progress: 0,
  });
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [processResults, setProcessResults] = useState<FileProcessResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<FileProcessResult | null>(
    null
  );
  const [showUseDialog, setShowUseDialog] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [editableCourse, setEditableCourse] = useState<ParsedCourseData | null>(null);
  const [createStatus, setCreateStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState<Record<SectionKey, boolean>>({
    assignments: true,
    exams: true,
    classSchedule: true,
  });
  const hasActiveProcess =
    uploadStatus.status === "uploading" ||
    uploadStatus.status === "processing";
  const totalSelectedBytes = files.reduce((sum, file) => sum + file.size, 0);
  const formattedTotalSize = totalSelectedBytes
    ? formatFileSize(totalSelectedBytes)
    : "";
  const selectedCourseData = useMemo(() => selectedResult?.data, [selectedResult]);

  useEffect(() => {
    if (selectedResult?.status === "success" && selectedResult.data) {
      const cloned = structuredClone(selectedResult.data) as ParsedCourseData;
      if (Array.isArray(cloned.assignments)) {
        cloned.assignments = cloned.assignments.map((assignment) => {
          if (!assignment) return assignment;
          const date = assignment.dueDate ? new Date(assignment.dueDate) : null;
          return {
            ...assignment,
            dueDateDate: date ? date.toISOString().slice(0, 10) : "",
            dueDateTime: date
              ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
              : "",
          };
        });
      }
      setEditableCourse(cloned);
      setCreateStatus(null);
    } else {
      setEditableCourse(null);
      setCreateStatus(null);
    }
  }, [selectedResult]);

  const handleCourseFieldChange = (field: keyof ParsedCourseData, value: string) => {
    setEditableCourse((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleDialogToggle = (open: boolean) => {
    setShowUseDialog(open);
    if (!open) {
      setSelectedResult(null);
      setCreateStatus(null);
      setShowDebug(false);
    }
  };

  const toggleSectionVisibility = (key: SectionKey) => {
    setSectionVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateListItem = (
    listKey: "assignments" | "exams" | "classSchedule",
    index: number,
    field: string,
    value: any
  ) => {
    setEditableCourse((prev) => {
      if (!prev) return prev;
      const list = [...(prev[listKey] || [])];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, [listKey]: list };
    });
  };

  const addListItem = (listKey: "assignments" | "exams" | "classSchedule") => {
    setEditableCourse((prev) => {
      if (!prev) return prev;
      const templates = {
        assignments: { title: "", dueDate: "", description: "" },
        exams: { title: "", date: "", time: "", location: "" },
        classSchedule: { dayOfWeek: 1, startTime: "", endTime: "", location: "" },
      } as const;
      const nextList = [...(prev[listKey] || []), templates[listKey]];
      return { ...prev, [listKey]: nextList };
    });
  };

  const removeListItem = (listKey: "assignments" | "exams" | "classSchedule", index: number) => {
    setEditableCourse((prev) => {
      if (!prev) return prev;
      const list = [...(prev[listKey] || [])];
      list.splice(index, 1);
      return { ...prev, [listKey]: list };
    });
  };

  const handleCreateCourse = async () => {
    if (!editableCourse) return;
    const currentResult = selectedResult;
    if (!editableCourse.courseName?.trim()) {
      setCreateStatus({ type: "error", message: "Course name is required" });
      return;
    }

    setCreatingCourse(true);
    setCreateStatus(null);
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editableCourse.courseName?.trim() || "Untitled Course",
          instructor: editableCourse.instructor || "",
          startDate: editableCourse.startDate,
          endDate: editableCourse.endDate,
          assignments: (editableCourse.assignments || [])
            .map((assignment) => {
              const { dueDateDate, dueDateTime } = assignment;
              let iso = assignment.dueDate;
              if (dueDateDate) {
                iso = new Date(`${dueDateDate}T${dueDateTime || "00:00"}:00`).toISOString();
              }
              return {
                ...assignment,
                dueDate: iso,
              };
            })
            .filter((assignment) => assignment.title?.trim() && assignment.dueDate),
          exams: (editableCourse.exams || []).filter(
            (exam) => exam.title?.trim() && exam.date
          ),
          classSchedule: (editableCourse.classSchedule || []).filter(
            (session) => session.startTime && session.endTime
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateStatus({ type: "error", message: data.error || "Failed to create course" });
        setCreatingCourse(false);
        return;
      }

      if (currentResult?.uploadId) {
        try {
          await fetch("/api/parse-syllabus", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              uploadId: currentResult.uploadId,
              courseId: data.course?.id,
            }),
          });
        } catch (err) {
          // Ignore patch failures
        }
      }

      setCreateStatus({ type: "success", message: "Course created successfully" });
      setProcessResults((prev) =>
        prev.filter((result) => result.uploadId !== currentResult?.uploadId)
      );
      setSelectedResult(null);
      setEditableCourse(null);
      setShowUseDialog(false);
      setFiles((prevFiles) =>
        prevFiles.filter((file) => file.name !== currentResult?.fileName)
      );
      setPreviewFile((prevPreview) =>
        prevPreview && prevPreview.name === currentResult?.fileName ? null : prevPreview
      );
      setParsedData(null);
      router.refresh();
    } catch (error) {
      setCreateStatus({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    setUploadStatus({ status: "idle", progress: 0 });
    setProcessResults([]);
    setParsedData(null);
    // Auto-select first file for preview
    if (selectedFiles.length > 0 && !previewFile) {
      setPreviewFile(selectedFiles[0]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploadStatus({ status: "uploading", progress: 0 });

    try {
      // Upload files
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      setUploadStatus({
        status: "processing",
        progress: 50,
        fileId: data.fileId,
      });

      const uploadedItems = (data.files || []).map((item: any) => ({
        fileName: item.fileName,
        originalName: item.originalName,
        uploadId: item.id,
      }));

      if (!uploadedItems.length) {
        throw new Error("No files returned from upload response");
      }

      const parallelResults = await Promise.all(
        uploadedItems.map(async (item : any) => {
          try {
            const processResponse = await fetch("/api/parse-syllabus", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fileId: item.fileName,
                uploadId: item.uploadId,
              }),
            });

            const processData = await processResponse.json();

            if (!processResponse.ok || !processData.success) {
              throw new Error(processData.error || "Failed to process syllabus");
            }

            return {
              fileName: item.originalName || item.fileName,
              status: "success" as const,
              uploadId: item.uploadId,
              data: processData.parsedData,
              storedFileName: item.fileName,
            };
          } catch (error) {
            return {
              fileName: item.originalName || item.fileName,
              status: "error" as const,
              uploadId: item.uploadId,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to process syllabus",
              storedFileName: item.fileName,
            };
          }
        })
      );

      setProcessResults(parallelResults);

      const successful = parallelResults.filter(
        (result) => result.status === "success"
      );

      if (successful.length === parallelResults.length) {
        setUploadStatus({
          status: "success",
          progress: 100,
          message: "All syllabi processed successfully!",
        });
        setParsedData(successful[0]?.data);
      } else if (successful.length > 0) {
        setUploadStatus({
          status: "success",
          progress: 100,
          message: `${successful.length}/${parallelResults.length} syllabi processed. Check details below for any failures.`,
        });
      } else {
        setUploadStatus({
          status: "error",
          progress: 0,
          message: "All files failed to process. Please review the details below.",
        });
      }
    } catch (error) {
      setUploadStatus({
        status: "error",
        progress: 0,
        message: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    if (previewFile === files[index]) {
      setPreviewFile(newFiles[0] || null);
    }
  };

  const isPDF = (file: File) => file.type === "application/pdf";
  const isImage = (file: File) => file.type.startsWith("image/");

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card className="p-6 space-y-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Upload syllabi</h2>
          <p className="text-sm text-muted-foreground">
            Drop PDF or image files and let us do the parsing.
          </p>
        </div>

        <FileDropzone
          onFilesSelected={handleFilesSelected}
          acceptedFiles={files}
          showFileList={false}
          className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-2"
        />

        {files.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Selected files ({files.length})
                </p>
                {formattedTotalSize && (
                  <p className="text-xs text-muted-foreground">
                    Total {formattedTotalSize}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleUpload}
                  disabled={
                    uploadStatus.status === "uploading" ||
                    uploadStatus.status === "processing"
                  }
                >
                  {uploadStatus.status === "uploading" ||
                  uploadStatus.status === "processing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {uploadStatus.status === "uploading"
                        ? "Uploading..."
                        : "Processing..."}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload & Process
                    </>
                  )}
                </Button>
              </div>
            </div>

            {hasActiveProcess && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {uploadStatus.status === "uploading"
                      ? "Uploading documents"
                      : "Analyzing content"}
                  </span>
                  <span>{Math.round(uploadStatus.progress)}%</span>
                </div>
                <Progress value={uploadStatus.progress} className="w-full" />
              </div>
            )}

            {uploadStatus.status === "success" && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                  {uploadStatus.message || "Syllabus processed successfully"}
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus.status === "error" && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    {uploadStatus.message ||
                      "An error occurred during processing"}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/courses/new/manual")}
                    className="mt-2"
                  >
                    Enter Course Manually
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => setPreviewFile(file)}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(index);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {previewFile && (
        <div>
          {isPDF(previewFile) ? (
            <PDFPreview
              file={previewFile}
              onRemove={() => {
                const index = files.indexOf(previewFile);
                handleRemoveFile(index);
              }}
            />
          ) : isImage(previewFile) ? (
            <ImagePreview
              file={previewFile}
              onRemove={() => {
                const index = files.indexOf(previewFile);
                handleRemoveFile(index);
              }}
            />
          ) : null}
        </div>
      )}

      {processResults.length > 0 && (
        <Card className="p-5">
          <p className="mb-4 text-sm font-medium text-muted-foreground">
            Processing Results
          </p>
          <div className="space-y-3">
            {processResults.map((result, index) => (
              <button
                key={`${result.fileName}-${index}`}
                type="button"
                className={`flex w-full flex-col gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:border-primary/60 sm:flex-row sm:items-center sm:justify-between ${
                  result.status === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                }`}
                onClick={() => {
                  setSelectedResult(result);
                  setShowDebug(false);
                  setShowUseDialog(true);
                }}
              >
                <div className="flex items-start gap-3">
                  {result.status === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" />
                  )}
                  <div>
                    <p className="font-semibold">{result.fileName}</p>
                    <p
                      className={`text-sm ${
                        result.status === "success"
                          ? "text-emerald-700"
                          : "text-rose-700"
                      }`}
                    >
                      {result.status === "success"
                        ? "Processed successfully"
                        : result.message || "Processing failed"}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  Tap to view details
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={showUseDialog} onOpenChange={handleDialogToggle}>
        <DialogContent className="max-h-[95vh] w-full max-w-7xl overflow-hidden flex flex-col h-[90vh]">
          <DialogHeader>
            <DialogTitle>Review and Correct Syllabus</DialogTitle>
            <DialogDescription>
              Compare the parsed data with your original document and make corrections.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Left Column: Document Preview */}
            <div className="hidden lg:flex flex-col border rounded-lg overflow-hidden bg-slate-100">
              {(() => {
                const file = files.find(
                  (f) => f.name === selectedResult?.fileName
                );
                
                if (!file) {
                  return (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <p>Preview not available (File may have been removed)</p>
                    </div>
                  );
                }

                if (isPDF(file)) {
                  return <PDFPreview file={file} className="h-full border-0 shadow-none" />;
                }
                
                if (isImage(file)) {
                  return <ImagePreview file={file} className="h-full border-0 shadow-none" />;
                }

                return (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <p>Preview not supported for this file type</p>
                  </div>
                );
              })()}
            </div>

            {/* Right Column: Edit Form */}
            <div className="overflow-y-auto pr-2">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">{selectedResult?.fileName}</p>
                  <p className="text-xs uppercase text-muted-foreground">
                    Status: {selectedResult?.status}
                  </p>
                </div>
                {selectedResult?.status === "error" && selectedResult?.message && (
                  <p className="text-destructive">{selectedResult.message}</p>
                )}
                {selectedResult?.status === "success" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">Details</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDebug((prev) => !prev)}
                      >
                        {showDebug ? "Hide debug" : "Show debug"}
                      </Button>
                    </div>

                    {showDebug ? (
                      <div className="rounded border bg-muted/40 p-3">
                        <p className="mb-1 font-semibold">Debug payload</p>
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">
                          {JSON.stringify(selectedCourseData, null, 2)}
                        </pre>
                      </div>
                    ) : editableCourse ? (
                      <div className="space-y-4 text-xs">
                        <div className="rounded border bg-muted/40 p-3">
                          <p className="font-semibold text-sm">Course overview</p>
                          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                            <div>
                              <dt className="text-muted-foreground">Name</dt>
                              <dd className="font-medium text-slate-900">
                                <Input
                                  value={editableCourse.courseName || ""}
                                  onChange={(e) => handleCourseFieldChange("courseName", e.target.value)}
                                />
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Instructor</dt>
                              <dd className="font-medium text-slate-900">
                                <Input
                                  value={editableCourse.instructor || ""}
                                  onChange={(e) => handleCourseFieldChange("instructor", e.target.value)}
                                />
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Start date</dt>
                              <dd className="font-medium text-slate-900">
                                <Input
                                  type="date"
                                  value={editableCourse.startDate?.slice(0, 10) || ""}
                                  onChange={(e) =>
                                    handleCourseFieldChange("startDate", e.target.value)
                                  }
                                />
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">End date</dt>
                              <dd className="font-medium text-slate-900">
                                <Input
                                  type="date"
                                  value={editableCourse.endDate?.slice(0, 10) || ""}
                                  onChange={(e) =>
                                    handleCourseFieldChange("endDate", e.target.value)
                                  }
                                />
                              </dd>
                            </div>
                          </dl>
                        </div>

                        {Array.isArray(editableCourse.assignments) && (
                          <div className="rounded border bg-muted/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-sm">Assignments</p>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addListItem("assignments")}
                                >
                                  Add assignment
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 transition ${sectionVisibility.assignments ? "rotate-180" : ""}`}
                                  aria-label={
                                    sectionVisibility.assignments ? "Collapse assignments" : "Expand assignments"
                                  }
                                  aria-expanded={sectionVisibility.assignments}
                                  onClick={() => toggleSectionVisibility("assignments")}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {sectionVisibility.assignments && (
                              <>
                                {editableCourse.assignments.length > 0 ? (
                                  <div className="mt-2 space-y-3">
                                    {editableCourse.assignments.map((assignment, idx) => (
                                      <div key={`assignment-${idx}`} className="space-y-2 rounded bg-white/60 p-3">
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-semibold">Assignment {idx + 1}</p>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeListItem("assignments", idx)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        <Input
                                          placeholder="Title"
                                          value={assignment.title || ""}
                                          onChange={(e) => updateListItem("assignments", idx, "title", e.target.value)}
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                          <Input
                                            type="date"
                                            value={assignment.dueDateDate || ""}
                                            onChange={(e) =>
                                              updateListItem("assignments", idx, "dueDateDate", e.target.value)
                                            }
                                          />
                                          <Input
                                            type="time"
                                            value={assignment.dueDateTime || ""}
                                            onChange={(e) =>
                                              updateListItem("assignments", idx, "dueDateTime", e.target.value)
                                            }
                                          />
                                        </div>
                                        <Textarea
                                          placeholder="Description"
                                          value={assignment.description || ""}
                                          onChange={(e) => updateListItem("assignments", idx, "description", e.target.value)}
                                          rows={2}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground">No assignments detected.</p>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {Array.isArray(editableCourse.exams) && (
                          <div className="rounded border bg-muted/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-sm">Exams</p>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addListItem("exams")}
                                >
                                  Add exam
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 transition ${sectionVisibility.exams ? "rotate-180" : ""}`}
                                  aria-label={sectionVisibility.exams ? "Collapse exams" : "Expand exams"}
                                  aria-expanded={sectionVisibility.exams}
                                  onClick={() => toggleSectionVisibility("exams")}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {sectionVisibility.exams && (
                              <>
                                {editableCourse.exams.length > 0 ? (
                                  <div className="mt-2 space-y-3">
                                    {editableCourse.exams.map((exam, idx) => (
                                      <div key={`exam-${idx}`} className="space-y-2 rounded bg-white/60 p-3">
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-semibold">Exam {idx + 1}</p>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeListItem("exams", idx)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        <Input
                                          placeholder="Title"
                                          value={exam.title || ""}
                                          onChange={(e) => updateListItem("exams", idx, "title", e.target.value)}
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                          <Input
                                            type="date"
                                            value={exam.date || ""}
                                            onChange={(e) => updateListItem("exams", idx, "date", e.target.value)}
                                          />
                                          <Input
                                            type="time"
                                            value={exam.time || ""}
                                            onChange={(e) => updateListItem("exams", idx, "time", e.target.value)}
                                          />
                                        </div>
                                        <Input
                                          placeholder="Location"
                                          value={exam.location || ""}
                                          onChange={(e) => updateListItem("exams", idx, "location", e.target.value)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground">No exams detected.</p>
                                )}
                              </>
                            )}
                          </div>
                        )}

                        {Array.isArray(editableCourse.classSchedule) && (
                          <div className="rounded border bg-muted/40 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-semibold text-sm">Class schedule</p>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addListItem("classSchedule")}
                                >
                                  Add session
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className={`h-8 w-8 transition ${sectionVisibility.classSchedule ? "rotate-180" : ""}`}
                                  aria-label={
                                    sectionVisibility.classSchedule ? "Collapse class schedule" : "Expand class schedule"
                                  }
                                  aria-expanded={sectionVisibility.classSchedule}
                                  onClick={() => toggleSectionVisibility("classSchedule")}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {sectionVisibility.classSchedule && (
                              <>
                                {editableCourse.classSchedule.length > 0 ? (
                                  <div className="mt-2 space-y-3">
                                    {editableCourse.classSchedule.map((session, idx) => (
                                      <div key={`session-${idx}`} className="space-y-2 rounded bg-white/60 p-3">
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-semibold">Session {idx + 1}</p>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeListItem("classSchedule", idx)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-[10px] uppercase text-muted-foreground">Day</Label>
                                            <select
                                              className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                                              value={session.dayOfWeek ?? 1}
                                              onChange={(e) =>
                                                updateListItem(
                                                  "classSchedule",
                                                  idx,
                                                  "dayOfWeek",
                                                  parseInt(e.target.value)
                                                )
                                              }
                                            >
                                              {dayNames.map((day, dayIdx) => (
                                                <option key={day} value={dayIdx}>
                                                  {day}
                                                </option>
                                              ))}
                                            </select>
                                          </div>
                                          <div>
                                            <Label className="text-[10px] uppercase text-muted-foreground">Location</Label>
                                            <Input
                                              value={session.location || ""}
                                              onChange={(e) =>
                                                updateListItem("classSchedule", idx, "location", e.target.value)
                                              }
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-[10px] uppercase text-muted-foreground">Start</Label>
                                            <Input
                                              type="time"
                                              value={session.startTime || ""}
                                              onChange={(e) =>
                                                updateListItem("classSchedule", idx, "startTime", e.target.value)
                                              }
                                            />
                                          </div>
                                          <div>
                                            <Label className="text-[10px] uppercase text-muted-foreground">End</Label>
                                            <Input
                                              type="time"
                                              value={session.endTime || ""}
                                              onChange={(e) =>
                                                updateListItem("classSchedule", idx, "endTime", e.target.value)
                                              }
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="mt-2 text-xs text-muted-foreground">No schedule detected.</p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No structured data returned.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="ghost" onClick={() => setShowUseDialog(false)}>
              Close
            </Button>
            {selectedResult?.status === "success" && (
              <Button onClick={handleCreateCourse} disabled={creatingCourse || !editableCourse}>
                {creatingCourse ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create course"
                )}
              </Button>
            )}
          </DialogFooter>
          {createStatus && (
            <p
              className={`text-sm text-center ${
                createStatus.type === "success" ? "text-emerald-600" : "text-destructive"
              }`}
            >
              {createStatus.message}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

