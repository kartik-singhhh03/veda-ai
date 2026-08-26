"use client";

import { AlertTriangle } from "lucide-react";
import type { Answer, GradeResult, Question } from "@/types/assessment";

type QuestionCardProps = {
  question: Question;
  answer: Answer | undefined;
  isUnanswered: boolean;
  selected: boolean;
  grade: GradeResult | null;
  onSelect: (questionId: string) => void;
};

export function QuestionCard({
  question,
  answer,
  isUnanswered,
  selected,
  grade,
  onSelect,
}: QuestionCardProps) {
  const statusLabel = isUnanswered ? "Unanswered" : "Answered";
  const hasScore =
    grade &&
    grade.score !== null &&
    grade.maxScore !== null &&
    question.maxMarks !== undefined;

  return (
    <button
      type="button"
      onClick={() => onSelect(question.id)}
      className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
        selected
          ? "border-accent bg-accent-soft/40 shadow-sm"
          : "border-border bg-card hover:bg-surface"
      }`}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-white"
          aria-hidden
        >
          {question.number}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-3 text-sm leading-relaxed text-foreground">
              {question.text}
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {hasScore ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    grade.score === 0
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {grade.score} / {grade.maxScore}
                </span>
              ) : question.maxMarks !== undefined ? (
                <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
                  Not graded
                </span>
              ) : (
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    isUnanswered
                      ? "bg-amber-50 text-amber-700"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {isUnanswered ? (
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {statusLabel}
                    </span>
                  ) : (
                    statusLabel
                  )}
                </span>
              )}
            </div>
          </div>

          {isUnanswered && question.maxMarks !== undefined ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              Unanswered
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
