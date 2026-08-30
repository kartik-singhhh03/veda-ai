import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getDocumentProxy } from "unpdf";
import {
  ensurePdfjsServer,
  getPdfjsDocumentOptions,
} from "./pdfjsServer";

describe("ensurePdfjsServer", () => {
  it("loads PDFs without dynamic worker import", async () => {
    await ensurePdfjsServer();

    const res = await fetch(
      "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    );
    const bytes = new Uint8Array(await res.arrayBuffer());

    const pdf = await getDocumentProxy(bytes, getPdfjsDocumentOptions());
    assert.ok(pdf.numPages >= 1);
    await pdf.cleanup();
  });
});
