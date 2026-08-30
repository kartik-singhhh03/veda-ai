import { bytesToBase64 } from "@/lib/documents/bytesToBase64";
import { looksLikeBlankRenders } from "@/lib/documents/pageRenderQuality";
import { pageToBase64 } from "@/lib/documents/processDocument";
import { generateExtractionJson } from "@/lib/ai/generateExtraction";
import {
  normalizeAnswersPayload,
  parseGeminiJson,
} from "@/lib/ai/parseGeminiJson";
import { GRADING_MODEL_DEFAULT } from "@/lib/ai/resolveModel";
import { validateAnswerCandidates } from "@/lib/ai/validateAnswers";
import type { AnswerCandidate, DocumentPage } from "@vedaai/types";

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

Return JSON: { "answers": [ { "id", "questionReference", "text", "confidence", "regions": [ { "page", "box_2d" } ] } ] }`;

export type ExtractAnswersInput = {
  pages: DocumentPage[];
  pdfFallback?: { bytes: Uint8Array; pageCount: number };
};

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type ExtractAttempt = {
  parts: GeminiPart[];
  label: string;
  pageCount: number;
  model?: string;
  plain?: boolean;
};

function buildPdfParts(bytes: Uint8Array, pageCount: number): GeminiPart[] {
  return [
    { text: ANSWER_PROMPT },
    {
      text: `The answer sheet is attached as a PDF with ${pageCount} page(s). Read the PDF and extract every handwritten answer with bounding regions.`,
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

  return parts;
}

async function extractOnce(attempt: ExtractAttempt): Promise<AnswerCandidate[] | null> {
  const { parts, label, pageCount, model, plain } = attempt;

  let responseText: string;
  try {
    responseText = await generateExtractionJson(parts, `extract-answers:${label}`, {
      model,
      plain,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini error";
    console.warn(`[extract-answers:${label}] Gemini call failed: ${message}`);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = normalizeAnswersPayload(parseGeminiJson(responseText));
  } catch {
    console.warn(`[extract-answers:${label}] invalid JSON`, {
      preview: responseText.slice(0, 300),
    });
    return null;
  }

  const validation = validateAnswerCandidates(parsed, pageCount);
  if (!validation.ok) {
    console.warn(`[extract-answers:${label}] validation failed`, {
      error: validation.error,
      details: validation.details,
      preview: responseText.slice(0, 400),
    });
    return null;
  }

  console.info(`[extract-answers:${label}] ok`, {
    answerCount: validation.answers.length,
    model: model ?? "default",
    plain: Boolean(plain),
  });
  return validation.answers;
}

export async function extractAnswers(
  input: ExtractAnswersInput | DocumentPage[],
): Promise<AnswerCandidate[]> {
  const { pages, pdfFallback } = Array.isArray(input)
    ? { pages: input, pdfFallback: undefined }
    : input;

  const pageCount = pdfFallback?.pageCount ?? pages.length;
  if (pageCount === 0) {
    throw new Error("No pages available for answer extraction.");
  }

  const hasPdf = Boolean(
    pdfFallback &&
      pdfFallback.pageCount > 0 &&
      pdfFallback.bytes.byteLength > 0,
  );
  const rendersBlank = looksLikeBlankRenders(pages);

  const attempts: ExtractAttempt[] = [];

  if (hasPdf && pdfFallback) {
    const { bytes, pageCount } = pdfFallback;
    attempts.push({
      parts: buildPdfParts(bytes, pageCount),
      label: "pdf-plain",
      pageCount,
      plain: true,
    });
    attempts.push({
      parts: buildPdfParts(bytes, pageCount),
      label: "pdf",
      pageCount,
    });
    attempts.push({
      parts: buildPdfParts(bytes, pageCount),
      label: "pdf-3.6",
      pageCount,
      model: GRADING_MODEL_DEFAULT,
      plain: true,
    });
  }

  if (pages.length > 0 && !rendersBlank) {
    attempts.push({
      parts: buildImageParts(pages),
      label: "images",
      pageCount: pages.length,
    });
  } else if (rendersBlank && pages.length > 0) {
    console.warn("[extract-answers] skipping image attempts — PDF renders look blank");
  }

  for (const attempt of attempts) {
    const result = await extractOnce(attempt);
    if (result && result.length > 0) {
      return result;
    }
  }

  if (rendersBlank && !hasPdf) {
    throw new Error(
      "No answers were extracted — PDF page renders look blank on the server. Try uploading PNG/JPG scans.",
    );
  }

  throw new Error("No answers were extracted from the answer sheet.");
}
