import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeQuestionId } from "./normalizeQuestionId";
import { mapAnswersExact } from "./mapAnswers";
import { findUnansweredQuestions } from "./findUnansweredQuestions";
import type { AnswerCandidate, Question } from "@vedaai/types";

describe("normalizeQuestionId", () => {
  it('normalizes "Q1" to "1"', () => {
    assert.equal(normalizeQuestionId("Q1"), "1");
  });

  it('normalizes "Q. 1" to "1"', () => {
    assert.equal(normalizeQuestionId("Q. 1"), "1");
  });

  it('normalizes "Question 1" to "1"', () => {
    assert.equal(normalizeQuestionId("Question 1"), "1");
  });

  it('preserves "11(a)"', () => {
    assert.equal(normalizeQuestionId("11(a)"), "11(a)");
  });

  it('normalizes "11 (a)" to "11(a)"', () => {
    assert.equal(normalizeQuestionId("11 (a)"), "11(a)");
  });

  it('normalizes "Q11(a)" to "11(a)"', () => {
    assert.equal(normalizeQuestionId("Q11(a)"), "11(a)");
  });

  it('does not convert "11(b)" to "11(a)"', () => {
    assert.equal(normalizeQuestionId("11(b)"), "11(b)");
    assert.notEqual(normalizeQuestionId("11(b)"), "11(a)");
  });

  it("returns null for unusable references", () => {
    assert.equal(normalizeQuestionId(null), null);
    assert.equal(normalizeQuestionId(""), null);
    assert.equal(normalizeQuestionId("???"), null);
  });
});

describe("exact mapping and unanswered detection", () => {
  const questions: Question[] = [
    { id: "1", number: "1", text: "Q1 text", order: 0 },
    { id: "2", number: "2", text: "Q2 text", order: 1 },
    { id: "3", number: "3", text: "Q3 text", order: 2 },
    { id: "11(a)", number: "11(a)", text: "Part a", order: 3 },
    { id: "11(b)", number: "11(b)", text: "Part b", order: 4 },
  ];

  it("maps out-of-order answers by stable ids", () => {
    const candidates: AnswerCandidate[] = [
      {
        id: "a-7",
        questionReference: "Q11(b)",
        text: "answer b",
        confidence: 0.9,
        regions: [{ page: 2, x: 0.1, y: 0.2, width: 0.5, height: 0.1 }],
      },
      {
        id: "a-1",
        questionReference: "Question 1",
        text: "answer 1",
        confidence: 0.95,
        regions: [{ page: 1, x: 0.1, y: 0.1, width: 0.5, height: 0.1 }],
      },
      {
        id: "a-11a",
        questionReference: "11 (a)",
        text: "answer a",
        confidence: 0.92,
        regions: [
          { page: 2, x: 0.1, y: 0.4, width: 0.5, height: 0.1 },
          { page: 3, x: 0.1, y: 0.1, width: 0.5, height: 0.2 },
        ],
      },
    ];

    const { answers, unresolvedCandidates } = mapAnswersExact(
      questions,
      candidates,
    );

    assert.equal(unresolvedCandidates.length, 0);
    assert.equal(answers.length, 3);

    const byId = new Map(answers.map((a) => [a.id, a]));
    assert.equal(byId.get("a-1")?.questionId, "1");
    assert.equal(byId.get("a-11a")?.questionId, "11(a)");
    assert.equal(byId.get("a-7")?.questionId, "11(b)");
    assert.equal(byId.get("a-11a")?.regions.length, 2);
    assert.equal(byId.get("a-11a")?.mappingMethod, "exact");
  });

  it("keeps unmatched reference 99 unresolved for later handling", () => {
    const candidates: AnswerCandidate[] = [
      {
        id: "a-99",
        questionReference: "Q99",
        text: "orphan",
        confidence: 0.8,
        regions: [{ page: 3, x: 0.1, y: 0.1, width: 0.4, height: 0.1 }],
      },
    ];

    const { answers, unresolvedCandidates } = mapAnswersExact(
      questions,
      candidates,
    );
    assert.equal(answers.length, 0);
    assert.equal(unresolvedCandidates.length, 1);
    assert.equal(unresolvedCandidates[0].questionReference, "Q99");
  });

  it("detects unanswered questions deterministically", () => {
    const mapped = mapAnswersExact(questions, [
      {
        id: "a-1",
        questionReference: "1",
        text: "yes",
        confidence: 1,
        regions: [{ page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.1 }],
      },
      {
        id: "a-3",
        questionReference: "3",
        text: "yes",
        confidence: 1,
        regions: [{ page: 1, x: 0.1, y: 0.5, width: 0.2, height: 0.1 }],
      },
    ]).answers;

    const unanswered = findUnansweredQuestions(questions, mapped);
    assert.deepEqual(
      unanswered.map((q) => q.id).sort(),
      ["11(a)", "11(b)", "2"],
    );
  });

  it("preserves multi-page regions intact", () => {
    const regions = [
      { page: 2, x: 0.12, y: 0.41, width: 0.72, height: 0.17 },
      { page: 3, x: 0.11, y: 0.09, width: 0.73, height: 0.25 },
    ];
    const { answers } = mapAnswersExact(questions, [
      {
        id: "multi",
        questionReference: "2",
        text: "long answer",
        confidence: 0.88,
        regions,
      },
    ]);

    assert.equal(answers[0].regions.length, 2);
    assert.deepEqual(answers[0].regions, regions);
    assert.notEqual(answers[0].regions, regions);
  });
});
