import {
  convertModelBoxToRegion,
  isValidNormalizedRegion,
  type ModelBoundingBox,
} from "@/lib/ai/coordinates";
import type { AnswerCandidate, AnswerRegion } from "@/types/assessment";

export type AnswerValidationResult =
  | { ok: true; answers: AnswerCandidate[] }
  | { ok: false; error: string; details?: string[] };

type RawRegion = {
  page?: unknown;
  box_2d?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
};

function parseRegion(raw: RawRegion, fallbackPage: number): AnswerRegion | null {
  const page =
    typeof raw.page === "number" && Number.isInteger(raw.page) && raw.page >= 1
      ? raw.page
      : fallbackPage;

  if (Array.isArray(raw.box_2d) && raw.box_2d.length === 4) {
    const nums = raw.box_2d.map(Number);
    if (nums.every((n) => Number.isFinite(n))) {
      return convertModelBoxToRegion(page, nums as ModelBoundingBox);
    }
  }

  if (
    typeof raw.x === "number" &&
    typeof raw.y === "number" &&
    typeof raw.width === "number" &&
    typeof raw.height === "number"
  ) {
    return {
      page,
      x: raw.x,
      y: raw.y,
      width: raw.width,
      height: raw.height,
    };
  }

  return null;
}

export function validateAnswerCandidates(
  raw: unknown,
  pageCount: number,
): AnswerValidationResult {
  const details: string[] = [];

  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Answer extraction response was not an object." };
  }

  const answersUnknown = (raw as { answers?: unknown }).answers;
  if (!Array.isArray(answersUnknown)) {
    return { ok: false, error: "Answer extraction missing answers array." };
  }

  const answers: AnswerCandidate[] = [];
  const ids = new Set<string>();

  for (let index = 0; index < answersUnknown.length; index += 1) {
    const item = answersUnknown[index];
    if (!item || typeof item !== "object") {
      details.push(`Item ${index} is not an object.`);
      continue;
    }

    const record = item as Record<string, unknown>;
    const id =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : `answer-${index + 1}`;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    const confidence =
      typeof record.confidence === "number" ? record.confidence : NaN;

    let questionReference: string | null = null;
    if (typeof record.questionReference === "string") {
      const trimmed = record.questionReference.trim();
      questionReference = trimmed.length > 0 ? trimmed : null;
    } else if (record.questionReference === null) {
      questionReference = null;
    }

    if (!text) {
      details.push(`Item ${index}: empty answer text.`);
      continue;
    }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      details.push(`Item ${index}: confidence must be between 0 and 1.`);
      continue;
    }
    if (ids.has(id)) {
      details.push(`Duplicate answer id: ${id}`);
      continue;
    }

    const rawRegions = Array.isArray(record.regions) ? record.regions : [];
    if (rawRegions.length === 0) {
      details.push(`Item ${index}: missing regions.`);
      continue;
    }

    const regions: AnswerRegion[] = [];
    for (let r = 0; r < rawRegions.length; r += 1) {
      const regionRaw = rawRegions[r];
      if (!regionRaw || typeof regionRaw !== "object") {
        details.push(`Item ${index} region ${r}: invalid.`);
        continue;
      }

      const region = parseRegion(regionRaw as RawRegion, 1);
      if (!region) {
        details.push(`Item ${index} region ${r}: could not parse box.`);
        continue;
      }
      if (region.page < 1 || region.page > pageCount) {
        details.push(
          `Item ${index} region ${r}: page ${region.page} out of range 1..${pageCount}.`,
        );
        continue;
      }
      if (!isValidNormalizedRegion(region)) {
        details.push(
          `Item ${index} region ${r}: coordinates must be normalized 0..1.`,
        );
        continue;
      }

      // Reject whole-page highlights as low quality
      if (region.width >= 0.98 && region.height >= 0.98) {
        details.push(
          `Item ${index} region ${r}: region covers the entire page.`,
        );
        continue;
      }

      regions.push(region);
    }

    if (regions.length === 0) {
      details.push(`Item ${index}: no valid regions after conversion.`);
      continue;
    }

    ids.add(id);
    answers.push({
      id,
      questionReference,
      text,
      regions,
      confidence,
    });
  }

  if (details.length > 0 && answers.length === 0) {
    return {
      ok: false,
      error: "Answer extraction failed validation.",
      details,
    };
  }

  if (details.length > 0) {
    console.warn("Answer extraction validation warnings:", details);
  }

  return { ok: true, answers };
}
