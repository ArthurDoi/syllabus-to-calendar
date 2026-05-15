"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, Loader2, CheckCircle2, XCircle, Upload, FileText, ImageIcon, File } from "lucide-react";
import { syllabusService, courseService } from "@/lib/services";
import type { SyllabusUpload, Course } from "@/types";
import ReviewModal from "./ReviewModal";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseModal } from "@/components/course/CourseModal";
import { cn } from "@/lib/utils";

type View = "list" | "upload";

export default function CoursesPage() {

  const [view, setView] = useState<View>("list");
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<SyllabusUpload[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedUpload, setSelectedUpload] = useState<SyllabusUpload | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractingIds, setExtractingIds] = useState<Set<string>>(new Set());
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewUpload, setPreviewUpload] = useState<SyllabusUpload | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollCleanups = useRef<Map<string, () => void>>(new Map());
  const localBlobUrls = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    syllabusService.list().then(setUploads);
    courseService.list().then(setCourses);
    return () => {
      pollCleanups.current.forEach(fn => fn());
      localBlobUrls.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const stageFiles = useCallback((files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files as Iterable<File>);
    if (!arr.length) return;
    setPendingFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      const incoming = arr.filter(f => !existing.has(f.name + f.size));
      return [...prev, ...incoming];
    });
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    setUploadError(null);
    setUploading(true);
    for (const file of files) {
      const blobUrl = URL.createObjectURL(file);
      try {
        const upload = await syllabusService.upload(file);
        localBlobUrls.current.set(upload.id, blobUrl);
        setUploads(prev => [upload, ...prev]);
        setPreviewUpload(upload);
      } catch (err: unknown) {
        URL.revokeObjectURL(blobUrl);
        const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (err instanceof Error ? err.message : `Cannot upload "${file.name}"`);
        setUploadError(typeof msg === "string" ? msg : `Upload failed: ${file.name}`);
      }
    }
    setUploading(false);
    setPendingFiles([]);
  }, []);

  const handleExtract = useCallback(async (upload: SyllabusUpload) => {
    setExtractingIds(prev => new Set(prev).add(upload.id));
    try {
      const updated = await syllabusService.extract(upload.id);
      setUploads(prev => prev.map(u => u.id === updated.id ? updated : u));
      const stop = syllabusService.pollUntilDone(upload.id, (polled) => {
        setUploads(prev => prev.map(u => u.id === polled.id ? polled : u));
        if (polled.status === "done") courseService.list().then(setCourses);
      });
      pollCleanups.current.set(upload.id, stop);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err instanceof Error ? err.message : "Cannot extract");
      setUploadError(typeof msg === "string" ? msg : "Extraction failed");
    } finally {
      setExtractingIds(prev => { const s = new Set(prev); s.delete(upload.id); return s; });
    }
  }, []);

  const handleCourseCreated = useCallback(async (course: Course, uploadId: string) => {
    try { await syllabusService.delete(uploadId); } catch { /* ignore */ }
    setCourses(prev => [course, ...prev]);
    setUploads(prev => prev.filter(u => u.id !== uploadId));
    setSelectedUpload(null);
    setView("list");
  }, []);

  const processing = uploads.filter(u => u.status === "processing" || u.status === "uploading");
  const uploaded = uploads.filter(u => u.status === "uploaded");
  const done = uploads.filter(u => u.status === "done" || u.status === "error");

  if (view === "list") {
    return (
      <div className="p-6 max-w-6xl mx-auto w-full">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Courses
              </h1>
            </div>
          </div>
          <Button
            onClick={() => setView("upload")}
            className="sm:flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all text-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Course
          </Button>
        </div>

        {courses.length === 0 ? (
          <Card className="p-6 sm:p-8 md:p-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-gray-200">
            <div className="text-center">
              <div className="w-16 sm:w-20 h-16 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                <Plus className="w-8 sm:w-10 h-8 sm:h-10 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto">
                Get started by uploading your first course syllabus or creating a course manually.
              </p>
              <Button
                onClick={() => setView("upload")}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Course
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} onEdit={c => setSelectedCourse(c)} onDeleted={id => setCourses(prev => prev.filter(c => c.id !== id))} />
            ))}
          </div>
        )}

        {selectedCourse && (
          <CourseModal
            course={selectedCourse}
            onClose={() => setSelectedCourse(null)}
            onSaved={(updated) => { setCourses(prev => prev.map(c => c.id === updated.id ? updated : c)); setSelectedCourse(null); }}
            onDeleted={(id) => { setCourses(prev => prev.filter(c => c.id !== id)); setSelectedCourse(null); }}
          />
        )}
      </div>
    );
  }

  // ── UPLOAD VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen w-full">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full flex-shrink-0" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Upload Syllabus
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-4">
            Upload file syllabus to AI automatically extract the course schedule.
          </p>
        </div>
        <Button
          onClick={() => { setView("list"); setUploadError(null); setPendingFiles([]); }}
          variant="outline"
          className="flex-shrink-0 text-sm"
        >
          ← Back
        </Button>
      </div>

      {uploadError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-2">
            <span className="truncate">{uploadError}</span>
            <button onClick={() => setUploadError(null)} className="flex-shrink-0 hover:opacity-70">✕</button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── SECTION 1: Drag & Drop Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); stageFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn("border-2 border-dashed rounded-xl p-6 sm:p-10 md:p-14 text-center cursor-pointer transition-all mb-4 sm:mb-5", dragging ? "border-purple-500 bg-purple-50" : "border-gray-300 bg-white shadow-sm")}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
          onChange={e => { stageFiles(e.target.files); e.target.value = ""; }} />
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100">
          <Upload className={cn("w-6 h-6", dragging ? "text-purple-600" : "text-gray-400")} />
        </div>
        <div className="text-sm font-semibold text-gray-900 mb-1">Drag and drop files here</div>
        <div className="text-sm text-gray-500 mb-1">or click to select files</div>
        <div className="text-xs text-gray-400">Supports PDF, JPEG, PNG (max 10MB)</div>
      </div>

      {/* ── SECTION 2: Selected Files + Upload button ── */}
      {pendingFiles.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                Selected files
                <Badge variant="secondary">{pendingFiles.length}</Badge>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Total {(pendingFiles.reduce((s, f) => s + f.size, 0) / 1024).toFixed(2)} KB</div>
            </div>
            <Button onClick={() => handleFiles(pendingFiles)} disabled={uploading} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="w-4 h-4 mr-2" />Upload & Process</>}
            </Button>
          </div>
          <div className="space-y-2">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{f.name}</div>
                    <div className="text-xs text-gray-500">{(f.size / 1024).toFixed(2)} KB</div>
                  </div>
                </div>
                <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-gray-600 p-1"><XCircle className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Uploaded (pending extract) */}
      {uploaded.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="flex items-center gap-2 font-semibold text-sm mb-3">
            Chờ trích xuất
            <Badge variant="outline">{uploaded.length}</Badge>
          </div>
          <div className="space-y-2">
            {uploaded.map(u => {
              const isExtracting = extractingIds.has(u.id);
              return (
                <div key={u.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex-1 cursor-pointer flex items-center gap-3" onClick={() => setPreviewUpload(previewUpload?.id === u.id ? null : u)}>
                    <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate">{u.original_name}</div>
                      <div className="text-xs text-gray-500">{u.file_size ? (u.file_size / 1024).toFixed(2) + " KB" : ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button onClick={() => handleExtract(u)} disabled={isExtracting} size="sm" variant={isExtracting ? "secondary" : "default"}>
                      {isExtracting ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Đang xử lý</> : "✨ Trích xuất"}
                    </Button>
                    <button onClick={() => syllabusService.delete(u.id).then(() => setUploads(prev => prev.filter(x => x.id !== u.id)))} className="text-gray-400 hover:text-red-500 p-1"><XCircle className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Processing */}
      {processing.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 font-semibold text-sm">
              Đang xử lý
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">{processing.length}</Badge>
            </div>
            <div className="text-xs text-blue-600 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> AI is analyzing...
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: "65%" }} />
          </div>
          <div className="space-y-2">
            {processing.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{u.original_name}</div>
                    <div className="text-xs text-gray-500">{u.file_size ? (u.file_size / 1024).toFixed(2) + " KB" : ""}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Done/Error */}
      {done.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="font-semibold text-sm mb-3">Results</div>
          <div className="space-y-2">
            {done.map(u => (
              <div key={u.id} onClick={() => u.status === "done" && setSelectedUpload(u)}
                className={cn("flex justify-between items-center p-3 border rounded-lg transition-colors",
                  u.status === "done" ? "border-green-200 bg-green-50 cursor-pointer hover:bg-green-100" : "border-red-200 bg-red-50")}>
                <div className="flex items-center gap-3">
                  {u.status === "done"
                    ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{u.original_name}</div>
                    <div className={cn("text-xs", u.status === "done" ? "text-green-700" : "text-red-600")}>
                      {u.status === "done" ? "Extracted successfully – click to review and create course" : u.error_message || "Extraction failed"}
                    </div>
                  </div>
                </div>
                {u.status === "done" && <Badge className="bg-green-100 text-green-700 border-green-200">Review</Badge>}
                {u.status === "error" && (
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); syllabusService.delete(u.id).then(() => setUploads(prev => prev.filter(x => x.id !== u.id))); }} className="text-red-600 hover:text-red-700 hover:bg-red-100">
                    <XCircle className="w-4 h-4 mr-1" />Delete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── SECTION 3: Document Preview ── */}
      {previewUpload && (
        <Card className="overflow-hidden mb-5">
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded text-blue-600 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{previewUpload.original_name}</div>
                <div className="text-xs text-gray-500">{previewUpload.file_size ? (previewUpload.file_size / 1024).toFixed(2) + " KB" : ""}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreviewUpload(null)}><XCircle className="w-4 h-4" /></Button>
          </div>
          <div className="p-6 min-h-[300px] flex items-center justify-center bg-gray-50">
            {(() => {
              const blobUrl = localBlobUrls.current.get(previewUpload.id);
              const isImage = previewUpload.file_type?.startsWith("image/");
              const isPdf = previewUpload.file_type === "application/pdf";
              if (isImage && blobUrl) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={blobUrl} alt={previewUpload.original_name} className="max-w-full max-h-[520px] rounded shadow object-contain" />
                );
              }
              if (isPdf) {
                return (
                  <div className="text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <div className="text-sm font-semibold text-gray-700 mb-1">{previewUpload.original_name}</div>
                    <Badge variant="outline">PDF</Badge>
                  </div>
                );
              }
              return (
                <div className="text-center text-gray-400">
                  <File className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <div className="text-sm">No preview</div>
                </div>
              );
            })()}
          </div>
        </Card>
      )}

      {selectedUpload && (
        <ReviewModal
          upload={selectedUpload}
          onClose={() => setSelectedUpload(null)}
          onCourseCreated={(c) => handleCourseCreated(c, selectedUpload.id)}
          onDiscarded={(id) => {
            setUploads(prev => prev.filter(u => u.id !== id));
            setSelectedUpload(null);
          }}
        />
      )}
    </div>
  );
}