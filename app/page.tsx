"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ExtractionDebugResult } from "@/components/processing/ExtractionDebugResult";
import { ProcessingState } from "@/components/processing/ProcessingState";
import { UploadScreen } from "@/components/upload/UploadScreen";
import {
  extractAnswersRequest,
  extractQuestionsRequest,
} from "@/lib/client/extraction";
import { validateUploadFile } from "@/lib/validation/file";
import type {
  AnswerCandidate,
  ProcessingStage,
  Question,
  UploadSlot,
} from "@/types/assessment";

function stageLabel(stage: ProcessingStage): string {
  switch (stage) {
    case "preparing":
      return "Preparing documents...";
    case "extracting_questions":
      return "Extracting questions...";
    case "extracting_answers":
      return "Extracting answers...";
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
  const [answerCandidates, setAnswerCandidates] = useState<AnswerCandidate[]>(
    [],
  );
  const [questionPageCount, setQuestionPageCount] = useState(0);
  const [answerPageCount, setAnswerPageCount] = useState(0);

  const isProcessing =
    processingStage === "preparing" ||
    processingStage === "extracting_questions" ||
    processingStage === "extracting_answers";
  const showResults = processingStage === "done";

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
    setAnswerCandidates([]);

    try {
      setProcessingStage("extracting_questions");
      const questionResult = await extractQuestionsRequest(questionPaper);
      setQuestions(questionResult.questions);
      setQuestionPageCount(questionResult.pageCount);

      setProcessingStage("extracting_answers");
      const answerResult = await extractAnswersRequest(answerSheet);
      setAnswerCandidates(answerResult.answers);
      setAnswerPageCount(answerResult.pageCount);

      setProcessingStage("done");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Extraction failed unexpectedly.";
      setError(message);
      setProcessingStage("error");
    }
  }

  function handleReset() {
    setProcessingStage("idle");
    setQuestions([]);
    setAnswerCandidates([]);
    setQuestionPageCount(0);
    setAnswerPageCount(0);
    setError(null);
  }

  return (
    <AppShell collapsedSidebar={isProcessing || showResults}>
      {isProcessing ? (
        <ProcessingState stageLabel={stageLabel(processingStage)} />
      ) : showResults ? (
        <ExtractionDebugResult
          questions={questions}
          answerCandidates={answerCandidates}
          questionPageCount={questionPageCount}
          answerPageCount={answerPageCount}
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
