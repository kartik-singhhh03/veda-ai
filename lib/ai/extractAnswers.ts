import { pageToBase64 } from "@/lib/documents/processDocument";
import { generateExtractionJson } from "@/lib/ai/generateExtraction";
import { validateAnswerCandidates } from "@/lib/ai/validateAnswers";
import type { AnswerCandidate, DocumentPage } from "@/types/assessment";

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

export async function extractAnswers(
  pages: DocumentPage[],
): Promise<AnswerCandidate[]> {
  if (pages.length === 0) {
    throw new Error("No pages available for answer extraction.");
  }

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

  let responseText: string;
  try {
    responseText = await generateExtractionJson(parts, "extract-answers");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Gemini error";
    console.error("Gemini answer extraction failed:", message);
    throw new Error(
      message.includes("quota")
        ? message
        : `Gemini answer extraction failed: ${message}`,
    );
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

  return validation.answers;
}
