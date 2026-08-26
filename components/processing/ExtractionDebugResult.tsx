"use client";

import type { AnswerCandidate, Question } from "@/types/assessment";

type ExtractionDebugResultProps = {
  questions: Question[];
  answerCandidates: AnswerCandidate[];
  questionPageCount: number;
  answerPageCount: number;
  onReset: () => void;
};

export function ExtractionDebugResult({
  questions,
  answerCandidates,
  questionPageCount,
  answerPageCount,
  onReset,
}: ExtractionDebugResultProps) {
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Phase 2 Extraction Results
          </h1>
          <p className="mt-1 text-sm text-muted">
            Developer preview — mapping UI comes in Phase 3.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full bg-button px-5 py-2 text-sm font-medium text-white hover:bg-[#2b2b2b]"
        >
          Upload again
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            Questions ({questions.length}) · {questionPageCount} page
            {questionPageCount === 1 ? "" : "s"}
          </h2>
          <ul className="mt-3 max-h-[60vh] space-y-3 overflow-auto pr-1">
            {questions.map((question) => (
              <li
                key={question.id}
                className="rounded-xl border border-border bg-surface p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Q {question.number}</span>
                  <span className="text-xs text-muted">
                    order {question.order}
                    {question.maxMarks !== undefined
                      ? ` · ${question.maxMarks} marks`
                      : ""}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-foreground/90">
                  {question.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-foreground">
            Answer candidates ({answerCandidates.length}) · {answerPageCount}{" "}
            page{answerPageCount === 1 ? "" : "s"}
          </h2>
          <ul className="mt-3 max-h-[60vh] space-y-3 overflow-auto pr-1">
            {answerCandidates.map((answer) => (
              <li
                key={answer.id}
                className="rounded-xl border border-border bg-surface p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">
                    Ref: {answer.questionReference ?? "null"}
                  </span>
                  <span className="text-xs text-muted">
                    conf {(answer.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-foreground/90">
                  {answer.text}
                </p>
                <div className="mt-2 space-y-1">
                  {answer.regions.map((region, index) => (
                    <p key={`${answer.id}-${index}`} className="text-xs text-muted">
                      page {region.page} · x={region.x.toFixed(3)} y=
                      {region.y.toFixed(3)} w={region.width.toFixed(3)} h=
                      {region.height.toFixed(3)}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
