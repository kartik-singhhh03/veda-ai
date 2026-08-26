"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import {
  filterRegionsForPage,
  regionToPixelRect,
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
  const page = pages.find((item) => item.pageNumber === currentPage) ?? null;
  const imageError = errorPage === currentPage;

  const imageSrc = useMemo(() => {
    if (!page) return null;
    return `data:${page.mimeType};base64,${page.imageBase64}`;
  }, [page]);

  const pageRegions: AnswerRegion[] = useMemo(() => {
    if (!selectedAnswer || isUnanswered) return [];
    return filterRegionsForPage(selectedAnswer.regions, currentPage);
  }, [selectedAnswer, isUnanswered, currentPage]);

  const baseWidth = page?.width ?? 0;
  const baseHeight = page?.height ?? 0;
  const displayWidth = baseWidth * zoom;
  const displayHeight = baseHeight * zoom;

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

  let statusMessage: string | null = null;
  if (isUnanswered) {
    statusMessage = "This question was not answered.";
  } else if (selectedAnswer && selectedAnswer.regions.length === 0) {
    statusMessage = "Answer region unavailable.";
  } else if (
    selectedAnswer &&
    selectedAnswer.regions.length > 0 &&
    pageRegions.length === 0
  ) {
    const pagesWithRegions = [
      ...new Set(selectedAnswer.regions.map((region) => region.page)),
    ].sort((a, b) => a - b);
    statusMessage = `This answer continues on page${pagesWithRegions.length === 1 ? "" : "s"} ${pagesWithRegions.join(", ")}.`;
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Answer Sheet</h2>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface px-1 py-0.5">
            <button
              type="button"
              onClick={zoomOut}
              className="rounded-full p-1 hover:bg-card disabled:opacity-40"
              disabled={zoom <= ZOOM_STEPS[0]}
              aria-label="Zoom out"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-10 text-center font-medium text-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={zoomIn}
              className="rounded-full p-1 hover:bg-card disabled:opacity-40"
              disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
              aria-label="Zoom in"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            type="button"
            className="rounded-md border border-border bg-card px-2 py-1 disabled:opacity-40"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span>
            Page {Math.min(currentPage, Math.max(totalPages, 1))} of{" "}
            {Math.max(totalPages, 1)}
          </span>
          <button
            type="button"
            className="rounded-md border border-border bg-card px-2 py-1 disabled:opacity-40"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>

      {statusMessage ? (
        <p
          role="status"
          className="mb-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted"
        >
          {selectedQuestionLabel ? (
            <span className="font-medium text-foreground">
              Q {selectedQuestionLabel}:{" "}
            </span>
          ) : null}
          {statusMessage}
        </p>
      ) : selectedQuestionLabel ? (
        <p className="mb-2 text-xs text-muted">
          Showing mapped answer for{" "}
          <span className="font-medium text-foreground">
            Q {selectedQuestionLabel}
          </span>
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-border bg-[#ececec] p-3">
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
            style={{
              width: displayWidth || undefined,
              height: displayHeight || undefined,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={currentPage}
              src={imageSrc}
              alt={`Answer sheet page ${currentPage}`}
              className="block h-auto w-full"
              draggable={false}
              onError={() => setErrorPage(currentPage)}
            />

            {pageRegions.map((region, index) => {
              const rect = regionToPixelRect(region, baseWidth, baseHeight);
              if (!rect) return null;

              return (
                <div
                  key={`${region.page}-${index}-${region.x}-${region.y}`}
                  className="pointer-events-none absolute rounded-md border-2 border-success bg-success/20"
                  style={{
                    left: rect.left * zoom,
                    top: rect.top * zoom,
                    width: rect.width * zoom,
                    height: rect.height * zoom,
                  }}
                  aria-hidden
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
