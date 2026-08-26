"use client";

import { ArrowRight } from "lucide-react";
import { UploadCard } from "@/components/upload/UploadCard";
import { UploadHero } from "@/components/upload/UploadHero";

type UploadScreenProps = {
  questionPaper: File | null;
  answerSheet: File | null;
  error: string | null;
  onSelectQuestionPaper: (file: File) => void;
  onSelectAnswerSheet: (file: File) => void;
  onRemoveQuestionPaper: () => void;
  onRemoveAnswerSheet: () => void;
  onStartMapping: () => void;
};

export function UploadScreen({
  questionPaper,
  answerSheet,
  error,
  onSelectQuestionPaper,
  onSelectAnswerSheet,
  onRemoveQuestionPaper,
  onRemoveAnswerSheet,
  onStartMapping,
}: UploadScreenProps) {
  const canStart = Boolean(questionPaper && answerSheet);

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center">
        <h1 className="max-w-xl text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[2rem] lg:leading-tight">
          Upload{" "}
          <span className="rounded-lg bg-accent-soft px-1.5 py-0.5 text-accent">
            Question Paper &amp; Answer Sheets
          </span>
        </h1>

        <p className="mt-3 hidden text-sm text-muted sm:block">
          Upload both files to get started
        </p>

        <UploadHero />

        <div className="mt-2 flex w-full flex-col gap-4 sm:mt-1 sm:flex-row sm:gap-5">
          <UploadCard
            label="Upload"
            accentLabel="Question Paper"
            file={questionPaper}
            onSelect={onSelectQuestionPaper}
            onRemove={onRemoveQuestionPaper}
          />
          <UploadCard
            label="Upload"
            accentLabel="Answer Sheet"
            file={answerSheet}
            onSelect={onSelectAnswerSheet}
            onRemove={onRemoveAnswerSheet}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-4 text-center text-sm font-medium text-danger"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onStartMapping}
          disabled={!canStart}
          className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-10 py-3 text-sm font-semibold text-white transition-colors sm:mt-10 ${
            canStart
              ? "bg-button hover:bg-[#2b2b2b]"
              : "cursor-not-allowed bg-button-disabled"
          }`}
        >
          Start Mapping
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-3 max-w-sm text-center text-xs leading-relaxed text-muted sm:mt-4">
          Once both files are uploaded, you&apos;ll able to map answers with
          questions
        </p>
      </div>
    </div>
  );
}
