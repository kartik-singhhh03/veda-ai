import { gradeAnswer } from "@/lib/ai/gradeAnswer";
import { ApiError, jsonError } from "@/lib/api/upload";
import type { Answer, Question } from "@/types/assessment";

export const runtime = "nodejs";

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== "object") return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.id === "string" &&
    typeof q.number === "string" &&
    typeof q.text === "string" &&
    typeof q.order === "number"
  );
}

function isAnswer(value: unknown): value is Answer {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === "string" &&
    (typeof a.questionId === "string" || a.questionId === null) &&
    typeof a.text === "string" &&
    typeof a.confidence === "number" &&
    Array.isArray(a.regions) &&
    (a.status === "answered" ||
      a.status === "unanswered" ||
      a.status === "unmatched")
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object") {
      throw new ApiError("Request body must be a JSON object.");
    }

    const record = body as Record<string, unknown>;
    if (!isQuestion(record.question)) {
      throw new ApiError("Invalid or missing question.");
    }

    const answer =
      record.answer === null || record.answer === undefined
        ? null
        : isAnswer(record.answer)
          ? record.answer
          : null;

    if (record.answer !== null && record.answer !== undefined && !answer) {
      throw new ApiError("Invalid answer payload.");
    }

    const grade = await gradeAnswer(record.question, answer);
    return Response.json({ grade });
  } catch (error) {
    return jsonError(error);
  }
}
