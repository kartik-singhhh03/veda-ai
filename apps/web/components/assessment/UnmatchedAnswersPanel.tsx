"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AnswerCandidate } from "@vedaai/types";

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
          <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-800">
            Unmatched
          </span>
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">
                    Ref: {candidate.questionReference ?? "none"}
                  </p>
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                    Unmatched
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Page{pages.length === 1 ? "" : "s"}:{" "}
                  {pages.length > 0 ? pages.join(", ") : "unknown"}
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
