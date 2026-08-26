"use client";

import { QuestionCard } from "@/components/assessment/QuestionCard";
import type { Answer, GradeResult, Question } from "@/types/assessment";

type QuestionListProps = {
  questions: Question[];
  answersByQuestionId: Map<string, Answer>;
  unansweredIds: Set<string>;
  gradesByQuestionId: Map<string, GradeResult>;
  selectedQuestionId: string | null;
  onSelectQuestion: (questionId: string) => void;
};

export function QuestionList({
  questions,
  answersByQuestionId,
  unansweredIds,
  gradesByQuestionId,
  selectedQuestionId,
  onSelectQuestion,
}: QuestionListProps) {
  const sorted = [...questions].sort((a, b) => a.order - b.order);

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">
          Extracted Questions (from question paper)
        </h2>
        <span className="text-xs text-muted">{sorted.length} total</span>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1">
        {sorted.map((question) => (
          <li key={question.id}>
            <QuestionCard
              question={question}
              answer={answersByQuestionId.get(question.id)}
              isUnanswered={unansweredIds.has(question.id)}
              selected={selectedQuestionId === question.id}
              grade={gradesByQuestionId.get(question.id) ?? null}
              onSelect={onSelectQuestion}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
