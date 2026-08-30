import {
  EXTRACTION_MODEL_DEFAULT,
  GRADING_MODEL_DEFAULT,
  geminiRuntimeSummary,
  resolveGeminiModel,
} from "@/lib/ai/resolveModel";

export const GEMINI_MODEL = resolveGeminiModel(
  process.env.GEMINI_MODEL,
  GRADING_MODEL_DEFAULT,
);

export const GEMINI_EXTRACTION_MODEL = resolveGeminiModel(
  process.env.GEMINI_EXTRACTION_MODEL,
  EXTRACTION_MODEL_DEFAULT,
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
