import { APP_CONFIG } from "@/constants/config";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a file based on type and size
 */
export function validateFile(file: File): FileValidationResult {
  // Check file type
  if (!(APP_CONFIG.ALLOWED_FILE_TYPES as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `File type not supported. Allowed types: PDF, JPEG, PNG`,
    };
  }

  // Check file size
  if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = APP_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  return { valid: true };
}

/**
 * Validates multiple files
 */
export function validateFiles(files: File[]): {
  valid: File[];
  invalid: Array<{ file: File; error: string }>;
} {
  const valid: File[] = [];
  const invalid: Array<{ file: File; error: string }> = [];

  files.forEach((file) => {
    const result = validateFile(file);
    if (result.valid) {
      valid.push(file);
    } else {
      invalid.push({ file, error: result.error || "Unknown error" });
    }
  });

  return { valid, invalid };
}

/**
 * Formats file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

/**
 * Gets file type icon or label
 */
export function getFileTypeLabel(file: File): string {
  if (file.type === "application/pdf") return "PDF";
  if (file.type.startsWith("image/")) {
    return file.type.split("/")[1].toUpperCase();
  }
  return "File";
}

