import { jsonError, readUploadFile } from "@/lib/api/upload";
import { extractQuestions } from "@/lib/ai/extractQuestions";
import { geminiRuntimeSummary } from "@/lib/ai/config";
import { cloneBytes } from "@/lib/documents/bytesToBase64";
import { validatePageImage } from "@/lib/documents/imageSignature";
import { probePdfjsAssets } from "@/lib/documents/pdfjsServer";
import { processDocument } from "@/lib/documents/processDocument";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const started = Date.now();
  const gemini = geminiRuntimeSummary();
  console.info("[extract-questions] gemini config", {
    ...gemini,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
  });

  try {
    const formData = await request.formData();
    const file = await readUploadFile(formData, "file");

    const isPdfFile =
      file.mimeType === "application/pdf" ||
      file.fileName.toLowerCase().endsWith(".pdf");

    const uploadByteLength = file.bytes.byteLength;
    // Clone before PDF.js — it can detach the upload ArrayBuffer during parsing.
    const pdfFallbackBytes = isPdfFile ? cloneBytes(file.bytes) : undefined;

    const preprocessStarted = Date.now();
    const document = await processDocument(
      file.bytes,
      file.mimeType,
      file.fileName,
    );
    const preprocessMs = Date.now() - preprocessStarted;

    const pageDiagnostics = document.pages.map((page) => {
      const check = validatePageImage(page.bytes, page.width, page.height);
      return {
        page: page.pageNumber,
        bytes: page.bytes.byteLength,
        width: page.width,
        height: page.height,
        mimeType: page.mimeType,
        detectedMime: check.detectedMime,
        headerHex: check.headerHex,
        imageOk: check.ok,
      };
    });

    const pdfAssets = probePdfjsAssets();
    console.info("[extract-questions] preprocess", {
      sourceName: document.sourceName,
      pageCount: document.pageCount,
      uploadBytes: uploadByteLength,
      pdfAssets,
      pageDiagnostics,
      preprocessMs,
    });

    const extractStarted = Date.now();
    const questions = await extractQuestions({
      pages: document.pages,
      pdfFallback: pdfFallbackBytes
        ? { bytes: pdfFallbackBytes, pageCount: document.pageCount }
        : undefined,
    });
    const extractMs = Date.now() - extractStarted;

    console.info("[extract-questions] done", {
      sourceName: document.sourceName,
      pageCount: document.pageCount,
      questionCount: questions.length,
      geminiMs: extractMs,
      totalMs: Date.now() - started,
      input: "images",
    });

    return Response.json({
      questions,
      pageCount: document.pageCount,
      sourceName: document.sourceName,
    });
  } catch (error) {
    return jsonError(error);
  }
}
