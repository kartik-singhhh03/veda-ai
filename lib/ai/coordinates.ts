import type { AnswerRegion } from "@/types/assessment";

/**
 * Gemini object-detection style box: [ymin, xmin, ymax, xmax]
 * usually normalized to 0–1000.
 */
export type ModelBoundingBox = [number, number, number, number];

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function looksLikeThousandScale(values: number[]): boolean {
  return values.some((value) => value > 1.5);
}

/**
 * Convert a model bounding box into our internal AnswerRegion.
 * Isolated so model-specific coordinate systems stay out of the rest of the app.
 */
export function convertModelBoxToRegion(
  page: number,
  box: ModelBoundingBox,
): AnswerRegion {
  const [a, b, c, d] = box;
  const scale = looksLikeThousandScale([a, b, c, d]) ? 1000 : 1;

  const yMin = a / scale;
  const xMin = b / scale;
  const yMax = c / scale;
  const xMax = d / scale;

  const x = clamp01(Math.min(xMin, xMax));
  const y = clamp01(Math.min(yMin, yMax));
  const width = clamp01(Math.abs(xMax - xMin));
  const height = clamp01(Math.abs(yMax - yMin));

  return { page, x, y, width, height };
}

export function isValidNormalizedRegion(region: AnswerRegion): boolean {
  return (
    Number.isInteger(region.page) &&
    region.page >= 1 &&
    region.x >= 0 &&
    region.x <= 1 &&
    region.y >= 0 &&
    region.y <= 1 &&
    region.width >= 0 &&
    region.width <= 1 &&
    region.height >= 0 &&
    region.height <= 1 &&
    region.x + region.width <= 1.0001 &&
    region.y + region.height <= 1.0001
  );
}
