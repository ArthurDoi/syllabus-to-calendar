import { NextRequest, NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";
import { readFile, unlink } from "fs/promises";
import { query } from "@/lib/db";
import { NormalizedSyllabusResult, ParsedSyllabus } from "@/types/syllabus";
import { normalizedToParsedSyllabus } from "@/lib/syllabus-normalizer";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const getBackendApiUrl = () =>
  (process.env.BACKEND_API_URL || "http://localhost:3001").replace(/\/$/, "");

interface ParseRequest {
  fileId: string;
  uploadId?: string;
}

interface UpdateUploadRequest {
  uploadId: string;
  courseId?: string;
}

export async function POST(request: NextRequest) {
  let filePath: string | null = null;
  try {
    const body: ParseRequest = await request.json();
    const { fileId, uploadId } = body;

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "fileId is required" },
        { status: 400 }
      );
    }

    const resolvedFilePath = join(UPLOAD_DIR, fileId);
    filePath = resolvedFilePath;
    if (!existsSync(resolvedFilePath)) {
      if (uploadId) {
        await query(
          "UPDATE syllabus_uploads SET status = ?, error_message = ? WHERE id = ?",
          ["failed", "File not found on server", uploadId]
        );
      }

      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(resolvedFilePath);
    let shouldCleanupFile = true;
    const cleanupUploadedFile = async () => {
      if (!shouldCleanupFile) return;
      shouldCleanupFile = false;
      try {
        await unlink(resolvedFilePath);
      } catch (cleanupError) {
        console.warn("Failed to remove uploaded file:", cleanupError);
      }
    };
    const originalName = resolvedFilePath.split("/").pop() || fileId;
    const mimeType =
      originalName.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : originalName.toLowerCase().match(/\.(png|jpg|jpeg)$/)
          ? "image/png"
          : "application/octet-stream";

    const formData = new FormData();
    formData.append(
      "image",
      new Blob([fileBuffer], { type: mimeType }),
      originalName
    );

    const backendResponse = await fetch(
      `${getBackendApiUrl()}/api/v1/syllabus/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error('[parse-syllabus] Backend error:', {
        status: backendResponse.status,
        statusText: backendResponse.statusText,
        errorText
      });
      if (uploadId) {
        await query(
          "UPDATE syllabus_uploads SET status = ?, error_message = ? WHERE id = ?",
          ["failed", "Backend service error", uploadId]
        );
      }
      await cleanupUploadedFile();
      return NextResponse.json(
        {
          success: false,
          error: `Backend service failed: ${errorText || backendResponse.statusText}`,
        },
        { status: backendResponse.status }
      );
    }

    const normalized: NormalizedSyllabusResult =
      await backendResponse.json();

    if (!normalized.success) {
      if (uploadId) {
        await query(
          "UPDATE syllabus_uploads SET status = ?, error_message = ? WHERE id = ?",
          ["failed", normalized.error || "AI parsing failed", uploadId]
        );
      }

      await cleanupUploadedFile();
      return NextResponse.json(
        { success: false, error: normalized.error || "AI parsing failed" },
        { status: 502 }
      );
    }

    const parsedData: ParsedSyllabus = normalizedToParsedSyllabus(
      normalized.data
    );

    if (uploadId) {
      try {
        await query(
          `UPDATE syllabus_uploads 
            SET status = ?, parsed_data = ? 
            WHERE id = ?`,
          ["completed", JSON.stringify(parsedData), uploadId]
        );
      } catch (dbError) {
        console.error("Database update error:", dbError);
      }
    }

    await cleanupUploadedFile();
    return NextResponse.json({
      success: true,
      parsedData,
      uploadId: uploadId || null,
    });
  } catch (error) {
    console.error("Parse error:", error);
    if (filePath) {
      try {
        await unlink(filePath);
      } catch (cleanupError) {
        // ignore cleanup errors in catch
      }
    }
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to parse syllabus",
      },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update upload with course ID
export async function PATCH(request: NextRequest) {
  try {
    const body: UpdateUploadRequest = await request.json();
    const { uploadId, courseId } = body;

    if (!uploadId) {
      return NextResponse.json(
        { error: "uploadId is required" },
        { status: 400 }
      );
    }

    // Update upload record with course ID
    if (courseId) {
      await query(
        "UPDATE syllabus_uploads SET course_id = ? WHERE id = ?",
        [courseId, uploadId]
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Update upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update upload",
      },
      { status: 500 }
    );
  }
}

