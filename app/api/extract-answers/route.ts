import { ApiError, jsonError, readUploadFile } from "@/lib/api/upload";
import { extractAnswers } from "@/lib/ai/extractAnswers";
import { pageToBase64, processDocument } from "@/lib/documents/processDocument";
import { MAX_VIEWER_PAGES_BASE64_BYTES } from "@/lib/limits";

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
    const answers = await extractAnswers(document.pages);
    const extractMs = Date.now() - extractStarted;

    // Reuse the same rendered pages used for extraction so highlights align.
    const pages = document.pages.map((page) => ({
      pageNumber: page.pageNumber,
      mimeType: page.mimeType,
      imageBase64: pageToBase64(page),
      width: page.width,
      height: page.height,
    }));

    const base64Bytes = pages.reduce(
      (sum, page) => sum + page.imageBase64.length,
      0,
    );
    if (base64Bytes > MAX_VIEWER_PAGES_BASE64_BYTES) {
      throw new ApiError(
        "Answer sheet page images are too large for the current deployment response limit. Try a shorter PDF or lower-resolution scan.",
        413,
      );
    }

    console.info("[extract-answers]", {
      sourceName: document.sourceName,
      pageCount: document.pageCount,
      preprocessMs,
      geminiMs: extractMs,
      totalMs: Date.now() - started,
      viewerBase64KB: Math.round(base64Bytes / 1024),
    });

    return Response.json({
      answers,
      pageCount: document.pageCount,
      sourceName: document.sourceName,
      pages,
    });
  } catch (error) {
    return jsonError(error);
  }
}
