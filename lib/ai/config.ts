/** Model for grading and semantic mapping. */
export const GEMINI_MODEL = "gemini-3.6-flash";

/**
 * Model for vision + structured extraction.
 * Flash-Lite is tuned for document extraction and JSON parsing (see Google Gemini docs).
 * Override with GEMINI_EXTRACTION_MODEL if needed.
 */
export const GEMINI_EXTRACTION_MODEL =
  process.env.GEMINI_EXTRACTION_MODEL?.trim() || "gemini-3.5-flash-lite";

export function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local and restart the server.",
    );
  }
  return key;
}
