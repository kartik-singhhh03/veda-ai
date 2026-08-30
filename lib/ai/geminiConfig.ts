import { ThinkingLevel, type Schema } from "@google/genai";

/** Structured JSON for Gemini 3.x (no temperature — deprecated on 3.x). */
export function extractionJsonConfig(schema: Schema) {
  return {
    responseMimeType: "application/json" as const,
    responseSchema: schema,
    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
  };
}

export function gradingJsonConfig(schema: Schema) {
  return {
    responseMimeType: "application/json" as const,
    responseSchema: schema,
    thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
  };
}

/** @deprecated use extractionJsonConfig or gradingJsonConfig */
export function structuredJsonConfig(schema: Schema) {
  return extractionJsonConfig(schema);
}
