/** Default for vision/PDF extraction (required for new AQ auth keys). */
export const EXTRACTION_MODEL_DEFAULT = "gemini-3.5-flash-lite";

/** Default for grading and semantic mapping. */
export const GRADING_MODEL_DEFAULT = "gemini-3.6-flash";

/** Try in order when Gemini returns 404 for a model. */
export const EXTRACTION_MODEL_FALLBACKS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
] as const;

export const GRADING_MODEL_FALLBACKS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
] as const;

/** Legacy 2.x models — Google rejects these for new AQ API keys. */
const LEGACY_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
]);

function normalizeCandidate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/**
 * Resolve model from env. New Google AQ keys require Gemini 3.x — 2.x returns 404.
 */
export function resolveGeminiModel(
  envValue: string | undefined,
  fallback: string,
): string {
  const candidate = normalizeCandidate(envValue);
  if (!candidate) return fallback;

  if (LEGACY_MODELS.has(candidate)) {
    console.warn(
      `[gemini] Model ${candidate} is unavailable for new API keys — using ${fallback}.`,
    );
    return fallback;
  }

  return candidate;
}

export function modelsToTry(
  primary: string,
  fallbacks: readonly string[],
): string[] {
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

export function isModelNotFoundError(message: string): boolean {
  return /not found|NOT_FOUND|404|is not supported|no longer available/i.test(
    message,
  );
}

export function isInvalidArgumentError(message: string): boolean {
  return /INVALID_ARGUMENT|invalid argument|400/i.test(message);
}

/** Safe runtime summary for server logs (never log full API keys). */
export function geminiRuntimeSummary(): {
  model: string;
  extractionModel: string;
  hasApiKey: boolean;
  keyPrefix: string | null;
} {
  const key =
    process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  return {
    model: resolveGeminiModel(process.env.GEMINI_MODEL, GRADING_MODEL_DEFAULT),
    extractionModel: resolveGeminiModel(
      process.env.GEMINI_EXTRACTION_MODEL,
      EXTRACTION_MODEL_DEFAULT,
    ),
    hasApiKey: Boolean(key),
    keyPrefix: key ? key.slice(0, 6) : null,
  };
}
