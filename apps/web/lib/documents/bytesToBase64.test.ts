import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bytesToBase64, isPdfBytes } from "./bytesToBase64";

describe("bytesToBase64", () => {
  it("encodes subarray views correctly", () => {
    const buffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    const view = buffer.subarray(1, 5);
    assert.equal(bytesToBase64(view), "UERGLQ==");
    assert.equal(bytesToBase64(buffer), Buffer.from(buffer).toString("base64"));
  });
});

describe("isPdfBytes", () => {
  it("detects PDF magic header", () => {
    assert.equal(isPdfBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46])), true);
    assert.equal(
      isPdfBytes(new Uint8Array([0x0a, 0x25, 0x50, 0x44, 0x46])),
      true,
    );
    assert.equal(isPdfBytes(new Uint8Array([0x00, 0x50, 0x44, 0x46])), false);
  });
});
