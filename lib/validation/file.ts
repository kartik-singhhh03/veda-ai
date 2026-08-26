const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg"] as const;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
] as const;

export type FileValidationResult =
  | { ok: true }
  | { ok: false; error: string };

function getExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  if (index === -1) return "";
  return fileName.slice(index).toLowerCase();
}

export function validateUploadFile(file: File): FileValidationResult {
  const extension = getExtension(file.name);
  const hasAllowedExtension = ALLOWED_EXTENSIONS.includes(
    extension as (typeof ALLOWED_EXTENSIONS)[number],
  );
  const hasAllowedMime =
    file.type === "" ||
    ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number]);

  if (!hasAllowedExtension || !hasAllowedMime) {
    return {
      ok: false,
      error: "Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG.",
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: "File is too large. Maximum size is 10MB.",
    };
  }

  return { ok: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" ||
    getExtension(file.name) === ".pdf"
  );
}

export function getAcceptAttribute(): string {
  return ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";
}

export const MAX_FILE_SIZE_LABEL = "Max 10MB";
