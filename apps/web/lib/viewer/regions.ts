import type { AnswerRegion } from "@vedaai/types";
import { isValidNormalizedRegion } from "../ai/coordinates";

export type PixelRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Convert a normalized AnswerRegion into pixel coordinates for overlay rendering.
 * Returns null when the region is invalid for the given page.
 */
export function regionToPixelRect(
  region: AnswerRegion,
  pageWidth: number,
  pageHeight: number,
): PixelRect | null {
  if (!isValidNormalizedRegion(region)) return null;
  if (pageWidth <= 0 || pageHeight <= 0) return null;

  return {
    left: region.x * pageWidth,
    top: region.y * pageHeight,
    width: region.width * pageWidth,
    height: region.height * pageHeight,
  };
}

/** Regions that belong to a specific 1-based page. */
export function filterRegionsForPage(
  regions: AnswerRegion[],
  page: number,
): AnswerRegion[] {
  return regions.filter(
    (region) => region.page === page && isValidNormalizedRegion(region),
  );
}

/** First page among answer regions, or null if none are valid. */
export function getFirstRegionPage(regions: AnswerRegion[]): number | null {
  const valid = regions.filter(isValidNormalizedRegion);
  if (valid.length === 0) return null;
  return Math.min(...valid.map((region) => region.page));
}

/** Sorted unique valid pages that contain regions for an answer. */
export function getRegionPages(regions: AnswerRegion[]): number[] {
  return [
    ...new Set(
      regions
        .filter(isValidNormalizedRegion)
        .map((region) => region.page),
    ),
  ].sort((a, b) => a - b);
}

/** Keep page within 1..totalPages. */
export function clampPage(page: number, totalPages: number): number {
  if (totalPages < 1) return 1;
  if (!Number.isFinite(page)) return 1;
  return Math.min(totalPages, Math.max(1, Math.trunc(page)));
}

/**
 * CSS percentage box for overlay rendering on a fitted page.
 * Shares the same coordinate system as a width:100% image.
 */
export function regionToPercentStyle(region: AnswerRegion): {
  left: string;
  top: string;
  width: string;
  height: string;
} | null {
  if (!isValidNormalizedRegion(region)) return null;
  return {
    left: `${region.x * 100}%`,
    top: `${region.y * 100}%`,
    width: `${region.width * 100}%`,
    height: `${region.height * 100}%`,
  };
}
