"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { syllabusService, courseService } from "@/lib/services";
import type { SyllabusUpload, Course } from "@/types";
import ReviewModal from "./ReviewModal";
import { CourseCard } from "@/components/course/CourseCard";
import { CourseModal } from "@/components/course/CourseModal";
import { cn } from "@/lib/utils";

type View = "list" | "upload";

// ─── Main page ────────────────────────────────────────────────────────────────
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
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500 mb-2">
                Courses
              </p>
              <h1 className="text-3xl font-bold text-gray-900">Courses</h1>
              <p className="text-sm text-gray-500 mt-1">
                {courses.length === 0
                  ? 'Upload a syllabus or add a course manually to start planning.'
                  : `Tracking ${courses.length} ${courses.length === 1 ? 'course' : 'courses'} across the term.`}
              </p>
            </div>
            <Button
              onClick={() => setView("upload")}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </Button>
          </div>
        </div>

        {courses.length === 0 ? (
          <Card className="p-12 bg-gradient-to-br from-blue-50 via-white to-purple-50 border border-gray-200">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                <Plus className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses yet</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Get started by uploading your first course syllabus or creating a course manually.
              </p>
              <Button
                onClick={() => setView("upload")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Course
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
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

  // ── UPLOAD VIEW (Bản gốc giữ nguyên) ────────────────────────────────────────
  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500 mb-2">Courses</p>
          <h1 className="text-3xl font-bold text-gray-900">Upload Syllabus</h1>
          <p className="text-sm text-gray-500 mt-1">Upload your syllabus files and extract course schedule with AI.</p>
        </div>
        <Button onClick={() => { setView("list"); setUploadError(null); setPendingFiles([]); }} variant="outline">
          ← Back
        </Button>
      </div>

      {uploadError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex justify-between items-center">
          <span>❌ {uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {/* ── SECTION 1: Drag & Drop Zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); stageFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={cn("border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all mb-5", dragging ? "border-purple-500 bg-purple-50" : "border-gray-300 bg-white shadow-sm")}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
          onChange={e => { stageFiles(e.target.files); e.target.value = ""; }} />
        <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-50 border border-gray-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#7c3aed" : "#9ca3af"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 16 12 12 8 16" />
            <line x1="12" y1="12" x2="12" y2="21" />
            <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
          </svg>
        </div>
        <div className="text-sm font-semibold text-gray-900 mb-1">Drag and drop files here</div>
        <div className="text-sm text-gray-500 mb-1">or click to browse</div>
        <div className="text-xs text-gray-400">Supports PDF, JPEG, PNG (Max 10MB)</div>
      </div>

      {/* ── SECTION 2: Selected Files + Upload button ── */}
      {pendingFiles.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="font-semibold text-gray-900">Selected files ({pendingFiles.length})</div>
              <div className="text-xs text-gray-500">Total {(pendingFiles.reduce((s, f) => s + f.size, 0) / 1024).toFixed(2)} KB</div>
            </div>
            <Button onClick={() => handleFiles(pendingFiles)} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload & Process"}
            </Button>
          </div>
          <div className="space-y-2">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-900">{f.name}</div>
                  <div className="text-xs text-gray-500">{(f.size / 1024).toFixed(2)} KB</div>
                </div>
                <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Uploaded (pending extract) */}
      {uploaded.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="font-semibold text-sm mb-3">Waiting for extraction ({uploaded.length})</div>
          <div className="space-y-2">
            {uploaded.map(u => {
              const isExtracting = extractingIds.has(u.id);
              return (
                <div key={u.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex-1 cursor-pointer" onClick={() => setPreviewUpload(previewUpload?.id === u.id ? null : u)}>
                    <div className="text-sm font-medium text-gray-900 truncate">{u.original_name}</div>
                    <div className="text-xs text-gray-500">{u.file_size ? (u.file_size / 1024).toFixed(2) + " KB" : ""}</div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button onClick={() => handleExtract(u)} disabled={isExtracting} size="sm" variant={isExtracting ? "secondary" : "default"}>
                      {isExtracting ? "⟳ Processing..." : "✨ Extract"}
                    </Button>
                    <button onClick={() => syllabusService.delete(u.id).then(() => setUploads(prev => prev.filter(x => x.id !== u.id)))} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
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
            <div className="font-semibold text-sm">Processing ({processing.length})</div>
            <div className="text-xs text-blue-600 flex items-center gap-1">
              <span className="animate-spin inline-block">⟳</span> AI is analyzing...
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-1.5 rounded-full" style={{ width: "65%" }}></div>
          </div>
          <div className="space-y-2">
            {processing.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 border border-gray-100 rounded-lg bg-gray-50">
                <div>
                  <div className="text-sm font-medium text-gray-900">{u.original_name}</div>
                  <div className="text-xs text-gray-500">{u.file_size ? (u.file_size / 1024).toFixed(2) + " KB" : ""}</div>
                </div>
                <span>⏳</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Done/Error */}
      {done.length > 0 && (
        <Card className="p-5 mb-5">
          <div className="font-semibold text-sm mb-3">Result</div>
          <div className="space-y-2">
            {done.map(u => (
              <div key={u.id} onClick={() => u.status === "done" && setSelectedUpload(u)}
                className={cn("flex justify-between items-center p-3 border rounded-lg", u.status === "done" ? "border-green-200 bg-green-50 cursor-pointer" : "border-red-200 bg-red-50")}>
                <div className="flex items-center gap-3">
                  <span>{u.status === "done" ? "✅" : "❌"}</span>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{u.original_name}</div>
                    <div className={cn("text-xs", u.status === "done" ? "text-green-700" : "text-red-600")}>
                      {u.status === "done" ? "Extracted successfully – click to view and create course" : u.error_message || "Processing failed"}
                    </div>
                  </div>
                </div>
                {u.status === "done" && <span className="text-xs font-medium text-gray-600">Views</span>}
                {u.status === "error" && (
                  <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); syllabusService.delete(u.id).then(() => setUploads(prev => prev.filter(x => x.id !== u.id))); }} className="text-red-600 hover:text-red-700 hover:bg-red-100">✕ Delete</Button>
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
              <div className="w-8 h-8 bg-blue-100 rounded text-blue-600 flex items-center justify-center">🖼</div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{previewUpload.original_name}</div>
                <div className="text-xs text-gray-500">{previewUpload.file_size ? (previewUpload.file_size / 1024).toFixed(2) + " KB" : ""}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setPreviewUpload(null)}>✕</Button>
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
                    <div className="text-5xl mb-3">📄</div>
                    <div className="text-sm font-semibold text-gray-700 mb-1">{previewUpload.original_name}</div>
                    <div className="text-xs text-gray-500">PDF</div>
                  </div>
                );
              }
              return (
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">📁</div>
                  <div className="text-sm">No preview available</div>
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