"use client";

import { FileText, ImageIcon, X } from "lucide-react";
import {
  formatFileSize,
  isPdfFile,
} from "@/lib/validation/file";

type FilePreviewProps = {
  file: File;
  onRemove: () => void;
};

export function FilePreview({ file, onRemove }: FilePreviewProps) {
  const isPdf = isPdfFile(file);
  const sizeLabel = formatFileSize(file.size);
  const metaLabel = isPdf ? "PDF" : "1 Page";

  return (
    <div className="relative w-full max-w-[280px] rounded-2xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#4a4a4a] text-white shadow-sm hover:bg-[#2f2f2f]"
        aria-label={`Remove ${file.name}`}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>

      <div className="flex items-center gap-3 pr-2">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isPdf ? "bg-red-50 text-red-500" : "bg-sky-50 text-sky-500"
          }`}
          aria-hidden
        >
          {isPdf ? (
            <FileText className="h-5 w-5" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 text-left">
          <p className="truncate text-sm font-medium text-foreground">
            {file.name}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {sizeLabel} • {metaLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
