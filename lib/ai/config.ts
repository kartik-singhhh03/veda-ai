import {
  geminiRuntimeSummary,
  resolveGeminiModel,
} from "@/lib/ai/resolveModel";

/** Default model for grading and semantic mapping. */
export const GEMINI_MODEL = resolveGeminiModel(process.env.GEMINI_MODEL);

/** Vision/PDF extraction model (same allowlist + fallbacks as GEMINI_MODEL). */
export const GEMINI_EXTRACTION_MODEL = resolveGeminiModel(
  process.env.GEMINI_EXTRACTION_MODEL,
  GEMINI_MODEL,
);

export { geminiRuntimeSummary };

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
