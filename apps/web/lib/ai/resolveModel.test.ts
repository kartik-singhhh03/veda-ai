import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EXTRACTION_MODEL_DEFAULT,
  GRADING_MODEL_DEFAULT,
  resolveExtractionModel,
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
  });
});

describe("resolveExtractionModel", () => {
  it("defaults to flash-lite", () => {
    assert.equal(resolveExtractionModel(undefined), "gemini-3.5-flash-lite");
  });

  it("redirects gemini-3.6-flash to flash-lite for extraction", () => {
    assert.equal(
      resolveExtractionModel("gemini-3.6-flash"),
      "gemini-3.5-flash-lite",
    );
  });
});
