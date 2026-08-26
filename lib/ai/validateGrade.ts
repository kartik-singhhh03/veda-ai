import type { GradeResult, Question } from "../../types/assessment";

export type GradeValidationResult =
  | { ok: true; grade: GradeResult }
  | { ok: false; error: string };

/**
 * Deterministic validation of Gemini grading output.
 * Rejects scores outside [0, maxMarks] and malformed payloads.
 */
export function validateGradeResult(
  raw: unknown,
  question: Question,
): GradeValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Grading response was not an object." };
  }

  const record = raw as Record<string, unknown>;
  const maxMarks =
    typeof question.maxMarks === "number" && Number.isFinite(question.maxMarks)
      ? question.maxMarks
      : null;

  let score: number | null = null;
  if (record.score === null || record.score === undefined) {
    score = null;
  } else if (typeof record.score === "number" && Number.isFinite(record.score)) {
    score = record.score;
  } else {
    return { ok: false, error: "Grading score must be a number or null." };
  }

  let maxScore: number | null = null;
  if (record.maxScore === null || record.maxScore === undefined) {
    maxScore = maxMarks;
  } else if (
    typeof record.maxScore === "number" &&
    Number.isFinite(record.maxScore)
  ) {
    maxScore = record.maxScore;
  } else {
    return { ok: false, error: "Grading maxScore must be a number or null." };
  }

  if (maxMarks !== null) {
    if (maxScore === null || maxScore !== maxMarks) {
      return {
        ok: false,
        error: `Grading maxScore must equal question maxMarks (${maxMarks}).`,
      };
    }
    if (score === null) {
      return {
        ok: false,
        error: "Grading score is required when maxMarks is set.",
      };
    }
    if (score < 0 || score > maxMarks) {
      return {
        ok: false,
        error: `Score ${score} is outside 0..${maxMarks}.`,
      };
    }
  } else {
    if (score !== null) {
      return {
        ok: false,
        error: "Score must be null when the question has no maxMarks.",
      };
    }
    maxScore = null;
  }

  let feedback: string | null = null;
  if (typeof record.feedback === "string") {
    feedback = record.feedback.trim() || null;
  } else if (record.feedback === null || record.feedback === undefined) {
    feedback = null;
  } else {
    return { ok: false, error: "Feedback must be a string or null." };
  }

  return {
    ok: true,
    grade: { score, maxScore, feedback },
  };
}
