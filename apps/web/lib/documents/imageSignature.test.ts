import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectImageMime,
  imageHeaderHex,
  validatePageImage,
} from "./imageSignature";

describe("imageSignature", () => {
  it("detects PNG magic bytes", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(detectImageMime(png), "image/png");
    assert.equal(imageHeaderHex(png), "89504e470d0a1a0a");
  });

  it("validates page images with dimensions", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const result = validatePageImage(png, 800, 1200);
    assert.equal(result.ok, true);
    assert.equal(result.detectedMime, "image/png");
  });

  it("rejects empty bytes", () => {
    const result = validatePageImage(new Uint8Array(), 100, 100);
    assert.equal(result.ok, false);
    assert.match(result.reason ?? "", /empty/i);
  });
});
