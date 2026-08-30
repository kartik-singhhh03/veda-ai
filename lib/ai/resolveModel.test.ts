import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveGeminiModel } from "./resolveModel";

describe("resolveGeminiModel", () => {
  it("uses gemini-2.5-flash by default", () => {
    assert.equal(resolveGeminiModel(undefined), "gemini-2.5-flash");
  });

  it("accepts allowlisted models", () => {
    assert.equal(resolveGeminiModel("gemini-2.0-flash"), "gemini-2.0-flash");
  });

  it("ignores unsupported gemini-3.x env values from stale Vercel config", () => {
    assert.equal(
      resolveGeminiModel("gemini-3.6-flash"),
      "gemini-2.5-flash",
    );
    assert.equal(
      resolveGeminiModel("gemini-3.5-flash-lite"),
      "gemini-2.5-flash",
    );
  });
});
