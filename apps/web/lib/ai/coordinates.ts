import type { AnswerRegion } from "@vedaai/types";

/**
 * Gemini object-detection style box: [ymin, xmin, ymax, xmax]
 * usually normalized to 0–1000.
 */
export type ModelBoundingBox = [number, number, number, number];

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Parse Gemini box arrays — strings, nested objects, alternate field names. */
export function coerceModelBoundingBox(value: unknown): ModelBoundingBox | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return coerceModelBoundingBox(JSON.parse(trimmed));
    } catch {
      const parts = trimmed.split(/[,\s]+/).map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        return parts as ModelBoundingBox;
      }
      return null;
    }
  }

  if (Array.isArray(value)) {
    if (
      value.length === 1 &&
      Array.isArray(value[0]) &&
      (value[0] as unknown[]).length === 4
    ) {
      return coerceModelBoundingBox(value[0]);
    }
    if (value.length === 4) {
      const nums = value.map((entry) => toFiniteNumber(entry));
      if (nums.every((n): n is number => n !== null)) {
        return nums as ModelBoundingBox;
      }
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const ymin = toFiniteNumber(
      record.ymin ?? record.y_min ?? record.yMin ?? record.top,
    );
    const xmin = toFiniteNumber(
      record.xmin ?? record.x_min ?? record.xMin ?? record.left,
    );
    const ymax = toFiniteNumber(
      record.ymax ?? record.y_max ?? record.yMax ?? record.bottom,
    );
    const xmax = toFiniteNumber(
      record.xmax ?? record.x_max ?? record.xMax ?? record.right,
    );
    if (
      ymin !== null &&
      xmin !== null &&
      ymax !== null &&
      xmax !== null
    ) {
      return [ymin, xmin, ymax, xmax];
    }
  }

  return null;
}

function boxKeys(record: Record<string, unknown>): unknown[] {
  return [
    record.box_2d,
    record.box2d,
    record.box_2D,
    record.bounding_box,
    record.boundingBox,
    record.bbox,
    record.box,
  ];
}

function normalizeRectField(value: unknown, scale: number): number | null {
  const num = toFiniteNumber(value);
  if (num === null) return null;
  return scale > 1 ? num / scale : num;
}

/**
 * Parse one Gemini region payload into AnswerRegion.
 * Accepts box_2d, box2d, xywh (0–1 or 0–1000), or a bare 4-number array.
 */
export function parseAnswerRegion(
  raw: unknown,
  fallbackPage: number,
): AnswerRegion | null {
  if (Array.isArray(raw) && raw.length === 4) {
    const box = coerceModelBoundingBox(raw);
    return box ? convertModelBoxToRegion(fallbackPage, box) : null;
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const pageNum = toFiniteNumber(record.page);
  const page =
    pageNum !== null && Number.isInteger(pageNum) && pageNum >= 1
      ? pageNum
      : fallbackPage;

  const flatBox = coerceModelBoundingBox(record);
  if (flatBox) {
    return convertModelBoxToRegion(page, flatBox);
  }

  for (const candidate of boxKeys(record)) {
    const box = coerceModelBoundingBox(candidate);
    if (box) {
      return convertModelBoxToRegion(page, box);
    }
  }

  const x = toFiniteNumber(record.x);
  const y = toFiniteNumber(record.y);
  const width = toFiniteNumber(record.width);
  const height = toFiniteNumber(record.height);
  if (x !== null && y !== null && width !== null && height !== null) {
    const scale = looksLikeThousandScale([x, y, width, height]) ? 1000 : 1;
    return {
      page,
      x: normalizeRectField(x, scale) ?? 0,
      y: normalizeRectField(y, scale) ?? 0,
      width: normalizeRectField(width, scale) ?? 0,
      height: normalizeRectField(height, scale) ?? 0,
    };
  }

  const left = toFiniteNumber(record.left ?? record.l);
  const top = toFiniteNumber(record.top ?? record.t);
  const right = toFiniteNumber(record.right ?? record.r);
  const bottom = toFiniteNumber(record.bottom ?? record.b);
  if (left !== null && top !== null && right !== null && bottom !== null) {
    const scale = looksLikeThousandScale([left, top, right, bottom]) ? 1000 : 1;
    const xMin = Math.min(left, right) / scale;
    const yMin = Math.min(top, bottom) / scale;
    return {
      page,
      x: clamp01(xMin),
      y: clamp01(yMin),
      width: clamp01(Math.abs(right - left) / scale),
      height: clamp01(Math.abs(bottom - top) / scale),
    };
  }

  const nested = findNestedBoundingBox(record);
  if (nested) {
    return convertModelBoxToRegion(page, nested);
  }

  return null;
}

function findNestedBoundingBox(
  record: Record<string, unknown>,
  depth = 0,
): ModelBoundingBox | null {
  if (depth > 4) return null;

  for (const candidate of boxKeys(record)) {
    const box = coerceModelBoundingBox(candidate);
    if (box) return box;
  }

  for (const key of ["spatial", "location", "geometry", "rect", "area"]) {
    const nested = record[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const box = findNestedBoundingBox(nested as Record<string, unknown>, depth + 1);
      if (box) return box;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const box = findNestedBoundingBox(value as Record<string, unknown>, depth + 1);
      if (box) return box;
    }
  }

  return null;
}

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
