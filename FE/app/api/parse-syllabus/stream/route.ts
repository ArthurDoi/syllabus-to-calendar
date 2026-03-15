import { NextRequest } from "next/server";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { query } from "@/lib/db";
import {
  NormalizedSyllabusResult,
  NormalizedSyllabusData,
} from "@/types/syllabus";
import { normalizedToParsedSyllabus } from "@/lib/syllabus-normalizer";

const UPLOAD_DIR = join(process.cwd(), "uploads");
const getBackendApiUrl = () =>
  (process.env.BACKEND_API_URL || "http://localhost:3001").replace(/\/$/, "");

interface StreamRequestBody {
  fileId: string;
  uploadId?: string;
}

const sendUploadStatus = async (
  uploadId: string,
  status: "failed" | "completed",
  payload: { parsedData?: NormalizedSyllabusData; errorMessage?: string }
) => {
  try {
    if (status === "completed" && payload.parsedData) {
      await query(
        `UPDATE syllabus_uploads SET status = ?, parsed_data = ? WHERE id = ?`,
        [
          "completed",
          JSON.stringify(normalizedToParsedSyllabus(payload.parsedData)),
          uploadId,
        ]
      );
    } else if (status === "failed") {
      await query(
        `UPDATE syllabus_uploads SET status = ?, error_message = ? WHERE id = ?`,
        ["failed", payload.errorMessage || "Processing failed", uploadId]
      );
    }
  } catch (error) {
    console.error("Failed to update upload status:", error);
  }
};

export async function POST(request: NextRequest) {
  try {
    const body: StreamRequestBody = await request.json();
    const { fileId, uploadId } = body;

    if (!fileId) {
      return new Response("fileId is required", { status: 400 });
    }

    const filePath = join(UPLOAD_DIR, fileId);
    if (!existsSync(filePath)) {
      if (uploadId) {
        await sendUploadStatus(uploadId, "failed", {
          errorMessage: "File not found on server",
        });
      }
      return new Response("File not found", { status: 404 });
    }

    const fileBuffer = await readFile(filePath);
    const originalName = join(UPLOAD_DIR, fileId).split("/").pop() || fileId;
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

    if (!backendResponse.ok || !backendResponse.body) {
      if (uploadId) {
        await sendUploadStatus(uploadId, "failed", {
          errorMessage: backendResponse.statusText || "Backend stream failed",
        });
      }
      return new Response(
        backendResponse.statusText || "Backend stream failed",
        { status: backendResponse.status || 502 }
      );
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let hasPersistedResult = false;

    const stream = new ReadableStream({
      async start(controller) {
        const reader = backendResponse.body!.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            controller.enqueue(value);

            buffer += decoder.decode(value, { stream: true });
            let delimiterIndex;

            while ((delimiterIndex = buffer.indexOf("\n\n")) !== -1) {
              const eventChunk = buffer.slice(0, delimiterIndex).trim();
              buffer = buffer.slice(delimiterIndex + 2);

              if (!eventChunk.startsWith("data:")) {
                continue;
              }

              const jsonString = eventChunk.replace(/^data:\s*/, "");
              try {
                const payload = JSON.parse(jsonString) as {
                  type?: string;
                  payload?: NormalizedSyllabusResult;
                  error?: { message?: string };
                };

                if (
                  payload?.type === "result" &&
                  payload.payload?.success &&
                  uploadId &&
                  !hasPersistedResult
                ) {
                  await sendUploadStatus(uploadId, "completed", {
                    parsedData: payload.payload.data,
                  });
                  hasPersistedResult = true;
                } else if (payload?.type === "error" && uploadId) {
                  await sendUploadStatus(uploadId, "failed", {
                    errorMessage: payload.error?.message,
                  });
                }
              } catch (parseError) {
                // Ignore malformed chunks
              }
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          await reader.cancel();
        }
      },
      cancel() {
        backendResponse.body?.cancel();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("SSE proxy error:", error);

    // Update upload status if uploadId is provided
    // Update upload status if we have the body parsed
    // Note: We can't easily access uploadId here if JSON parsing failed
    // so we log the error and return 500
    console.error("Stream processing failed");

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to proxy SSE stream",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

