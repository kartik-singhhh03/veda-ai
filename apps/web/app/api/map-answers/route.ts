import { NextResponse } from "next/server";
import { runMappingPipeline } from "@/lib/mapping/runMappingPipeline";
import { jsonError, ApiError } from "@/lib/api/upload";
import type { AnswerCandidate, Question } from "@vedaai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

function isCandidate(value: unknown): value is AnswerCandidate {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === "string" &&
    (typeof c.questionReference === "string" || c.questionReference === null) &&
    typeof c.text === "string" &&
    typeof c.confidence === "number" &&
    Array.isArray(c.regions)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object") {
      throw new ApiError("Request body must be a JSON object.");
    }

    const record = body as Record<string, unknown>;
    if (!Array.isArray(record.questions) || !record.questions.every(isQuestion)) {
      throw new ApiError("Invalid or missing questions array.");
    }
    if (
      !Array.isArray(record.candidates) ||
      !record.candidates.every(isCandidate)
    ) {
      throw new ApiError("Invalid or missing candidates array.");
    }

    const mapStarted = Date.now();
    const result = await runMappingPipeline(
      record.questions,
      record.candidates,
    );

    console.info("[map-answers]", {
      questionCount: record.questions.length,
      candidateCount: record.candidates.length,
      answeredCount: result.answers.filter((a) => a.status === "answered")
        .length,
      unmatchedCount: result.unmatchedCandidates.length,
      totalMs: Date.now() - mapStarted,
    });

    return NextResponse.json({
      answers: result.answers,
      unansweredQuestions: result.unansweredQuestions,
      unmatchedCandidates: result.unmatchedCandidates,
    });
  } catch (error) {
    return jsonError(error);
  }
}
