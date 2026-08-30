import { ThinkingLevel, type Schema } from "@google/genai";

/** Structured JSON generation config for Gemini 3.x (no deprecated temperature). */
export function structuredJsonConfig(
  schema: Schema,
  thinkingLevel: ThinkingLevel = ThinkingLevel.MINIMAL,
) {
  return {
    responseMimeType: "application/json" as const,
    responseSchema: schema,
    thinkingConfig: { thinkingLevel },
  };
}
