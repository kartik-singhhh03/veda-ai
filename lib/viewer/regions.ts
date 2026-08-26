import type { AnswerRegion } from "../../types/assessment";
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
