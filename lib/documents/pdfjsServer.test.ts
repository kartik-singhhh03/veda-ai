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
    assert.equal(typeof root, "string");
    assert.ok(!/^\d+$/.test(root), "root must not be a bundled module id");
    assert.ok(existsSync(join(root, "legacy/build/pdf.worker.mjs")));
    assert.ok(existsSync(join(root, "standard_fonts")));
    assert.ok(existsSync(join(root, "cmaps")));
  });

  it("returns filesystem paths for standard fonts and cmaps", () => {
    const opts = getPdfjsDocumentOptions();
    assert.equal(typeof opts.standardFontDataUrl, "string");
    assert.equal(typeof opts.cMapUrl, "string");
    assert.doesNotMatch(opts.standardFontDataUrl ?? "", /^file:\/\//);
    assert.doesNotMatch(opts.cMapUrl ?? "", /^file:\/\//);
    assert.match(opts.standardFontDataUrl ?? "", /standard_fonts[/\\]$/);
    assert.match(opts.cMapUrl ?? "", /cmaps[/\\]$/);
    assert.equal(opts.disableFontFace, true);
    assert.equal(opts.cMapPacked, true);
  });
});
