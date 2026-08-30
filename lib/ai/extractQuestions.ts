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
import { validateQuestions } from "@/lib/ai/validateQuestions";
import type { DocumentPage, Question } from "@/types/assessment";

const questionResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: "Stable id, usually the printed number e.g. 11(a)",
          },
          number: {
            type: Type.STRING,
            description: "Printed question number/label exactly as shown",
          },
          text: {
            type: Type.STRING,
            description: "Full question text as accurately as possible",
          },
          order: {
            type: Type.INTEGER,
            description: "0-based or 1-based printed sequence index; unique and increasing",
          },
          maxMarks: {
            type: Type.NUMBER,
            description: "Marks if clearly printed; omit if unknown",
            nullable: true,
          },
        },
        required: ["id", "number", "text", "order"],
      },
    },
  },
  required: ["questions"],
};

const QUESTION_PROMPT = `You are extracting exam questions from a scanned/printed question paper.

Rules:
1. Extract EVERY printed question in reading order.
2. Preserve original question numbering exactly (e.g. "1", "2.", "11(a)", "11(b)").
3. Treat labelled sub-parts as SEPARATE questions. Example: 11(a) and 11(b) are two questions.
4. Do NOT renumber questions.
5. Do NOT merge sub-parts.
6. Do NOT invent missing questions.
7. Preserve question text as accurately as possible.
8. Extract maxMarks only when clearly printed; otherwise omit it.
9. Set order to the actual printed sequence starting at 0 for the first question, then 1, 2, ...
10. Set id to the same value as number when possible.

Return JSON matching the schema.`;

export type ExtractQuestionsSource =
  | { kind: "pdf"; bytes: Uint8Array; pageCount: number }
  | { kind: "pages"; pages: DocumentPage[] };

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function buildPdfParts(bytes: Uint8Array, pageCount: number): GeminiPart[] {
  return [
    { text: QUESTION_PROMPT },
    {
      text: `The question paper is attached as a PDF with ${pageCount} page(s). Read the PDF directly and extract every printed question.`,
    },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: Buffer.from(bytes).toString("base64"),
      },
    },
  ];
}

function buildImageParts(pages: DocumentPage[]): GeminiPart[] {
  const parts: GeminiPart[] = [
    { text: QUESTION_PROMPT },
    {
      text: `The document has ${pages.length} page image(s). Images follow in page order starting at page 1.`,
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
    if (page.bytes.byteLength < 2_000) {
      console.warn(
        `[extract-questions] Page ${page.pageNumber} render is very small (${page.bytes.byteLength} bytes) — Gemini may not read it.`,
      );
    }
  }

  return parts;
}

async function callGemini(
  parts: GeminiPart[],
  meta: Record<string, unknown>,
): Promise<Question[]> {
  const client = getGeminiClient();

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
        config: extractionJsonConfig(questionResponseSchema),
      });
      responseText = response.text;

      if (!responseText) {
        throw new Error("Gemini returned an empty question extraction response.");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        throw new Error("Gemini returned invalid JSON for question extraction.");
      }

      const validation = validateQuestions(parsed);
      if (!validation.ok) {
        console.error("Question validation failed:", {
          ...meta,
          model,
          error: validation.error,
          details: validation.details,
          responsePreview: responseText.slice(0, 400),
        });
        throw new Error(
          validation.details?.length
            ? `${validation.error} ${validation.details.slice(0, 5).join("; ")}`
            : validation.error,
        );
      }

      if (model !== GEMINI_EXTRACTION_MODEL) {
        console.warn(
          `[extract-questions] Used fallback model ${model} (configured: ${GEMINI_EXTRACTION_MODEL})`,
        );
      }

      return validation.questions;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Gemini error";
      lastError = error instanceof Error ? error : new Error(message);

      if (isModelNotFoundError(message) || isInvalidArgumentError(message)) {
        console.warn(`[extract-questions] Model ${model} failed: ${message}`);
        continue;
      }

      console.error("Gemini question extraction failed:", message, {
        ...meta,
        model,
      });
      throw new Error(`Gemini question extraction failed: ${message}`);
    }
  }

  const detail = lastError?.message ?? "All Gemini models failed.";
  throw new Error(`Gemini question extraction failed: ${detail}`);
}

export async function extractQuestions(
  source: ExtractQuestionsSource,
): Promise<Question[]> {
  if (source.kind === "pdf") {
    return callGemini(buildPdfParts(source.bytes, source.pageCount), {
      input: "pdf",
      pageCount: source.pageCount,
      byteLength: source.bytes.byteLength,
    });
  }

  if (source.pages.length === 0) {
    throw new Error("No pages available for question extraction.");
  }

  return callGemini(buildImageParts(source.pages), {
    input: "images",
    pageCount: source.pages.length,
    pageSizes: source.pages.map((p) => ({
      page: p.pageNumber,
      bytes: p.bytes.byteLength,
      width: p.width,
      height: p.height,
    })),
  });
}
