"use client";

import type { Answer, GradeResult, Question } from "@/types/assessment";

type SelectedQuestionPanelProps = {
  question: Question | null;
  answer: Answer | null;
  isUnanswered: boolean;
  grade: GradeResult | null;
  grading: boolean;
  gradingError: string | null;
};

export function SelectedQuestionPanel({
  question,
  answer,
  isUnanswered,
  grade,
  grading,
  gradingError,
}: SelectedQuestionPanelProps) {
  if (!question) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-3 text-sm text-muted">
        Select a question to review its mapped answer.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Question {question.number}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">
          {question.text}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Student answer
        </p>
        {isUnanswered ? (
          <p className="mt-1 text-sm text-amber-700">
            This question was not answered.
          </p>
        ) : answer ? (
          <p className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {answer.text}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">No mapped answer.</p>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          AI Feedback
        </p>
        {grading ? (
          <p className="mt-1 text-sm text-muted">Grading...</p>
        ) : gradingError ? (
          <p
            role="alert"
            className="mt-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-danger"
          >
            Grading unavailable right now. You can still review the mapped
            answer and highlight.
          </p>
        ) : grade?.feedback ? (
          <div className="mt-1 rounded-xl border border-accent/30 bg-accent-soft/40 px-3 py-2.5 text-sm leading-relaxed text-foreground/90">
            {grade.feedback}
            {grade.score !== null && grade.maxScore !== null ? (
              <p className="mt-2 text-xs font-semibold text-foreground">
                Score: {grade.score} / {grade.maxScore}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted">No feedback yet.</p>
        )}
      </div>
    </div>
  );
}
