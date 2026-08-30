"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import {
  clampPage,
  filterRegionsForPage,
  getRegionPages,
  regionToPercentStyle,
} from "@/lib/viewer/regions";
import type { Answer, AnswerRegion, ViewerPage } from "@/types/assessment";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5] as const;

type AnswerSheetViewerProps = {
  pages: ViewerPage[];
  currentPage: number;
  onPageChange: (page: number) => void;
  selectedAnswer: Answer | null;
  isUnanswered: boolean;
  selectedQuestionLabel: string | null;
};

function formatQuestionBadge(label: string | null): string | null {
  if (!label) return null;
  const trimmed = label.trim();
  if (!trimmed) return null;
  return /^q/i.test(trimmed) ? trimmed : `Q${trimmed}`;
}

export function AnswerSheetViewer({
  pages,
  currentPage,
  onPageChange,
  selectedAnswer,
  isUnanswered,
  selectedQuestionLabel,
}: AnswerSheetViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [errorPage, setErrorPage] = useState<number | null>(null);

  const totalPages = pages.length;
  const safePage = clampPage(currentPage, totalPages);
  const page = pages.find((item) => item.pageNumber === safePage) ?? null;
  const imageError = errorPage === safePage;
  const questionBadge = formatQuestionBadge(selectedQuestionLabel);

  const imageSrc = useMemo(() => {
    if (!page) return null;
    return `data:${page.mimeType};base64,${page.imageBase64}`;
  }, [page]);

  const pageRegions: AnswerRegion[] = useMemo(() => {
    if (!selectedAnswer || isUnanswered) return [];
    return filterRegionsForPage(selectedAnswer.regions, safePage);
  }, [selectedAnswer, isUnanswered, safePage]);

  const regionPages = useMemo(
    () => (selectedAnswer ? getRegionPages(selectedAnswer.regions) : []),
    [selectedAnswer],
  );

  function zoomOut() {
    const index = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);
    const next = index === -1 ? 1 : ZOOM_STEPS[Math.max(0, index - 1)];
    setZoom(next);
  }

  function zoomIn() {
    const index = ZOOM_STEPS.indexOf(zoom as (typeof ZOOM_STEPS)[number]);
    const next =
      index === -1 ? 1 : ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, index + 1)];
    setZoom(next);
  }

  function goToPage(next: number) {
    onPageChange(clampPage(next, totalPages));
  }

  let contextLine: string | null = null;
  if (isUnanswered) {
    contextLine = selectedQuestionLabel
      ? `Q ${selectedQuestionLabel} was not answered.`
      : "This question was not answered.";
  } else if (selectedAnswer && selectedAnswer.regions.length === 0) {
    contextLine = "Answer region unavailable.";
  } else if (selectedAnswer && regionPages.length > 1) {
    if (pageRegions.length === 0) {
      contextLine = selectedQuestionLabel
        ? `Q ${selectedQuestionLabel} — answer continues on page${regionPages.length === 1 ? "" : "s"} ${regionPages.join(", ")}.`
        : `Answer continues on page${regionPages.length === 1 ? "" : "s"} ${regionPages.join(", ")}.`;
    } else {
      contextLine = selectedQuestionLabel
        ? `Q ${selectedQuestionLabel} — answer continues on another page.`
        : "Answer continues on another page.";
    }
  } else if (selectedQuestionLabel && selectedAnswer) {
    contextLine = `Showing mapped answer for Q ${selectedQuestionLabel}.`;
  }

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Answer Sheet</h2>
      </div>

      {contextLine ? (
        <p role="status" className="mb-2 text-xs text-muted">
          {contextLine}
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#4a4a4a] px-2.5 py-2 text-xs text-white">
        <div className="flex items-center gap-0.5 rounded-full bg-[#efefef] px-1 py-0.5 text-foreground">
          <button
            type="button"
            onClick={zoomOut}
            className="rounded-full p-1.5 hover:bg-white disabled:opacity-40"
            disabled={zoom <= ZOOM_STEPS[0]}
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-11 text-center font-semibold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={zoomIn}
            className="rounded-full p-1.5 hover:bg-white disabled:opacity-40"
            disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-0.5 rounded-full bg-[#efefef] px-1 py-0.5 text-foreground">
          <button
            type="button"
            className="rounded-full p-1.5 hover:bg-white disabled:opacity-40"
            disabled={safePage <= 1}
            onClick={() => goToPage(safePage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[5.5rem] px-1 text-center font-semibold">
            Page {Math.min(safePage, Math.max(totalPages, 1))} of{" "}
            {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            className="rounded-full p-1.5 hover:bg-white disabled:opacity-40"
            disabled={safePage >= totalPages}
            onClick={() => goToPage(safePage + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Viewer owns document overflow — parents use min-w-0 so this does not escape. */}
      <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-2xl border border-border bg-[#ececec] p-3">
        {!page || !imageSrc ? (
          <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted">
            Answer sheet page is unavailable.
          </div>
        ) : imageError ? (
          <div className="flex h-full min-h-48 items-center justify-center text-sm text-muted">
            Could not load this page image.
          </div>
        ) : (
          <div
            className="relative mx-auto bg-white shadow-sm"
            style={{ width: `${zoom * 100}%` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={safePage}
              src={imageSrc}
              alt={`Answer sheet page ${safePage}`}
              className="block h-auto w-full"
              draggable={false}
              onError={() => setErrorPage(safePage)}
            />

            {pageRegions.map((region, index) => {
              const style = regionToPercentStyle(region);
              if (!style) return null;
              const showBadge = index === 0 && questionBadge;

              return (
                <div
                  key={`${region.page}-${index}-${region.x}-${region.y}`}
                  className="pointer-events-none absolute rounded-md border-2 border-success bg-success/20"
                  style={style}
                  aria-hidden
                >
                  {showBadge ? (
                    <span className="absolute -left-px -top-5 rounded-t-md bg-success px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white sm:text-[11px]">
                      {questionBadge}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
