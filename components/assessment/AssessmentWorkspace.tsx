"use client";

import { useEffect, useMemo, useState } from "react";
import { AnswerSheetViewer } from "@/components/assessment/AnswerSheetViewer";
import { QuestionList } from "@/components/assessment/QuestionList";
import { SelectedQuestionPanel } from "@/components/assessment/SelectedQuestionPanel";
import { UnmatchedAnswersPanel } from "@/components/assessment/UnmatchedAnswersPanel";
import {
  computeGradingSummary,
  formatGradingCoverage,
} from "@/lib/assessment/gradingSummary";
import { gradeAnswerRequest } from "@/lib/client/extraction";
import { clampPage, getFirstRegionPage } from "@/lib/viewer/regions";
import type {
  Answer,
  AnswerCandidate,
  GradeResult,
  Question,
  ViewerPage,
} from "@/types/assessment";

type AssessmentWorkspaceProps = {
  questions: Question[];
  answers: Answer[];
  unansweredQuestions: Question[];
  unmatchedCandidates: AnswerCandidate[];
  answerPages: ViewerPage[];
  onReset: () => void;
};

type MobileTab = "questions" | "answerSheet";

function findAnswerPage(
  answersByQuestionId: Map<string, Answer>,
  unansweredIds: Set<string>,
  questionId: string | null,
): number | null {
  if (!questionId || unansweredIds.has(questionId)) return null;
  const answer = answersByQuestionId.get(questionId);
  if (!answer) return null;
  return getFirstRegionPage(answer.regions);
}

