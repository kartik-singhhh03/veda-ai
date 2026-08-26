"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AnswerCandidate } from "@/types/assessment";

type UnmatchedAnswersPanelProps = {
  unmatchedCandidates: AnswerCandidate[];
};

export function UnmatchedAnswersPanel({
  unmatchedCandidates,
}: UnmatchedAnswersPanelProps) {
  const [open, setOpen] = useState(false);

  if (unmatchedCandidates.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-amber-900">
          {unmatchedCandidates.length} unmatched answer
          {unmatchedCandidates.length === 1 ? "" : "s"}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-amber-800" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-800" />
        )}
      </button>

      {open ? (
        <ul className="mt-3 space-y-2">
          {unmatchedCandidates.map((candidate) => {
            const pages = [
              ...new Set(candidate.regions.map((region) => region.page)),
            ].sort((a, b) => a - b);

            return (
              <li
                key={candidate.id}
                className="rounded-xl border border-amber-200 bg-white p-3 text-sm"
              >
                <p className="font-medium text-foreground">
                  Ref: {candidate.questionReference ?? "none"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Page{pages.length === 1 ? "" : "s"} {pages.join(", ")}
                </p>
                <p className="mt-2 line-clamp-3 text-foreground/90">
                  {candidate.text}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
