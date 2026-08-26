import {
  SEMANTIC_HIGH_CONFIDENCE,
  SEMANTIC_MATCH_THRESHOLD,
} from "@/lib/mapping/constants";
import type { Answer, MappingMethod } from "@/types/assessment";

export type MappingReviewStatus =
  | "high_confidence"
  | "ai_mapped"
  | "review_recommended"
  | "unmatched";

export type MappingReviewLabel = {
  status: MappingReviewStatus;
  label: string;
};

/**
 * Teacher-facing mapping review status from existing Answer fields.
 * Does not change acceptance thresholds — display only.
 */
export function getMappingReviewStatus(
  answer: Pick<Answer, "status" | "confidence" | "mappingMethod"> | null | undefined,
): MappingReviewStatus | null {
  if (!answer) return null;

  if (answer.status === "unmatched") {
    return "unmatched";
  }

  if (answer.status !== "answered") {
    return null;
  }

  const method: MappingMethod | undefined = answer.mappingMethod;

  if (method === "exact") {
    return "high_confidence";
  }

  if (method === "semantic") {
    // Accepted semantic matches are always at least SEMANTIC_MATCH_THRESHOLD.
    if (
      answer.confidence >= SEMANTIC_MATCH_THRESHOLD &&
      answer.confidence < SEMANTIC_HIGH_CONFIDENCE
    ) {
      return "review_recommended";
    }
    return "ai_mapped";
  }

  // Legacy answers without mappingMethod: treat strong confidence as exact-like.
  if (answer.confidence >= SEMANTIC_HIGH_CONFIDENCE) {
    return "high_confidence";
  }
  if (answer.confidence >= SEMANTIC_MATCH_THRESHOLD) {
    return "review_recommended";
  }
  return "ai_mapped";
}

export function getMappingReviewLabel(
  answer: Pick<Answer, "status" | "confidence" | "mappingMethod"> | null | undefined,
): MappingReviewLabel | null {
  const status = getMappingReviewStatus(answer);
  if (!status) return null;

  switch (status) {
    case "high_confidence":
      return { status, label: "High confidence" };
    case "ai_mapped":
      return { status, label: "AI mapped" };
    case "review_recommended":
      return { status, label: "AI mapped · Review recommended" };
    case "unmatched":
      return { status, label: "Unmatched" };
  }
}
