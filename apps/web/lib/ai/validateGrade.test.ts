import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateGradeResult } from "../ai/validateGrade";
import type { Question } from "@vedaai/types";

describe("validateGradeResult", () => {
  const questionWithMarks: Question = {
    id: "1",
    number: "1",
    text: "Explain photosynthesis.",
    order: 0,
    maxMarks: 5,
  };

  const questionWithoutMarks: Question = {
    id: "2",
    number: "2",
    text: "Discuss.",
    order: 1,
  };

  it("accepts a valid score within maxMarks", () => {
    const result = validateGradeResult(
      { score: 4, maxScore: 5, feedback: "Good partial answer." },
      questionWithMarks,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.grade.score, 4);
      assert.equal(result.grade.maxScore, 5);
    }
  });

  it("rejects score greater than maxMarks", () => {
    const result = validateGradeResult(
      { score: 6, maxScore: 5, feedback: "Too high." },
      questionWithMarks,
    );
    assert.equal(result.ok, false);
  });

  it("rejects negative scores", () => {
    const result = validateGradeResult(
      { score: -1, maxScore: 5, feedback: "Bad." },
      questionWithMarks,
    );
    assert.equal(result.ok, false);
  });

  it("requires null score when maxMarks is missing", () => {
    const invalid = validateGradeResult(
      { score: 2, maxScore: 2, feedback: "Nope." },
      questionWithoutMarks,
    );
    assert.equal(invalid.ok, false);

    const valid = validateGradeResult(
      { score: null, maxScore: null, feedback: "Qualitative only." },
      questionWithoutMarks,
    );
    assert.equal(valid.ok, true);
  });
});
