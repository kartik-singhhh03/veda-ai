/** Minimum confidence required to accept a semantic Gemini match. */
export const SEMANTIC_MATCH_THRESHOLD = 0.75;

/**
 * Soft band for teacher-facing review UI only.
 * Semantic matches in [SEMANTIC_MATCH_THRESHOLD, SEMANTIC_HIGH_CONFIDENCE)
 * stay mapped but show "Review recommended".
 */
export const SEMANTIC_HIGH_CONFIDENCE = 0.9;
