import { extractQuestions } from "@/lib/ai/extractQuestions";
import { jsonError, readUploadFile } from "@/lib/api/upload";
import { processDocument } from "@/lib/documents/processDocument";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const started = Date.now();
  try {
    const formData = await request.formData();
    const file = await readUploadFile(formData, "file");

    const preprocessStarted = Date.now();
    const document = await processDocument(
      file.bytes,
      file.mimeType,
      file.fileName,
    );
    const preprocessMs = Date.now() - preprocessStarted;

    const extractStarted = Date.now();
    const questions = await extractQuestions(document.pages);
    const extractMs = Date.now() - extractStarted;

    console.info("[extract-questions]", {
      sourceName: document.sourceName,
      pageCount: document.pageCount,
      questionCount: questions.length,
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

    return Response.json({
      questions,
      pageCount: document.pageCount,
      sourceName: document.sourceName,
    });
  } catch (error) {
    return jsonError(error);
  }
}
