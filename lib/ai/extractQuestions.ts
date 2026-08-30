import { pageToBase64 } from "@/lib/documents/processDocument";
import { generateExtractionJson } from "@/lib/ai/generateExtraction";
import {
  isInvalidArgumentError,
  isModelNotFoundError,
  isQuotaError,
} from "@/lib/ai/resolveModel";
import { validateQuestions } from "@/lib/ai/validateQuestions";
import type { DocumentPage, Question } from "@/types/assessment";

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

Return JSON: { "questions": [ { "id", "number", "text", "order", "maxMarks"? } ] }`;

export type ExtractQuestionsInput = {
  pages: DocumentPage[];
  pdfFallback?: { bytes: Uint8Array; pageCount: number };
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function buildPdfParts(bytes: Uint8Array, pageCount: number): GeminiPart[] {
  return [
    { text: QUESTION_PROMPT },
    {
      text: `The question paper is attached as a PDF with ${pageCount} page(s). Read the PDF and extract every printed question.`,
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
    if (page.bytes.byteLength < 5_000) {
      console.warn(
        `[extract-questions] Page ${page.pageNumber} render is very small (${page.bytes.byteLength} bytes) — may be blank on serverless.`,
      );
    }
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

async function extractOnce(
  parts: GeminiPart[],
  label: string,
  meta: Record<string, unknown>,
): Promise<Question[] | null> {
  try {
    const responseText = await generateExtractionJson(
      parts,
      `extract-questions:${label}`,
    );

    let parsed: unknown;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      console.warn(`[extract-questions:${label}] invalid JSON`, {
        ...meta,
        preview: responseText.slice(0, 200),
      });
      return null;
    }

    const validation = validateQuestions(parsed);
    if (!validation.ok) {
      console.warn(`[extract-questions:${label}] validation failed`, {
        ...meta,
        error: validation.error,
        details: validation.details,
      });
      return null;
    }

    console.info(`[extract-questions:${label}] ok`, {
      ...meta,
      questionCount: validation.questions.length,
    });
    return validation.questions;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini error";

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

  if (pages.length === 0) {
    throw new Error("No pages available for question extraction.");
  }

  const meta = pageMeta(pages);

  // 1) Original PDF — most reliable when serverless renders are blank.
  if (pdfFallback && pdfFallback.bytes.byteLength > 0) {
    const fromPdf = await extractOnce(
      buildPdfParts(pdfFallback.bytes, pdfFallback.pageCount),
      "pdf",
      { ...meta, input: "pdf", pdfBytes: pdfFallback.bytes.byteLength },
    );
    if (fromPdf && fromPdf.length > 0) return fromPdf;
  }

  // 2) All page images together.
  const fromImages = await extractOnce(
    buildImageParts(pages),
    "images",
    { ...meta, input: "images" },
  );
  if (fromImages && fromImages.length > 0) return fromImages;

  // 3) One page per request — smaller payloads, works when batch fails.
  if (pages.length > 1) {
    const perPage: Question[][] = [];
    for (const page of pages) {
      const chunk = await extractOnce(
        buildImageParts([page]),
        `page-${page.pageNumber}`,
        { ...meta, input: "images", singlePage: page.pageNumber },
      );
      if (chunk && chunk.length > 0) {
        perPage.push(chunk);
      }
    }
    const merged = mergeQuestions(perPage);
    if (merged.length > 0) return merged;
  }

  const smallest = Math.min(...pages.map((p) => p.bytes.byteLength));
  if (smallest < 5_000) {
    throw new Error(
      "No questions were extracted — PDF page renders look blank on the server. Try exporting the PDF again or upload PNG/JPG scans.",
    );
  }

  throw new Error("No questions were extracted from the document.");
}
