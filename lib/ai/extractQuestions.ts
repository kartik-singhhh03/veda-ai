import { Type, type Schema } from "@google/genai";
import { getGeminiClient } from "@/lib/ai/client";
import { GEMINI_MODEL } from "@/lib/ai/config";
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

export async function extractQuestions(
  pages: DocumentPage[],
): Promise<Question[]> {
  if (pages.length === 0) {
    throw new Error("No pages available for question extraction.");
  }

  const client = getGeminiClient();

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: QUESTION_PROMPT },
    {
      text: `The document has ${pages.length} page(s). Images follow in page order starting at page 1.`,
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

  let responseText: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: questionResponseSchema,
        temperature: 0.1,
      },
    });
    responseText = response.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Gemini error";
    console.error("Gemini question extraction failed:", message);
    throw new Error(`Gemini question extraction failed: ${message}`);
  }

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
    console.error("Question validation failed:", validation.details);
    throw new Error(
      validation.details?.length
        ? `${validation.error} ${validation.details.slice(0, 5).join("; ")}`
        : validation.error,
    );
  }

  return validation.questions;
}
