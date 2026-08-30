import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeQuestionsPayload,
  parseGeminiJson,
} from "./parseGeminiJson";

describe("parseGeminiJson", () => {
  it("parses raw JSON", () => {
    assert.deepEqual(parseGeminiJson('{"questions":[]}'), { questions: [] });
  });

  it("parses fenced JSON", () => {
    assert.deepEqual(
      parseGeminiJson('Here:\n```json\n{"questions":[{"id":"1"}]}\n```'),
      { questions: [{ id: "1" }] },
    );
  });
});

describe("normalizeQuestionsPayload", () => {
  it("maps question field to text", () => {
    const normalized = normalizeQuestionsPayload({
      questions: [{ id: "1", number: "1", question: "Define osmosis.", order: 0 }],
    }) as { questions: Array<{ text: string }> };
    assert.equal(normalized.questions[0].text, "Define osmosis.");
  });
});
