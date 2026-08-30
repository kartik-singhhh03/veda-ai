import { getGeminiClient } from "@/lib/ai/client";
import { GEMINI_EXTRACTION_MODEL } from "@/lib/ai/config";
import { jsonMimeConfig } from "@/lib/ai/geminiConfig";
import {
  EXTRACTION_MODEL_DEFAULT,
  isModelNotFoundError,
  isQuotaError,
} from "@/lib/ai/resolveModel";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * One Gemini vision call for extraction — avoids burning free-tier quota on
 * multi-model / multi-config retry loops.
 */
export async function generateExtractionJson(
  parts: GeminiPart[],
  logPrefix: string,
): Promise<string> {
  const client = getGeminiClient();
  let model = GEMINI_EXTRACTION_MODEL;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: jsonMimeConfig(),
      });

      const text = response.text?.trim();
      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      if (model !== GEMINI_EXTRACTION_MODEL) {
        console.warn(
          `[${logPrefix}] Used fallback model ${model} (configured: ${GEMINI_EXTRACTION_MODEL})`,
        );
      }

      return text;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";

      if (isQuotaError(message)) {
        throw new Error(
          "Gemini API quota exceeded for today. Wait about a minute and retry, or enable billing in Google AI Studio.",
        );
      }

      if (attempt === 0 && isModelNotFoundError(message)) {
        console.warn(`[${logPrefix}] Model ${model} unavailable, retrying with ${EXTRACTION_MODEL_DEFAULT}`);
        model = EXTRACTION_MODEL_DEFAULT;
        continue;
      }

      throw new Error(message);
    }
  }

  throw new Error("Gemini extraction failed.");
}
