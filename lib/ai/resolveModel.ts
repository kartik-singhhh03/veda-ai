const DEFAULT_MODEL = "gemini-2.5-flash";

/** Models known to work with Google AI Studio keys (AIza + AQ auth keys). */
export const GEMINI_MODEL_FALLBACKS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
] as const;

function normalizeCandidate(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/**
 * Resolve a Gemini model from env, falling back when Vercel has a stale value
 * (e.g. gemini-3.6-flash from an earlier README) that the API key cannot use.
 */
export function resolveGeminiModel(
  envValue: string | undefined,
  fallback: string = DEFAULT_MODEL,
): string {
  const candidate = normalizeCandidate(envValue);
  if (!candidate) return fallback;

  if ((GEMINI_MODEL_FALLBACKS as readonly string[]).includes(candidate)) {
    return candidate;
  }

  console.warn(
    `[gemini] Ignoring unsupported model env "${candidate}" — using ${fallback}. ` +
      `Remove GEMINI_MODEL / GEMINI_EXTRACTION_MODEL from Vercel or set to gemini-2.5-flash.`,
  );
  return fallback;
}

export function isModelNotFoundError(message: string): boolean {
  return /not found|NOT_FOUND|404|is not supported|no longer available/i.test(
    message,
  );
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
    model: resolveGeminiModel(process.env.GEMINI_MODEL),
    extractionModel: resolveGeminiModel(
      process.env.GEMINI_EXTRACTION_MODEL,
      resolveGeminiModel(process.env.GEMINI_MODEL),
    ),
    hasApiKey: Boolean(key),
    keyPrefix: key ? key.slice(0, 6) : null,
  };
}
