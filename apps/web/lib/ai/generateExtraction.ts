import { getGeminiClient } from "@/lib/ai/client";
import { GEMINI_EXTRACTION_MODEL } from "@/lib/ai/config";
import { jsonMimeConfig } from "@/lib/ai/geminiConfig";
import {
  EXTRACTION_MODEL_DEFAULT,
  GRADING_MODEL_DEFAULT,
  isInvalidArgumentError,
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
  /** One model only — no fallback loop (saves quota during extraction). */
  singleModel?: boolean;
};

function countInlineImages(parts: GeminiPart[]): number {
  return parts.filter((part) => "inlineData" in part).length;
}

function promptCharLength(parts: GeminiPart[]): number {
  return parts.reduce(
    (sum, part) => sum + ("text" in part ? part.text.length : 0),
    0,
  );
}

/**
 * Gemini vision call for extraction.
 * Default: one configured model. Set singleModel to skip fallback models.
 */
export async function generateExtractionJson(
  parts: GeminiPart[],
  logPrefix: string,
  options?: GenerateExtractionOptions,
): Promise<string> {
  const client = getGeminiClient();
  const primary = options?.model ?? GEMINI_EXTRACTION_MODEL;
  const models = options?.singleModel
    ? [primary]
    : [
        primary,
        ...(primary !== EXTRACTION_MODEL_DEFAULT ? [EXTRACTION_MODEL_DEFAULT] : []),
        ...(primary !== GRADING_MODEL_DEFAULT ? [GRADING_MODEL_DEFAULT] : []),
      ];

  console.info(`[${logPrefix}] request`, {
    model: primary,
    singleModel: Boolean(options?.singleModel),
    partCount: parts.length,
    sentImages: countInlineImages(parts),
    promptChars: promptCharLength(parts),
    plain: Boolean(options?.plain),
  });

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: options?.plain ? undefined : jsonMimeConfig(),
      });

      const text = response.text?.trim() ?? "";
      const finishReason =
        response.candidates?.[0]?.finishReason ?? "unknown";

      console.info(`[${logPrefix}] response`, {
        model,
        responseChars: text.length,
        finishReason,
      });

      if (!text) {
        lastError = new Error("Gemini returned an empty response.");
        continue;
      }

      if (model !== primary) {
        console.warn(
          `[${logPrefix}] Used fallback model ${model} (requested: ${primary})`,
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

      if (isModelNotFoundError(message) || isInvalidArgumentError(message)) {
        console.warn(`[${logPrefix}] Model ${model} unavailable: ${message}`);
        if (options?.singleModel) {
          throw new Error(message);
        }
        continue;
      }

      throw new Error(message);
    }
  }

  throw lastError ?? new Error("Gemini extraction failed.");
}
