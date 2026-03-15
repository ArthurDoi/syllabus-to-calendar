"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { validateFiles, formatFileSize, getFileTypeLabel } from "@/lib/file-utils";
import { APP_CONFIG } from "@/constants/config";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  acceptedFiles?: File[];
  maxFiles?: number;
  className?: string;
  showFileList?: boolean;
}

export function FileDropzone({
  onFilesSelected,
  acceptedFiles = [],
  maxFiles,
  className,
  showFileList = true,
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setDragActive(false);
      setErrors([]);

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejectionErrors = rejectedFiles.map((rejection) => {
          if (rejection.errors[0]?.code === "file-too-large") {
            return `${rejection.file.name}: File too large`;
          }
          if (rejection.errors[0]?.code === "file-invalid-type") {
            return `${rejection.file.name}: Invalid file type`;
          }
          return `${rejection.file.name}: ${rejection.errors[0]?.message || "Unknown error"}`;
        });
        setErrors(rejectionErrors);
      }

      // Validate accepted files
      const validation = validateFiles(acceptedFiles);
      
      if (validation.invalid.length > 0) {
        const validationErrors = validation.invalid.map(
          ({ file, error }) => `${file.name}: ${error}`
        );
        setErrors((prev) => [...prev, ...validationErrors]);
      }

      // Check max files limit
      const totalFiles = acceptedFiles.length + acceptedFiles.length;
      if (maxFiles && totalFiles > maxFiles) {
        setErrors((prev) => [
          ...prev,
          `Maximum ${maxFiles} file(s) allowed. You selected ${totalFiles} files.`,
        ]);
        return;
      }

      // Only pass valid files
      if (validation.valid.length > 0) {
        onFilesSelected(validation.valid);
      }
    },
    [onFilesSelected, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
    },
    maxSize: APP_CONFIG.MAX_FILE_SIZE,
    multiple: true,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const removeFile = (index: number) => {
    const newFiles = acceptedFiles.filter((_, i) => i !== index);
    onFilesSelected(newFiles);
  };

  return (
    <div className={cn("w-full", className)}>
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive || dragActive
            ? "border-primary bg-primary/5"
            : "border-gray-300 hover:border-gray-400",
          "p-8"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          <div
            className={cn(
              "p-4 rounded-full",
              isDragActive || dragActive ? "bg-primary/10" : "bg-gray-100"
            )}
          >
            <Upload
              className={cn(
                "w-8 h-8",
                isDragActive || dragActive ? "text-primary" : "text-gray-400"
              )}
            />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">
              {isDragActive || dragActive
                ? "Drop files here"
                : "Drag and drop files here"}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports PDF, JPEG, PNG (Max {APP_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB)
            </p>
          </div>
        </div>
      </Card>

      {errors.length > 0 && (
        <div className="mt-4 space-y-1">
          {errors.map((error, index) => (
            <p key={index} className="text-sm text-destructive">
              {error}
            </p>
          ))}
        </div>
      )}

      {showFileList && acceptedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Selected files ({acceptedFiles.length}):</p>
          <div className="space-y-2">
            {acceptedFiles.map((file, index) => (
              <Card key={index} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {getFileTypeLabel(file)} • {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

