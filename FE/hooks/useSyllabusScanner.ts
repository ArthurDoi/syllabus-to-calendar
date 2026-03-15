import { useCallback, useRef, useState } from "react";
import {
  NormalizedSyllabusResult,
  ParsedSyllabus,
} from "@/types/syllabus";
import { normalizedToParsedSyllabus } from "@/lib/syllabus-normalizer";

export type ScannerStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "success"
  | "error";

export interface ScannerProgressEvent {
  step?: number;
  message?: string;
  timestamp: number;
}

export interface ScanParams {
  fileId: string;
  uploadId?: string;
}

interface StreamPayload {
  type?: string;
  step?: number;
  message?: string;
  payload?: NormalizedSyllabusResult;
  error?: {
    message?: string;
  };
}

export function useSyllabusScanner() {
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [progress, setProgress] = useState<ScannerProgressEvent[]>([]);
  const [parsedData, setParsedData] = useState<ParsedSyllabus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
    setProgress([]);
    setParsedData(null);
    setError(null);
  }, []);

  const parseEventChunk = useCallback(
    async (chunk: string) => {
      if (!chunk.startsWith("data:")) return null;
      const jsonString = chunk.replace(/^data:\s*/, "");
      if (!jsonString) return null;

      try {
        const payload: StreamPayload = JSON.parse(jsonString);

        if (payload.type === "progress") {
          setProgress((prev) => [
            ...prev,
            {
              step: payload.step,
              message: payload.message,
              timestamp: Date.now(),
            },
          ]);
          return null;
        }

        if (payload.type === "result" && payload.payload?.success) {
          const normalized = payload.payload.data;
          const parsed = normalizedToParsedSyllabus(normalized);
          setParsedData(parsed);
          return parsed;
        }

        if (payload.type === "error") {
          throw new Error(payload.error?.message || "Scanner reported an error");
        }
      } catch (err) {
        throw err instanceof Error
          ? err
          : new Error("Failed to parse scanner event");
      }

      return null;
    },
    []
  );

  const startScan = useCallback(
    async ({ fileId, uploadId }: ScanParams) => {
      if (!fileId) {
        const message = "fileId is required to start scanning";
        setError(message);
        setStatus("error");
        throw new Error(message);
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setStatus("connecting");
      setProgress([]);
      setParsedData(null);
      setError(null);

      try {
        const response = await fetch("/api/parse-syllabus/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId, uploadId }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const text = await response.text();
          throw new Error(text || "Failed to start scanner");
        }

        setStatus("streaming");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalParsed: ParsedSyllabus | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let delimiterIndex;
          while ((delimiterIndex = buffer.indexOf("\n\n")) !== -1) {
            const chunk = buffer.slice(0, delimiterIndex).trim();
            buffer = buffer.slice(delimiterIndex + 2);

            if (!chunk) continue;
            const parsed = await parseEventChunk(chunk);
            if (parsed) {
              finalParsed = parsed;
            }
          }
        }

        await reader.cancel();

        if (!finalParsed) {
          throw new Error("Scanner finished without returning a result");
        }

        setStatus("success");
        return finalParsed;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("idle");
          return null;
        }

        const message =
          err instanceof Error ? err.message : "Failed to scan syllabus";
        setError(message);
        setStatus("error");
        throw new Error(message);
      } finally {
        abortRef.current = null;
      }
    },
    [parseEventChunk]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  return {
    status,
    progress,
    parsedData,
    error,
    startScan,
    cancel,
    reset,
  };
}

