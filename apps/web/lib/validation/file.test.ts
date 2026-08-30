import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "../limits";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_LABEL,
  validateUploadFile,
} from "./file";

describe("upload size validation", () => {
  it("keeps client and shared limits aligned under the Vercel body cap", () => {
    assert.equal(MAX_FILE_SIZE_BYTES, MAX_UPLOAD_BYTES);
    assert.equal(MAX_FILE_SIZE_LABEL, MAX_UPLOAD_LABEL);
    assert.ok(MAX_UPLOAD_BYTES < 4.5 * 1024 * 1024);
  });

  it("rejects files above the deployment-safe upload limit", () => {
    const file = {
      name: "large.pdf",
      type: "application/pdf",
      size: MAX_UPLOAD_BYTES + 1,
    } as File;

    const result = validateUploadFile(file);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /4MB|deployment limit/i);
    }
  });

  it("accepts files at the deployment-safe upload limit", () => {
    const file = {
      name: "ok.pdf",
      type: "application/pdf",
      size: MAX_UPLOAD_BYTES,
    } as File;

    assert.deepEqual(validateUploadFile(file), { ok: true });
  });
});
