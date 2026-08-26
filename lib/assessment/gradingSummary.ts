import type { GradeResult } from "@/types/assessment";

export type GradingSummary = {
  questionCount: number;
  gradedCount: number;
  /** Sum of earned marks from graded results that include a numeric score. */
  earnedScore: number;
  /** Sum of max marks from graded results that include a numeric maxScore. */
  possibleScore: number;
  /** gradedCount / questionCount, or 0 when no questions. */
  coverage: number;
};

/**
 * Derive a compact grading summary from grades already in React state.
 * Never invents missing grades; does not trigger Gemini.
 */
export function computeGradingSummary(
  questionCount: number,
  grades: Iterable<GradeResult>,
): GradingSummary {
  const safeQuestionCount = Math.max(0, Math.trunc(questionCount) || 0);

  let gradedCount = 0;
  let earnedScore = 0;
  let possibleScore = 0;

  for (const grade of grades) {
    if (!grade || grade.score === null) continue;
    gradedCount += 1;
    earnedScore += grade.score;
    if (typeof grade.maxScore === "number") {
      possibleScore += grade.maxScore;
    }
  }

  return {
    questionCount: safeQuestionCount,
    gradedCount,
    earnedScore,
    possibleScore,
    coverage:
      safeQuestionCount === 0 ? 0 : gradedCount / safeQuestionCount,
  };
}

export function formatGradingCoverage(summary: GradingSummary): string {
  return `${Math.round(summary.coverage * 100)}%`;
}
