import {
  convertModelBoxToRegion,
  isValidNormalizedRegion,
  parseAnswerRegion,
} from "@/lib/ai/coordinates";
import type { AnswerCandidate, AnswerRegion } from "@vedaai/types";

export type AnswerValidationResult =
  | { ok: true; answers: AnswerCandidate[] }
  | { ok: false; error: string; details?: string[] };

function coerceConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

function parseRegion(raw: unknown, fallbackPage: number): AnswerRegion | null {
  return parseAnswerRegion(raw, fallbackPage);
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
    const confidence = coerceConfidence(record.confidence);

    let questionReference: string | null = null;
    const refRaw =
      record.questionReference ??
      record.question_reference ??
      record.reference;
    if (typeof refRaw === "string") {
      const trimmed = refRaw.trim();
      questionReference = trimmed.length > 0 ? trimmed : null;
    } else if (refRaw === null) {
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
      const region = parseRegion(regionRaw, 1);
      if (!region) {
        details.push(
          `Item ${index} region ${r}: could not parse box (${JSON.stringify(regionRaw).slice(0, 120)}).`,
        );
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

  // re-export for tests — removed duplicate exports