import { Type, type Schema } from "@google/genai";
import { getGeminiClient } from "@/lib/ai/client";
import { GEMINI_MODEL } from "@/lib/ai/config";
import { validateGradeResult } from "@/lib/ai/validateGrade";
import type { Answer, GradeResult, Question } from "@/types/assessment";

const gradeSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      nullable: true,
      description: "Awarded marks; null when the question has no maxMarks",
    },
    maxScore: {
      type: Type.NUMBER,
      nullable: true,
      description: "Must equal question maxMarks when present",
    },
    feedback: {
      type: Type.STRING,
      nullable: true,
      description: "Concise teacher-facing feedback",
    },
  },
  required: ["score", "maxScore", "feedback"],
};

export async function gradeAnswer(
  question: Question,
  answer: Answer | null,
): Promise<GradeResult> {
  if (!answer || answer.status !== "answered") {
    const maxScore =
      typeof question.maxMarks === "number" ? question.maxMarks : null;
    return {
      score: maxScore === null ? null : 0,
      maxScore,
      feedback: "This question was not answered.",
    };
  }

  const hasMaxMarks = typeof question.maxMarks === "number";
  const client = getGeminiClient();

  const prompt = `You are grading a student's exam answer for a teacher.

Question number: ${question.number}
Question text: ${question.text}
${hasMaxMarks ? `Max marks: ${question.maxMarks}` : "Max marks: not specified — set score and maxScore to null."}

Student answer:
${answer.text}

Rules:
1. Evaluate only the student's answer against the supplied question.
2. If max marks are provided, award partial credit where appropriate.
3. Do not exceed max marks. Do not give negative scores.
4. Keep feedback concise and useful to a teacher.
5. Do not invent facts about what the student wrote.
6. Mention what is missing when relevant.
7. Do not grade an unanswered question as correct.
8. For diagrams: only comment if the transcribed answer clearly describes diagram content; do not claim diagram correctness you cannot verify.
9. Return JSON matching the schema.`;

  let responseText: string | undefined;
  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: gradeSchema,
        temperature: 0.1,
      },
    });
    responseText = response.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Gemini error";
    console.error("Grading failed:", message);
    throw new Error(`Grading failed: ${message}`);
  }

  if (!responseText) {
    throw new Error("Gemini returned an empty grading response.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new Error("Gemini returned invalid JSON for grading.");
  }

  const validation = validateGradeResult(parsed, question);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  return validation.grade;
}
