import { type Schema } from "@google/genai";

/** Structured JSON — no thinkingConfig (Gemini 3.x rejects it on flash-lite). */
export function extractionJsonConfig(schema: Schema) {
  return {
    responseMimeType: "application/json" as const,
    responseSchema: schema,
  };
}

/** JSON mime only — fallback when responseSchema + PDF triggers INVALID_ARGUMENT. */
export function jsonMimeConfig() {
  return {
    responseMimeType: "application/json" as const,
  };
}

export function gradingJsonConfig(schema: Schema) {
  return {
    responseMimeType: "application/json" as const,
    responseSchema: schema,
  };
}

/** @deprecated use extractionJsonConfig or gradingJsonConfig */
export function structuredJsonConfig(schema: Schema) {
  return extractionJsonConfig(schema);
}
