import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateQuestions } from "./validateQuestions";

describe("validateQuestions", () => {
  it("accepts order as a numeric string from Gemini", () => {
    const result = validateQuestions({
      questions: [
        {
          id: "1",
          number: "1",
          text: "What is photosynthesis?",
          order: "0",
        },
      ],
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.questions[0]?.order, 0);
    }
  });

  it("reports empty questions with details", () => {
    const result = validateQuestions({ questions: [] });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /no questions/i);
      assert.ok(result.details?.length);
    }
  });
});
