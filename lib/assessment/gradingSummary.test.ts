import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeGradingSummary,
  formatGradingCoverage,
} from "./gradingSummary";
import type { GradeResult } from "../../types/assessment";

describe("computeGradingSummary", () => {
  it("returns zeros when no grades exist", () => {
    const summary = computeGradingSummary(7, []);
    assert.deepEqual(summary, {
      questionCount: 7,
      gradedCount: 0,
      earnedScore: 0,
      possibleScore: 0,
      coverage: 0,
    });
  });

  it("summarizes partial grading without inventing missing grades", () => {
    const grades: GradeResult[] = [
      { score: 2, maxScore: 2, feedback: "ok" },
      { score: 2, maxScore: 2, feedback: "ok" },
    ];
    const summary = computeGradingSummary(7, grades);
    assert.equal(summary.gradedCount, 2);
    assert.equal(summary.earnedScore, 4);
    assert.equal(summary.possibleScore, 4);
    assert.equal(summary.coverage, 2 / 7);
    assert.equal(formatGradingCoverage(summary), "29%");
  });

  it("summarizes when all questions are graded", () => {
    const grades: GradeResult[] = [
      { score: 4, maxScore: 5, feedback: "a" },
      { score: 3, maxScore: 5, feedback: "b" },
      { score: 5, maxScore: 5, feedback: "c" },
    ];
    const summary = computeGradingSummary(3, grades);
    assert.equal(summary.gradedCount, 3);
    assert.equal(summary.earnedScore, 12);
    assert.equal(summary.possibleScore, 15);
    assert.equal(formatGradingCoverage(summary), "100%");
  });

  it("ignores grade entries with null score", () => {
    const grades: GradeResult[] = [
      { score: null, maxScore: 2, feedback: "pending" },
      { score: 1, maxScore: 2, feedback: "ok" },
    ];
    const summary = computeGradingSummary(5, grades);
    assert.equal(summary.gradedCount, 1);
    assert.equal(summary.earnedScore, 1);
    assert.equal(summary.possibleScore, 2);
  });
});
