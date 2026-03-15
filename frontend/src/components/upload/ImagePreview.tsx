"use client";

import { useState, useEffect } from "react";
import { Image, Download, X, ZoomIn } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/file-utils";

interface ImagePreviewProps {
  file: File;
  onRemove?: () => void;
  className?: string;
}

export function ImagePreview({ file, onRemove, className }: ImagePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    // Create object URL for image preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setLoading(false);

    return () => {
      // Cleanup object URL
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleDownload = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
    <>
      <Card className={className}>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Image className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setZoomed(true)}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            {onRemove && (
              <Button variant="ghost" size="icon" onClick={onRemove}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="relative bg-gray-100 flex items-center justify-center min-h-[400px]">
          {loading ? (
            <div className="text-sm text-gray-500">Loading image...</div>
          ) : previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-[600px] object-contain"
            />
          ) : null}
        </div>
      </Card>

      {/* Zoomed Modal */}
      {zoomed && previewUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20"
              onClick={() => setZoomed(false)}
            >
              <X className="w-6 h-6 text-white" />
            </Button>
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}

