import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildQuestionIndex } from "./buildQuestionIndex";
import { normalizeQuestionId } from "./normalizeQuestionId";
import type { Question } from "@vedaai/types";

describe("semantic mapping constraints (deterministic guards)", () => {
  const questions: Question[] = [
    { id: "1", number: "1", text: "One", order: 0 },
    { id: "7", number: "7", text: "Seven", order: 1 },
  ];

  it("rejects nonexistent question ids against the question index", () => {
    const index = buildQuestionIndex(questions);
    const invented = normalizeQuestionId("99");
    assert.equal(invented, "99");
    assert.equal(index.has(invented!), false);
  });

  it("accepts only known ids from the extracted question list", () => {
    const index = buildQuestionIndex(questions);
    assert.ok(index.has("7"));
    assert.equal(index.get("7")?.id, "7");
  });
});
