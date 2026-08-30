import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EXTRACTION_MODEL_DEFAULT,
  GRADING_MODEL_DEFAULT,
  resolveGeminiModel,
} from "./resolveModel";

describe("resolveGeminiModel", () => {
  it("uses gemini-3.x defaults", () => {
    assert.equal(
      resolveGeminiModel(undefined, EXTRACTION_MODEL_DEFAULT),
      "gemini-3.5-flash-lite",
    );
    assert.equal(
      resolveGeminiModel(undefined, GRADING_MODEL_DEFAULT),
      "gemini-3.6-flash",
    );
  });

  it("accepts gemini-3.x env values", () => {
    assert.equal(
      resolveGeminiModel("gemini-3.6-flash", GRADING_MODEL_DEFAULT),
      "gemini-3.6-flash",
    );
    assert.equal(
      resolveGeminiModel("gemini-3.5-flash-lite", EXTRACTION_MODEL_DEFAULT),
      "gemini-3.5-flash-lite",
    );
  });

  it("ignores legacy 2.x env values for new AQ keys", () => {
    assert.equal(
      resolveGeminiModel("gemini-2.5-flash", EXTRACTION_MODEL_DEFAULT),
      "gemini-3.5-flash-lite",
    );
    assert.equal(
      resolveGeminiModel("gemini-3.5-flash-lite", GRADING_MODEL_DEFAULT),
      "gemini-3.5-flash-lite",
    );
  });
});
