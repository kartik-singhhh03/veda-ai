import { pageToBase64 } from "@/lib/documents/processDocument";
import { generateExtractionJson } from "@/lib/ai/generateExtraction";
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

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

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

export async function extractQuestions(
  pages: DocumentPage[],
): Promise<Question[]> {
  if (pages.length === 0) {
    throw new Error("No pages available for question extraction.");
  }

  const meta = {
    input: "images",
    pageCount: pages.length,
    pageSizes: pages.map((p) => ({
      page: p.pageNumber,
      bytes: p.bytes.byteLength,
      width: p.width,
      height: p.height,
    })),
  };

  let responseText: string;
  try {
    responseText = await generateExtractionJson(
      buildImageParts(pages),
      "extract-questions",
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini error";
    console.error("Gemini question extraction failed:", message, meta);
    throw new Error(
      message.includes("quota")
        ? message
        : `Gemini question extraction failed: ${message}`,
    );
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

  return validation.questions;
}
