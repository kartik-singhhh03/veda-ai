import { jsonError, readUploadFile } from "@/lib/api/upload";
import { extractQuestions } from "@/lib/ai/extractQuestions";
import { geminiRuntimeSummary } from "@/lib/ai/config";
import { isPdfBytes } from "@/lib/documents/bytesToBase64";
import { getPdfPageCount } from "@/lib/documents/pdfPageCount";
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

    // PDF question papers: send original bytes to Gemini (skip serverless canvas renders).
    if (isPdfFile) {
      const pdfBytes = new Uint8Array(file.bytes);
      const preprocessStarted = Date.now();
      let pageCount: number;

      try {
        pageCount = await getPdfPageCount(pdfBytes);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        console.error("[extract-questions] pdf page count failed", {
          sourceName: file.fileName,
          pdfBytes: pdfBytes.byteLength,
          hasPdfHeader: isPdfBytes(pdfBytes),
          detail,
        });
        throw error;
      }

      const preprocessMs = Date.now() - preprocessStarted;

      if (pageCount < 1) {
        throw new Error("The uploaded PDF has no pages.");
      }

      console.info("[extract-questions] pdf-only preprocess", {
        sourceName: file.fileName,
        pageCount,
        pdfBytes: pdfBytes.byteLength,
        hasPdfHeader: isPdfBytes(pdfBytes),
        pdfAssets: probePdfjsAssets(),
        preprocessMs,
      });

      const extractStarted = Date.now();
      const questions = await extractQuestions({
        pages: [],
        pdfFallback: { bytes: pdfBytes, pageCount },
      });
      const extractMs = Date.now() - extractStarted;

      console.info("[extract-questions] done", {
        sourceName: file.fileName,
        pageCount,
        questionCount: questions.length,
        geminiMs: extractMs,
        totalMs: Date.now() - started,
        input: "pdf-only",
      });

      return Response.json({
        questions,
        pageCount,
        sourceName: file.fileName,
      });
    }

    const preprocessStarted = Date.now();
    const document = await processDocument(
      file.bytes,
      file.mimeType,
      file.fileName,
    );
    const preprocessMs = Date.now() - preprocessStarted;

    const pdfAssets = probePdfjsAssets();
    console.info("[extract-questions] preprocess", {
      sourceName: document.sourceName,
      pageCount: document.pageCount,
      pdfAssets,
      pageSizes: document.pages.map((p) => ({
        page: p.pageNumber,
        bytes: p.bytes.byteLength,
        width: p.width,
        height: p.height,
      })),
      preprocessMs,
    });

    const extractStarted = Date.now();
    const questions = await extractQuestions({
      pages: document.pages,
      pdfFallback: isPdfFile
        ? { bytes: file.bytes, pageCount: document.pageCount }
        : undefined,
    });
    const extractMs = Date.now() - extractStarted;

    console.info("[extract-questions] done", {
      sourceName: document.sourceName,
      pageCount: document.pageCount,
      questionCount: questions.length,
      geminiMs: extractMs,
      totalMs: Date.now() - started,
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
