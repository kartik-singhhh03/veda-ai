import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  getPdfjsDocumentOptions,
  resolvePdfjsDistRoot,
} from "./pdfjsServer";

describe("pdfjsServer paths", () => {
  it("resolves pdfjs-dist assets from node_modules", () => {
    const root = resolvePdfjsDistRoot();
    assert.ok(existsSync(join(root, "legacy/build/pdf.worker.mjs")));
    assert.ok(existsSync(join(root, "standard_fonts")));
    assert.ok(existsSync(join(root, "cmaps")));
  });

  it("returns file URLs for standard fonts and cmaps", () => {
    const opts = getPdfjsDocumentOptions();
    assert.match(opts.standardFontDataUrl ?? "", /^file:\/\//);
    assert.match(opts.cMapUrl ?? "", /^file:\/\//);
    assert.equal(opts.disableFontFace, true);
    assert.equal(opts.cMapPacked, true);
  });
});
