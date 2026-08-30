import { type Schema } from "@google/genai";

/** Structured JSON generation — compatible with Gemini 2.5 Flash on Google AI Studio. */
export function structuredJsonConfig(schema: Schema) {
  return {
    responseMimeType: "application/json" as const,
    responseSchema: schema,
    temperature: 0.1,
  };
}
