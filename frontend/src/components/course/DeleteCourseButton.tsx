"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteCourseButtonProps {
  courseId: string;
  courseName?: string;
}

export function DeleteCourseButton({
  courseId,
  courseName,
}: DeleteCourseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Delete "${courseName || "this course"}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete course");
      }

      router.push("/courses");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete course."
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button
        type="button"
        variant="destructive"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Course
          </>
        )}
      </Button>
    </div>
  );
}

