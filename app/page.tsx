"use client";

import { useState } from "react";
import { AssessmentWorkspace } from "@/components/assessment/AssessmentWorkspace";
import { AppShell } from "@/components/layout/AppShell";
import { ProcessingState } from "@/components/processing/ProcessingState";
import { UploadScreen } from "@/components/upload/UploadScreen";
import {
  extractAnswersRequest,
  extractQuestionsRequest,
  mapAnswersRequest,
} from "@/lib/client/extraction";
import { validateUploadFile } from "@/lib/validation/file";
import type {
  Answer,
  AnswerCandidate,
  ProcessingStage,
  Question,
  UploadSlot,
  ViewerPage,
} from "@/types/assessment";

function stageLabel(stage: ProcessingStage): string {
  switch (stage) {
    case "preparing":
      return "Preparing documents...";
    case "extracting_questions":
      return "Extracting questions...";
    case "extracting_answers":
      return "Extracting answers...";
    case "mapping_answers":
      return "Mapping answers...";
    default:
      return "Extracting...";
  }
}

export default function HomePage() {
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [answerSheet, setAnswerSheet] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processingStage, setProcessingStage] =
    useState<ProcessingStage>("idle");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<Question[]>(
    [],
  );
  const [unmatchedCandidates, setUnmatchedCandidates] = useState<
    AnswerCandidate[]
  >([]);
  const [answerPages, setAnswerPages] = useState<ViewerPage[]>([]);

  const isProcessing =
    processingStage === "preparing" ||
    processingStage === "extracting_questions" ||
    processingStage === "extracting_answers" ||
    processingStage === "mapping_answers";
  const showWorkspace = processingStage === "done";

  function handleSelect(slot: UploadSlot, file: File) {
    const result = validateUploadFile(file);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setError(null);
    if (slot === "questionPaper") {
      setQuestionPaper(file);
    } else {
      setAnswerSheet(file);
    }
  }

  function handleRemove(slot: UploadSlot) {
    setError(null);
    if (slot === "questionPaper") {
      setQuestionPaper(null);
    } else {
      setAnswerSheet(null);
    }
  }

  async function handleStartMapping() {
    if (!questionPaper || !answerSheet) {
      setError("Please upload both the question paper and answer sheet.");
      return;
    }

    setError(null);
    setQuestions([]);
    setAnswers([]);
    setUnansweredQuestions([]);
    setUnmatchedCandidates([]);
    setAnswerPages([]);

    try {
      setProcessingStage("extracting_questions");
      const questionResult = await extractQuestionsRequest(questionPaper);
      setQuestions(questionResult.questions);

      setProcessingStage("extracting_answers");
      const answerResult = await extractAnswersRequest(answerSheet);
      setAnswerPages(answerResult.pages ?? []);

      setProcessingStage("mapping_answers");
      const mapping = await mapAnswersRequest(
        questionResult.questions,
        answerResult.answers,
      );

      setAnswers(mapping.answers);
      setUnansweredQuestions(mapping.unansweredQuestions);
      setUnmatchedCandidates(mapping.unmatchedCandidates);
      setProcessingStage("done");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Processing failed unexpectedly.";
      setError(message);
      setProcessingStage("error");
    }
  }

  function handleReset() {
    setProcessingStage("idle");
    setQuestions([]);
    setAnswers([]);
    setUnansweredQuestions([]);
    setUnmatchedCandidates([]);
    setAnswerPages([]);
    setError(null);
  }

  return (
    <AppShell collapsedSidebar={isProcessing || showWorkspace}>
      {isProcessing ? (
        <ProcessingState stageLabel={stageLabel(processingStage)} />
      ) : showWorkspace ? (
        <AssessmentWorkspace
          questions={questions}
          answers={answers}
          unansweredQuestions={unansweredQuestions}
          unmatchedCandidates={unmatchedCandidates}
          answerPages={answerPages}
          onReset={handleReset}
        />
      ) : (
        <UploadScreen
          questionPaper={questionPaper}
          answerSheet={answerSheet}
          error={error}
          onSelectQuestionPaper={(file) => handleSelect("questionPaper", file)}
          onSelectAnswerSheet={(file) => handleSelect("answerSheet", file)}
          onRemoveQuestionPaper={() => handleRemove("questionPaper")}
          onRemoveAnswerSheet={() => handleRemove("answerSheet")}
          onStartMapping={() => {
            void handleStartMapping();
          }}
        />
      )}
    </AppShell>
  );
}
