import { Type, type Schema } from "@google/genai";
import { getGeminiClient } from "@/lib/ai/client";
import { GEMINI_EXTRACTION_MODEL } from "@/lib/ai/config";
import { extractionJsonConfig } from "@/lib/ai/geminiConfig";
import {
  EXTRACTION_MODEL_FALLBACKS,
  isInvalidArgumentError,
  isModelNotFoundError,
  modelsToTry,
} from "@/lib/ai/resolveModel";
import { pageToBase64 } from "@/lib/documents/processDocument";
import { validateAnswerCandidates } from "@/lib/ai/validateAnswers";
import type { AnswerCandidate, DocumentPage } from "@/types/assessment";

const answerResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    answers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: "Stable candidate id, e.g. answer-7",
          },
          questionReference: {
            type: Type.STRING,
            nullable: true,
            description:
              "Visible reference as written by the student (Q7, 7, 11(a), etc.) or null if unclear",
          },
          text: {
            type: Type.STRING,
            description: "Transcribed handwritten answer text",
          },
          confidence: {
            type: Type.NUMBER,
            description: "Confidence from 0 to 1",
          },
          regions: {
            type: Type.ARRAY,
            description:
              "One or more regions covering this answer. Multi-page answers use multiple regions.",
            items: {
              type: Type.OBJECT,
              properties: {
                page: {
                  type: Type.INTEGER,
                  description: "1-based page number",
                },
                box_2d: {
                  type: Type.ARRAY,
                  description:
                    "Bounding box as [ymin, xmin, ymax, xmax] normalized to 0-1000 relative to that page",
                  items: { type: Type.NUMBER },
                },
              },
              required: ["page", "box_2d"],
            },
          },
        },
        required: ["id", "questionReference", "text", "confidence", "regions"],
      },
    },
  },
  required: ["answers"],
};

const ANSWER_PROMPT = `You are extracting handwritten student answers from an answer sheet.

For each distinct answer block, return one answer candidate.

Rules:
1. Do NOT map answers to a question bank. Only read what is on the sheet.
2. questionReference is the visible label written by the student when present.
   Students may write: Q1, 1, Question 1, Q.1, 11(a), 11 (a), etc.
   Copy the visible reference as-is. Use null if no clear reference.
3. Keep an answer that references a missing/odd number (e.g. 99). Do not drop it.
4. If one answer continues across pages, return ONE candidate with multiple regions.
5. Do not split one continuous answer into multiple candidates just because of a page break.
6. For each region, set page (starting at 1) and box_2d as [ymin, xmin, ymax, xmax] on a 0-1000 scale for THAT page.
7. Boxes must tightly cover the handwritten answer content for that candidate.
8. Do NOT return whole-page boxes.
9. Do NOT include unrelated answers in the same box.
10. confidence is between 0 and 1.

Return JSON matching the schema.`;

export async function extractAnswers(
  pages: DocumentPage[],
): Promise<AnswerCandidate[]> {
  if (pages.length === 0) {
    throw new Error("No pages available for answer extraction.");
  }

  const client = getGeminiClient();

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: ANSWER_PROMPT },
    {
      text: `The answer sheet has ${pages.length} page(s). Images follow in page order starting at page 1.`,
    },
  ];

  for (const page of pages) {
    parts.push({ text: `--- Page ${page.pageNumber} ---` });
    parts.push({
      inlineData: {
        mimeType: page.mimeType,
        data: pageToBase64(page),
      },
    });
  }

  const modelsToTryList = modelsToTry(
    GEMINI_EXTRACTION_MODEL,
    EXTRACTION_MODEL_FALLBACKS,
  );

  let lastError: Error | null = null;

  for (const model of modelsToTryList) {
    let responseText: string | undefined;
    try {
      const response = await client.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config: extractionJsonConfig(answerResponseSchema),
      });
      responseText = response.text;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";
      lastError = error instanceof Error ? error : new Error(message);

      if (isModelNotFoundError(message) || isInvalidArgumentError(message)) {
        console.warn(`[extract-answers] Model ${model} failed: ${message}`);
        continue;
      }

      console.error("Gemini answer extraction failed:", message);
      throw new Error(`Gemini answer extraction failed: ${message}`);
    }

    if (!responseText) {
      lastError = new Error("Gemini returned an empty answer extraction response.");
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      throw new Error("Gemini returned invalid JSON for answer extraction.");
    }

    const validation = validateAnswerCandidates(parsed, pages.length);
    if (!validation.ok) {
      console.error("Answer validation failed:", validation.details);
      throw new Error(
        validation.details?.length
          ? `${validation.error} ${validation.details.slice(0, 5).join("; ")}`
          : validation.error,
      );
    }

    if (model !== GEMINI_EXTRACTION_MODEL) {
      console.warn(
        `[extract-answers] Used fallback model ${model} (configured: ${GEMINI_EXTRACTION_MODEL})`,
      );
    }

    return validation.answers;
  }

  const detail = lastError?.message ?? "All Gemini models failed.";
  throw new Error(`Gemini answer extraction failed: ${detail}`);
}
