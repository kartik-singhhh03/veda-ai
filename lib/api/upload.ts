import { NextResponse } from "next/server";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
]);

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error.";

  if (message.includes("GEMINI_API_KEY")) {
    return NextResponse.json({ error: message }, { status: 500 });
  }

  console.error("API error:", message);
  return NextResponse.json(
    { error: message },
    { status: 500 },
  );
}

export async function readUploadFile(
  formData: FormData,
  fieldName: string,
): Promise<{ bytes: Uint8Array; mimeType: string; fileName: string }> {
  const value = formData.get(fieldName);

  if (!value || !(value instanceof File)) {
    throw new ApiError(`Missing upload field "${fieldName}".`);
  }

  if (value.size === 0) {
    throw new ApiError("Uploaded file is empty.");
  }

  if (value.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiError("File is too large. Maximum size is 10MB.");
  }

  const fileName = value.name || "upload";
  const mimeType = value.type || guessMimeFromName(fileName);

  if (!ALLOWED_MIME.has(mimeType) && !hasAllowedExtension(fileName)) {
    throw new ApiError(
      "Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG.",
    );
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  return {
    bytes: new Uint8Array(buffer),
    mimeType: mimeType || guessMimeFromName(fileName),
    fileName,
  };
}

function hasAllowedExtension(fileName: string): boolean {
  return /\.(pdf|png|jpe?g)$/i.test(fileName);
}

function guessMimeFromName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "";
}
