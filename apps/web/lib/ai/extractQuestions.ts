import { bytesToBase64, isPdfBytes } from "@/lib/documents/bytesToBase64";
import { looksLikeBlankRenders } from "@/lib/documents/pageRenderQuality";
import { pageToBase64 } from "@/lib/documents/processDocument";
import { generateExtractionJson } from "@/lib/ai/generateExtraction";
import {
  normalizeQuestionsPayload,
  parseGeminiJson,
} from "@/lib/ai/parseGeminiJson";
import { GRADING_MODEL_DEFAULT } from "@/lib/ai/resolveModel";
import {
  isInvalidArgumentError,
  isModelNotFoundError,
  isQuotaError,
} from "@/lib/ai/resolveModel";
import { validateQuestions } from "@/lib/ai/validateQuestions";
import type { DocumentPage, Question } from "@vedaai/types";

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

You MUST return at least one question if any question text is visible.

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
  meta: Record<string, unknown>;
  model?: string;
  plain?: boolean;
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
  }

  return parts;
}

function mergeQuestions(chunks: Question[][]): Question[] {
  const byId = new Map<string, Question>();
  for (const question of chunks.flat()) {
    if (!byId.has(question.id)) {
      byId.set(question.id, question);
    }
  }
  return [...byId.values()].sort((a, b) => a.order - b.order);
}

function pageMeta(pages: DocumentPage[]) {
  return {
    pageCount: pages.length,
    pageSizes: pages.map((p) => ({
      page: p.pageNumber,
      bytes: p.bytes.byteLength,
      width: p.width,
      height: p.height,
    })),
  };
}

let lastExtractDebug = "";

async function extractOnce(attempt: ExtractAttempt): Promise<Question[] | null> {
  const { parts, label, meta, model, plain } = attempt;

  try {
    const responseText = await generateExtractionJson(
      parts,
      `extract-questions:${label}`,
      { model, plain },
    );

    lastExtractDebug = `[${label}] ${responseText.slice(0, 200)}`;

    let parsed: unknown;
    try {
      parsed = normalizeQuestionsPayload(parseGeminiJson(responseText));
    } catch {
      console.warn(`[extract-questions:${label}] invalid JSON`, {
        ...meta,
        preview: responseText.slice(0, 300),
      });
      return null;
    }

    const validation = validateQuestions(parsed);
    if (!validation.ok) {
      console.warn(`[extract-questions:${label}] validation failed`, {
        ...meta,
        error: validation.error,
        details: validation.details,
        preview: responseText.slice(0, 300),
      });
      return null;
    }

    console.info(`[extract-questions:${label}] ok`, {
      ...meta,
      questionCount: validation.questions.length,
      model: model ?? "default",
      plain: Boolean(plain),
    });
    return validation.questions;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini error";
    lastExtractDebug = `[${label}] error: ${message.slice(0, 200)}`;

    if (isQuotaError(message)) {
      throw new Error(message);
    }

    if (isModelNotFoundError(message) || isInvalidArgumentError(message)) {
      console.warn(`[extract-questions:${label}] Gemini call failed: ${message}`, meta);
      return null;
    }

    console.error(`[extract-questions:${label}] failed: ${message}`, meta);
    throw new Error(
      message.includes("quota")
        ? message
        : `Gemini question extraction failed: ${message}`,
    );
  }
}

export async function extractQuestions(
  input: ExtractQuestionsInput,
): Promise<Question[]> {
  const { pages, pdfFallback } = input;
  const hasPdf =
    pdfFallback &&
    pdfFallback.bytes.byteLength > 0 &&
    isPdfBytes(pdfFallback.bytes);
  const rendersBlank = looksLikeBlankRenders(pages);

  if (pages.length === 0 && !hasPdf) {
    throw new Error("No pages available for question extraction.");
  }

  const meta = {
    ...pageMeta(pages),
    rendersBlank,
    pdfBytes: pdfFallback?.bytes.byteLength ?? 0,
  };
  lastExtractDebug = "";

  if (pdfFallback && pdfFallback.bytes.byteLength > 0 && !isPdfBytes(pdfFallback.bytes)) {
    console.error("[extract-questions] uploaded bytes are not a valid PDF header", {
      byteLength: pdfFallback.bytes.byteLength,
      header: bytesToBase64(pdfFallback.bytes.slice(0, 8)),
    });
  }

  const attempts: ExtractAttempt[] = [];

  if (hasPdf) {
    // Plain text first — JSON mime + inline PDF often returns empty on Gemini 3.x.
    attempts.push({
      parts: buildPdfParts(pdfFallback.bytes, pdfFallback.pageCount),
      label: "pdf-plain",
      meta: { ...meta, input: "pdf" },
      plain: true,
    });
    attempts.push({
      parts: buildPdfParts(pdfFallback.bytes, pdfFallback.pageCount),
      label: "pdf",
      meta: { ...meta, input: "pdf" },
    });
    attempts.push({
      parts: buildPdfParts(pdfFallback.bytes, pdfFallback.pageCount),
      label: "pdf-3.6",
      meta: { ...meta, input: "pdf" },
      model: GRADING_MODEL_DEFAULT,
      plain: true,
    });
  }

  if (pages.length > 0 && !rendersBlank) {
    attempts.push({
      parts: buildImageParts(pages),
      label: "images",
      meta: { ...meta, input: "images" },
    });
  } else if (rendersBlank) {
    console.warn("[extract-questions] skipping image attempts — PDF renders look blank", meta);
  }

  for (const attempt of attempts) {
    const result = await extractOnce(attempt);
    if (result && result.length > 0) {
      return result;
    }
  }

  if (pages.length > 1 && !rendersBlank) {
    const perPage: Question[][] = [];
    for (const page of pages) {
      const chunk = await extractOnce({
        parts: buildImageParts([page]),
        label: `page-${page.pageNumber}`,
        meta: { ...meta, input: "images", singlePage: page.pageNumber },
      });
      if (chunk && chunk.length > 0) {
        perPage.push(chunk);
      }
    }
    const merged = mergeQuestions(perPage);
    if (merged.length > 0) return merged;
  }

  if (rendersBlank && !hasPdf) {
    throw new Error(
      "No questions were extracted — PDF page renders look blank on the server. Try exporting the PDF again or upload PNG/JPG scans.",
    );
  }

  const debugHint = lastExtractDebug
    ? ` Last response: ${lastExtractDebug}`
    : "";
  throw new Error(`No questions were extracted from the document.${debugHint}`);
}