export function AssessmentWorkspace({
  questions,
  answers,
  unansweredQuestions,
  unmatchedCandidates,
  answerPages,
  onReset,
}: AssessmentWorkspaceProps) {
  const answersByQuestionId = useMemo(() => {
    const map = new Map<string, Answer>();
    for (const answer of answers) {
      if (answer.status === "answered" && answer.questionId) {
        map.set(answer.questionId, answer);
      }
    }
    return map;
  }, [answers]);

  const unansweredIds = useMemo(
    () => new Set(unansweredQuestions.map((question) => question.id)),
    [unansweredQuestions],
  );

  const mappedCount = answers.filter((a) => a.status === "answered").length;
  const initialQuestionId = questions[0]?.id ?? null;

  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    initialQuestionId,
  );
  const [currentPage, setCurrentPage] = useState(() => {
    return (
      findAnswerPage(answersByQuestionId, unansweredIds, initialQuestionId) ?? 1
    );
  });
  const [mobileTab, setMobileTab] = useState<MobileTab>("questions");
  const [grades, setGrades] = useState<Record<string, GradeResult>>({});
  const [gradingQuestionId, setGradingQuestionId] = useState<string | null>(
    null,
  );
  const [gradingError, setGradingError] = useState<string | null>(null);

  const gradesByQuestionId = useMemo(() => {
    const map = new Map<string, GradeResult>();
    for (const [id, grade] of Object.entries(grades)) {
      map.set(id, grade);
    }
    return map;
  }, [grades]);

  // Clamp for display/navigation without resetting selectedQuestionId.
  const safeCurrentPage = clampPage(currentPage, answerPages.length);

  const selectedQuestion =
    questions.find((question) => question.id === selectedQuestionId) ?? null;
  const selectedAnswer = selectedQuestionId
    ? answersByQuestionId.get(selectedQuestionId) ?? null
    : null;
  const isUnanswered = selectedQuestionId
    ? unansweredIds.has(selectedQuestionId)
    : false;

  const gradingSummary = useMemo(
    () => computeGradingSummary(questions.length, Object.values(grades)),
    [questions.length, grades],
  );

  // On-demand grading with cache — do not re-request for the same question.
  useEffect(() => {
    if (!selectedQuestionId || !selectedQuestion) return;
    if (selectedQuestionId in grades) return;

    let cancelled = false;

    async function runGrade() {
      setGradingQuestionId(selectedQuestionId);
      setGradingError(null);
      try {
        const result = await gradeAnswerRequest(
          selectedQuestion!,
          isUnanswered ? null : selectedAnswer,
        );
        if (!cancelled) {
          setGrades((prev) => ({
            ...prev,
            [selectedQuestionId!]: result.grade,
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setGradingError(
            error instanceof Error ? error.message : "Grading failed.",
          );
        }
      } finally {
        if (!cancelled) {
          setGradingQuestionId(null);
        }
      }
    }

    void runGrade();

    return () => {
      cancelled = true;
    };
    // intentionally omit `grades` object identity; we only gate on the cached entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestionId, selectedQuestion, selectedAnswer, isUnanswered]);

  function handleSelectQuestion(questionId: string) {
    setSelectedQuestionId(questionId);
    setGradingError(null);

    // Jump only for answered questions with regions. Unanswered: do not jump.
    const page = findAnswerPage(
      answersByQuestionId,
      unansweredIds,
      questionId,
    );
    if (page != null) {
      setCurrentPage(clampPage(page, answerPages.length));
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setMobileTab("answerSheet");
    }
  }

  function handlePageChange(page: number) {
    // Manual navigation must not clear selectedQuestionId.
    setCurrentPage(clampPage(page, answerPages.length));
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <h1 className="text-lg font-semibold text-foreground">Assessment</h1>
          <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
            <span className="rounded-full bg-surface px-2.5 py-1 text-foreground">
              {questions.length} Questions
            </span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
              {mappedCount} Answered
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
              {unansweredQuestions.length} Unanswered
            </span>
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">
              {unmatchedCandidates.length} Unmatched
            </span>
          </div>
          {gradingSummary.gradedCount > 0 ? (
            <div className="flex flex-wrap gap-1.5 text-[11px] font-medium">
              <span className="rounded-full bg-surface px-2.5 py-1 text-foreground">
                Graded: {gradingSummary.gradedCount} /{" "}
                {gradingSummary.questionCount}
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                Score: {gradingSummary.earnedScore} /{" "}
                {gradingSummary.possibleScore}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-muted">
                Coverage: {formatGradingCoverage(gradingSummary)}
              </span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        >
          Upload again
        </button>
      </div>

      <UnmatchedAnswersPanel unmatchedCandidates={unmatchedCandidates} />

      <div
        className="flex rounded-full bg-surface p-1 lg:hidden"
        role="tablist"
        aria-label="Assessment views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "questions"}
          onClick={() => setMobileTab("questions")}
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            mobileTab === "questions" ? "bg-button text-white" : "text-muted"
          }`}
        >
          Questions
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileTab === "answerSheet"}
          onClick={() => setMobileTab("answerSheet")}
          className={`flex-1 rounded-full px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
            mobileTab === "answerSheet" ? "bg-button text-white" : "text-muted"
          }`}
        >
          Answer Sheet
        </button>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-2">
        <div
          className={`min-h-0 min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm ${
            mobileTab === "questions" ? "flex" : "hidden"
          } lg:flex`}
        >
          <SelectedQuestionPanel
            question={selectedQuestion}
            answer={selectedAnswer}
            isUnanswered={isUnanswered}
            grade={
              selectedQuestionId
                ? gradesByQuestionId.get(selectedQuestionId) ?? null
                : null
            }
            grading={gradingQuestionId === selectedQuestionId}
            gradingError={gradingError}
          />
          <QuestionList
            questions={questions}
            answersByQuestionId={answersByQuestionId}
            unansweredIds={unansweredIds}
            gradesByQuestionId={gradesByQuestionId}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={handleSelectQuestion}
          />
        </div>

        <div
          className={`min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm ${
            mobileTab === "answerSheet" ? "flex" : "hidden"
          } lg:flex`}
        >
          <AnswerSheetViewer
            pages={answerPages}
            currentPage={safeCurrentPage}
            onPageChange={handlePageChange}
            selectedAnswer={selectedAnswer}
            isUnanswered={isUnanswered}
            selectedQuestionLabel={selectedQuestion?.number ?? null}
          />
        </div>
      </div>
    </div>
  );
}
