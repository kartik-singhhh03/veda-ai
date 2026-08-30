import { extractQuestions } from "@/lib/ai/extractQuestions";
import { jsonError, readUploadFile } from "@/lib/api/upload";
import { getPdfPageCount } from "@/lib/documents/pdfPageCount";
import { processDocument } from "@/lib/documents/processDocument";

export const runtime = "nodejs";
export const maxDuration = 60;

function isPdf(mimeType: string, fileName: string): boolean {
  return (
    mimeType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf")
  );
}

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const formData = await request.formData();
    const file = await readUploadFile(formData, "file");

    let questions;
    let pageCount: number;
    let preprocessMs = 0;

    if (isPdf(file.mimeType, file.fileName)) {
      // Send the original PDF to Gemini — rendered page images can be blank on
      // serverless when pdfjs font assets are missing from the function bundle.
      const preprocessStarted = Date.now();
      pageCount = await getPdfPageCount(file.bytes);
      preprocessMs = Date.now() - preprocessStarted;

      const extractStarted = Date.now();
      questions = await extractQuestions({
        kind: "pdf",
        bytes: file.bytes,
        pageCount,
      });
      const extractMs = Date.now() - extractStarted;

      console.info("[extract-questions]", {
        sourceName: file.fileName,
        pageCount,
        questionCount: questions.length,
        input: "pdf",
        preprocessMs,
        geminiMs: extractMs,
        totalMs: Date.now() - started,
      });
    } else {
      const preprocessStarted = Date.now();
      const document = await processDocument(
        file.bytes,
        file.mimeType,
        file.fileName,
      );
      preprocessMs = Date.now() - preprocessStarted;
      pageCount = document.pageCount;

      const extractStarted = Date.now();
      questions = await extractQuestions({
        kind: "pages",
        pages: document.pages,
      });
      const extractMs = Date.now() - extractStarted;

      console.info("[extract-questions]", {
        sourceName: document.sourceName,
        pageCount: document.pageCount,
        questionCount: questions.length,
        input: "images",
        pageSizes: document.pages.map((p) => ({
          page: p.pageNumber,
          bytes: p.bytes.byteLength,
          width: p.width,
          height: p.height,
        })),
        preprocessMs,
        geminiMs: extractMs,
        totalMs: Date.now() - started,
      });
    }

    return Response.json({
      questions,
      pageCount,
      sourceName: file.fileName,
    });
  } catch (error) {
    return jsonError(error);
  }
}
