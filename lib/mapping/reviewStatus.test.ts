import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getMappingReviewLabel,
  getMappingReviewStatus,
} from "./reviewStatus";
import type { Answer } from "../../types/assessment";

function answered(
  partial: Partial<Answer> & Pick<Answer, "mappingMethod" | "confidence">,
): Answer {
  return {
    id: "a1",
    questionId: "1",
    text: "answer",
    regions: [{ page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.2 }],
    status: "answered",
    ...partial,
  };
}

describe("getMappingReviewStatus", () => {
  it("marks exact mappings as high confidence (never review-needed)", () => {
    const answer = answered({
      mappingMethod: "exact",
      confidence: 0.4,
    });
    assert.equal(getMappingReviewStatus(answer), "high_confidence");
    assert.equal(getMappingReviewLabel(answer)?.label, "High confidence");
  });

  it("marks high-confidence semantic mappings as AI mapped", () => {
    const answer = answered({
      mappingMethod: "semantic",
      confidence: 0.95,
    });
    assert.equal(getMappingReviewStatus(answer), "ai_mapped");
    assert.equal(getMappingReviewLabel(answer)?.label, "AI mapped");
  });

  it("marks low-confidence semantic mappings as review recommended", () => {
    const answer = answered({
      mappingMethod: "semantic",
      confidence: 0.8,
    });
    assert.equal(getMappingReviewStatus(answer), "review_recommended");
    assert.equal(
      getMappingReviewLabel(answer)?.label,
      "AI mapped · Review recommended",
    );
  });

  it("marks unmatched answers", () => {
    const answer: Answer = {
      id: "u1",
      questionId: null,
      text: "orphan",
      regions: [{ page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.2 }],
      confidence: 0.9,
      status: "unmatched",
    };
    assert.equal(getMappingReviewStatus(answer), "unmatched");
  });
});
