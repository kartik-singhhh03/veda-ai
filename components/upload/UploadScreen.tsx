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
    <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-5 sm:px-8 sm:py-6 lg:px-10 lg:py-3">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center lg:max-w-4xl">
        <h1 className="text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl lg:text-[1.75rem] lg:leading-tight xl:text-[1.875rem]">
          <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 lg:flex-nowrap">
            <span>Upload</span>
            <span className="whitespace-nowrap rounded-lg bg-accent-soft px-1.5 py-0.5 text-accent">
              Question Paper &amp; Answer Sheets
            </span>
          </span>
        </h1>

        <p className="mt-2 text-center text-sm text-muted lg:mt-1.5">
          Upload both files to get started
        </p>

        <UploadHero />

        <div className="mt-0.5 flex w-full flex-col gap-3 sm:flex-row sm:gap-4 lg:gap-4">
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
            className="mt-2 max-w-md rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-center text-sm font-medium text-danger lg:mt-2"
          >
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onStartMapping}
          disabled={!canStart}
          aria-disabled={!canStart}
          className={`mt-5 inline-flex items-center justify-center gap-2 rounded-full px-10 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 sm:mt-6 lg:mt-4 ${
            canStart
              ? "bg-button hover:bg-[#2b2b2b]"
              : "cursor-not-allowed bg-button-disabled"
          }`}
        >
          Start Mapping
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>

        <p className="mt-2 max-w-sm text-center text-xs leading-relaxed text-muted">
          Once both files are uploaded, you&apos;ll be able to map answers with
          questions
        </p>
      </div>
    </div>
  );
}
