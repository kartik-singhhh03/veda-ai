"use client";

import { useId, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { FilePreview } from "@/components/upload/FilePreview";
import { getAcceptAttribute, MAX_FILE_SIZE_LABEL } from "@/lib/validation/file";

type UploadCardProps = {
  label: string;
  accentLabel: string;
  file: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

export function UploadCard({
  label,
  accentLabel,
  file,
  onSelect,
  onRemove,
}: UploadCardProps) {
  const inputId = useId();
  const description = `${label} ${accentLabel}`;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (nextFile) {
      onSelect(nextFile);
    }
    event.target.value = "";
  }

  return (
    <div className="flex min-h-[128px] flex-1 items-center justify-center rounded-[22px] border border-dashed border-[#d6d6d6] bg-card px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:min-h-[140px] lg:min-h-[128px]">
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={getAcceptAttribute()}
        onChange={handleChange}
        aria-label={description}
      />

      {file ? (
        <FilePreview file={file} onRemove={onRemove} />
      ) : (
        <label
          htmlFor={inputId}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl px-2 py-4 text-center outline-none transition-colors hover:bg-surface/60 focus-within:ring-2 focus-within:ring-accent/40"
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-muted"
            aria-hidden
          >
            <Upload className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="text-sm font-medium text-foreground">
            {label}{" "}
            <span className="text-accent">{accentLabel}</span>
          </span>
          <span className="text-xs text-muted">{MAX_FILE_SIZE_LABEL}</span>
        </label>
      )}
    </div>
  );
}
