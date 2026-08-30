import { bytesToBase64 } from "@/lib/documents/bytesToBase64";
import { validatePageImage } from "@/lib/documents/imageSignature";
import { looksLikeBlankRenders } from "@/lib/documents/pageRenderQuality";
import { pageToBase64 } from "@/lib/documents/processDocument";
import { GEMINI_EXTRACTION_MODEL } from "@/lib/ai/config";
import { generateExtractionJson } from "@/lib/ai/generateExtraction";
import {
  normalizeQuestionsPayload,
  parseGeminiJson,
} from "@/lib/ai/parseGeminiJson";
import { GRADING_MODEL_DEFAULT } from "@/lib/ai/resolveModel";
import { isQuotaError } from "@/lib/ai/resolveModel";
import { validateQuestions } from "@/lib/ai/validateQuestions";
import type { DocumentPage, Question } from "@vedaai/types";

/** Prefer configured extraction model; fall back to 3.6-flash inside generateExtractionJson. */
const QUESTION_EXTRACTION_MODEL = GEMINI_EXTRACTION_MODEL;

const QUESTION_PROMPT = `You are extracting printed exam questions from a question paper image.

The attached image(s) are page scans from a question paper. Read the printed question text visible in the image(s).

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

You MUST return at least one question when any printed question text is visible in the image(s).

Return JSON only: { "questions": [ { "id", "number", "text", "order", "maxMarks"? } ] }`;

export type ExtractQuestionsInput = {
  pages: DocumentPage[];
  pdfFallback?: { bytes: Uint8Array; pageCount: number };
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type ExtractAttempt = {
  parts: GeminiPart[];
  label: string;
  input: "images" | "pdf";
  model?: string;
};

function buildPdfParts(bytes: Uint8Array, pageCount: number): GeminiPart[] {
  return [
    { text: QUESTION_PROMPT },
    {
      text: `The question paper is attached as a PDF with ${pageCount} page(s). Read the PDF and extract every printed question.`,
    },
    {
      inlineData: {
        mimeType: "application/pdf",
        data: bytesToBase64(bytes),
      },
    },
  ];
}

function buildImageParts(pages: DocumentPage[]): GeminiPart[] {
  const parts: GeminiPart[] = [
    { text: QUESTION_PROMPT },
    {
      text: `The question paper has ${pages.length} page image(s). Each image is a scan of one printed page. Images follow in page order starting at page 1.`,
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

  return parts;
}

function validatePagesForExtraction(pages: DocumentPage[]): void {
  for (const page of pages) {
    const check = validatePageImage(page.bytes, page.width, page.height);
    if (!check.ok) {
      throw new Error(
        `Page ${page.pageNumber} image is invalid (${check.reason ?? "unknown"}).`,
      );
    }
    if (check.detectedMime && check.detectedMime !== page.mimeType) {
      console.warn("[extract-questions] mime mismatch", {
        page: page.pageNumber,
        declared: page.mimeType,
        detected: check.detectedMime,
        headerHex: check.headerHex,
      });
    }
  }
}

function pageMeta(pages: DocumentPage[]) {
  return {
    pageCount: pages.length,
    pageBytes: pages.map((page) => page.bytes.byteLength),
    pageHeaders: pages.map((page) =>
      validatePageImage(page.bytes, page.width, page.height).headerHex,
    ),
    mimeTypes: pages.map((page) => page.mimeType),
  };
}

async function extractOnce(attempt: ExtractAttempt): Promise<Question[] | null> {
  const { parts, label, input, model = QUESTION_EXTRACTION_MODEL } = attempt;

  try {
    const responseText = await generateExtractionJson(
      parts,
      `extract-questions:${label}`,
      {
        model,
        plain: true,
        singleModel: true,
      },
    );

    let parsed: unknown;
    try {
      parsed = normalizeQuestionsPayload(parseGeminiJson(responseText));
    } catch {
      console.warn(`[extract-questions:${label}] invalid JSON`, {
        input,
        responseChars: responseText.length,
        preview: responseText.slice(0, 300),
      });
      return null;
    }

    const validation = validateQuestions(parsed);
    if (!validation.ok) {
      console.warn(`[extract-questions:${label}] validation failed`, {
        input,
        error: validation.error,
        details: validation.details,
        responseChars: responseText.length,
        preview: responseText.slice(0, 300),
      });
      return null;
    }

    console.info(`[extract-questions:${label}] ok`, {
      input,
      model,
      questionCount: validation.questions.length,
    });
    return validation.questions;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini error";

    if (isQuotaError(message)) {
      throw new Error(message);
    }

    console.error(`[extract-questions:${label}] failed`, { input, model, message });
    return null;
  }
}

export async function extractQuestions(
  input: ExtractQuestionsInput,
): Promise<Question[]> {
  const { pages, pdfFallback } = input;

  if (pages.length === 0) {
    throw new Error("No pages available for question extraction.");
  }

  validatePagesForExtraction(pages);

  const rendersBlank = looksLikeBlankRenders(pages);
  const meta = {
    ...pageMeta(pages),
    rendersBlank,
    pdfBytes: pdfFallback?.bytes.byteLength ?? 0,
  };

  console.info("[extract-questions] start", {
    ...meta,
    model: QUESTION_EXTRACTION_MODEL,
    sentImages: pages.length,
  });

  const hasPdf =
    pdfFallback &&
    pdfFallback.pageCount > 0 &&
    pdfFallback.bytes.byteLength > 0;

  // Prefer PDF when serverless renders are blank (~7 KB white PNGs on Vercel).
  if (rendersBlank && hasPdf && pdfFallback) {
    console.warn(
      "[extract-questions] blank renders detected — using PDF input for Gemini",
      meta,
    );
    for (const model of [QUESTION_EXTRACTION_MODEL, GRADING_MODEL_DEFAULT]) {
      const pdfResult = await extractOnce({
        parts: buildPdfParts(pdfFallback.bytes, pdfFallback.pageCount),
        label: model === QUESTION_EXTRACTION_MODEL ? "pdf" : "pdf-3.6",
        input: "pdf",
        model,
      });
      if (pdfResult && pdfResult.length > 0) {
        return pdfResult;
      }
    }
  }

  if (!rendersBlank) {
    const imageResult = await extractOnce({
      parts: buildImageParts(pages),
      label: "images",
      input: "images",
    });
    if (imageResult && imageResult.length > 0) {
      return imageResult;
    }
    throw new Error("No questions were extracted from the document.");
  }

  throw new Error(
    "No questions were extracted — PDF page renders look blank on the server and PDF fallback returned no questions.",
  );
}
