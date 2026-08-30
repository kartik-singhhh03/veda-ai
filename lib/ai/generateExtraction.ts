import { getGeminiClient } from "@/lib/ai/client";
import { GEMINI_EXTRACTION_MODEL } from "@/lib/ai/config";
import { jsonMimeConfig } from "@/lib/ai/geminiConfig";
import {
  EXTRACTION_MODEL_DEFAULT,
  GRADING_MODEL_DEFAULT,
  isModelNotFoundError,
  isQuotaError,
} from "@/lib/ai/resolveModel";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type GenerateExtractionOptions = {
  model?: string;
  /** Skip responseMimeType — use when JSON mode returns empty on vision. */
  plain?: boolean;
};

/**
 * One Gemini vision call for extraction — avoids burning free-tier quota on
 * multi-model / multi-config retry loops.
 */
export async function generateExtractionJson(
  parts: GeminiPart[],
  logPrefix: string,
  options?: GenerateExtractionOptions,
): Promise<string> {
  const client = getGeminiClient();
  let model = options?.model ?? GEMINI_EXTRACTION_MODEL;
  const fallbacks = [
    model,
    ...(model !== EXTRACTION_MODEL_DEFAULT ? [EXTRACTION_MODEL_DEFAULT] : []),
    ...(model !== GRADING_MODEL_DEFAULT ? [GRADING_MODEL_DEFAULT] : []),
  ];

  let lastError: Error | null = null;

  for (const candidate of fallbacks) {
    model = candidate;
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: options?.plain ? undefined : jsonMimeConfig(),
      });

      const text = response.text?.trim();
      if (!text) {
        lastError = new Error("Gemini returned an empty response.");
        continue;
      }

      if (model !== GEMINI_EXTRACTION_MODEL) {
        console.warn(
          `[${logPrefix}] Used model ${model} (configured: ${GEMINI_EXTRACTION_MODEL})`,
        );
      }

      return text;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";
      lastError = error instanceof Error ? error : new Error(message);

      if (isQuotaError(message)) {
        throw new Error(
          "Gemini API quota exceeded for today. Wait about a minute and retry, or enable billing in Google AI Studio.",
        );
      }

      if (isModelNotFoundError(message)) {
        console.warn(`[${logPrefix}] Model ${model} unavailable: ${message}`);
        continue;
      }

      throw new Error(message);
    }
  }

  throw lastError ?? new Error("Gemini extraction failed.");
}
