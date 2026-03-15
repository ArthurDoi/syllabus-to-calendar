"use client";

import { useSearchParams } from "next/navigation";
import { CourseCreationForm } from "@/components/course/CourseCreationForm";
import { useEffect, useState, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ParsedSyllabus } from "@/types/syllabus";
import { PARSED_SYLLABUS_STORAGE_KEY } from "@/lib/storage-keys";

export const dynamic = "force-dynamic";

function CreateCourseContent() {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get("uploadId");
  const [parsedData, setParsedData] = useState<ParsedSyllabus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uploadId) {
      setParsedData(null);
      return;
    }

    const hydrateFromCache = (): ParsedSyllabus | null => {
      if (typeof window === "undefined") return null;
      const raw = window.localStorage.getItem(PARSED_SYLLABUS_STORAGE_KEY);
      if (!raw) return null;
      try {
        const cached = JSON.parse(raw);
        if (cached.uploadId && cached.uploadId !== uploadId) {
          return null;
        }
        window.localStorage.removeItem(PARSED_SYLLABUS_STORAGE_KEY);
        return cached.parsedData || null;
      } catch (error) {
        console.warn("Failed to parse cached syllabus data", error);
        window.localStorage.removeItem(PARSED_SYLLABUS_STORAGE_KEY);
        return null;
      }
    };

    const cached = hydrateFromCache();
    if (cached) {
      setParsedData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/upload?uploadId=${uploadId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.parsedData) {
          setParsedData(data.parsedData);
        } else if (data.upload?.parsed_data) {
          // Parse JSON string if stored as string
          try {
            setParsedData(
              typeof data.upload.parsed_data === "string"
                ? JSON.parse(data.upload.parsed_data)
                : data.upload.parsed_data
            );
          } catch (e) {
            console.error("Failed to parse parsed_data:", e);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [uploadId]);

  if (loading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Create Course</h1>
        <p className="text-gray-600">
          {parsedData
            ? "Review and edit the extracted course information."
            : "Enter your course information."}
        </p>
      </div>
      <CourseCreationForm parsedData={parsedData} uploadId={uploadId || undefined} />
    </div>
  );
}

export default function CreateCoursePage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    }>
      <CreateCourseContent />
    </Suspense>
  );
}

