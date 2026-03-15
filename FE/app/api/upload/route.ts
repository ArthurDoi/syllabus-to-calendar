import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { APP_CONFIG } from "@/constants/config";
import { validateFile } from "@/lib/file-utils";
import { query, queryOne } from "@/lib/db";
import { randomUUID } from "crypto";
import { requireAuth } from "@/lib/session";
import { resolveUserId } from "@/lib/user-resolver";

// For development, we'll store files in a local uploads directory
// In production, you'd want to use cloud storage (S3, etc.)
const UPLOAD_DIR = join(process.cwd(), "uploads");

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();
    const userId = await resolveUserId(session);

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const uploadedFiles = [];

    for (const file of files) {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split(".").pop();
      const fileName = `${timestamp}-${randomString}.${fileExtension}`;
      const filePath = join(UPLOAD_DIR, fileName);

      // Convert File to Buffer and save
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      // Save file metadata to database
      const uploadId = randomUUID();
      try {
        await query(
          `INSERT INTO syllabus_uploads 
          (id, user_id, file_name, original_name, file_path, file_type, file_size, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            uploadId,
            userId,
            fileName,
            file.name,
            filePath,
            file.type,
            file.size,
            "uploading",
          ]
        );
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue even if DB save fails
      }

      uploadedFiles.push({
        id: uploadId,
        originalName: file.name,
        fileName,
        filePath,
        size: file.size,
        type: file.type,
      });
    }

    // Update status to processing
    if (uploadedFiles.length > 0 && uploadedFiles[0].id) {
      try {
        await query(
          `UPDATE syllabus_uploads SET status = ? WHERE id = ?`,
          ["processing", uploadedFiles[0].id]
        );
      } catch (dbError) {
        console.error("Database update error:", dbError);
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      fileId: uploadedFiles[0]?.id || uploadedFiles[0]?.fileName,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}

// Optional: GET endpoint to check upload status and get parsed data
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = await resolveUserId(session);
    const searchParams = request.nextUrl.searchParams;
    const uploadId = searchParams.get("uploadId");
    const fileId = searchParams.get("fileId");

    if (uploadId) {
      // Get upload record with parsed data
      const upload = await queryOne(
        `SELECT * FROM syllabus_uploads WHERE id = ? AND user_id = ?`,
        [uploadId, userId]
      );

      if (!upload) {
        return NextResponse.json(
          { error: "Upload not found" },
          { status: 404 }
        );
      }

      let parsedData = null;
      if (upload.parsed_data) {
        try {
          parsedData =
            typeof upload.parsed_data === "string"
              ? JSON.parse(upload.parsed_data)
              : upload.parsed_data;
        } catch (error) {
          console.warn(
            "Failed to deserialize parsed_data payload for upload",
            uploadId,
            error
          );
          parsedData = null;
        }
      }

      return NextResponse.json({
        success: true,
        upload,
        parsedData,
      });
    }

    if (!fileId) {
      return NextResponse.json({ error: "fileId or uploadId required" }, { status: 400 });
    }

    // Check if file exists
    const filePath = join(UPLOAD_DIR, fileId);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      fileId,
      exists: true,
    });
  } catch (error) {
    console.error("Get upload error:", error);
    return NextResponse.json(
      { error: "Failed to get upload information" },
      { status: 500 }
    );
  }
}
