import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAnswerRegion } from "@/lib/ai/coordinates";
import { normalizeAnswersPayload } from "@/lib/ai/parseGeminiJson";
import { validateAnswerCandidates } from "@/lib/ai/validateAnswers";

describe("parseAnswerRegion", () => {
  it("parses box2d camelCase on 0-1000 scale", () => {
    const region = parseAnswerRegion(
      { page: 1, box2d: [120, 450, 380, 820] },
      1,
    );
    assert.ok(region);
    assert.equal(region!.page, 1);
    assert.ok(region!.width > 0 && region!.height > 0);
    assert.ok(region!.width < 0.5);
  });

  it("parses bounding_box object", () => {
    const region = parseAnswerRegion(
      {
        page: 2,
        bounding_box: { y_min: 100, x_min: 200, y_max: 300, x_max: 500 },
      },
      1,
    );
    assert.equal(region?.page, 2);
    assert.ok(region && region.width > 0);
  });

  it("unwraps nested box_2d arrays from Gemini 3", () => {
    const region = parseAnswerRegion(
      { page: 1, box_2d: [[127, 120, 200, 802]] },
      1,
    );
    assert.ok(region);
    assert.equal(region!.page, 1);
    assert.ok(region!.width > 0 && region!.height > 0);
  });

  it("parses flat y_min/x_min fields on the region object", () => {
    const region = parseAnswerRegion(
      { page: 1, y_min: 120, x_min: 450, y_max: 380, x_max: 820 },
      1,
    );
    assert.ok(region);
    assert.ok(region!.width > 0);
  });
});

describe("validateAnswerCandidates", () => {
  it("accepts normalized Gemini 3-style answer payloads", () => {
    const raw = normalizeAnswersPayload({
      answers: [
        {
          id: "a1",
          questionReference: "1",
          text: "Four",
          confidence: 0.92,
          regions: [{ page: 1, box2d: ["120", "450", "380", "820"] }],
        },
      ],
    });

    const result = validateAnswerCandidates(raw, 2);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.answers.length, 1);
      assert.equal(result.answers[0]?.questionReference, "1");
    }
  });

  it("hoists answer-level box fields into regions", () => {
    const raw = normalizeAnswersPayload({
      answers: [
        {
          text: "Paris",
          confidence: "0.88",
          question_reference: "2",
          page: 1,
          box2d: [100, 150, 400, 700],
        },
      ],
    });

    const result = validateAnswerCandidates(raw, 1);
    assert.equal(result.ok, true);
  });
});
