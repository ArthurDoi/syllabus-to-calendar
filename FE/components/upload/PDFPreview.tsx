"use client";

import { useState, useRef, useEffect } from "react";
import { File, Download, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/file-utils";

interface PDFPreviewProps {
  file: File;
  onRemove?: () => void;
  className?: string;
}

export function PDFPreview({ file, onRemove, className }: PDFPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Create object URL for PDF preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setLoading(false);

    return () => {
      // Cleanup object URL
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleDownload = () => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card className={className}>
        <div className="p-4 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <File className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleDownload}>
            <Download className="w-4 h-4" />
          </Button>
          {onRemove && (
            <Button variant="ghost" size="icon" onClick={onRemove}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="relative" style={{ height: "600px" }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-sm text-gray-500">Loading PDF preview...</div>
          </div>
        ) : previewUrl ? (
          <iframe
            ref={iframeRef}
            src={previewUrl}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        ) : null}
      </div>
    </Card>
  );
}

