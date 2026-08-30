/** Default model — widely available on Google AI Studio (AIza and AQ auth keys). */
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";

/** Vision/PDF extraction uses the same default unless overridden. */
export const GEMINI_EXTRACTION_MODEL =
  process.env.GEMINI_EXTRACTION_MODEL?.trim() || GEMINI_MODEL;

export function getGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is missing. Add it to .env.local and restart the server.",
    );
  }
  return key;
}
