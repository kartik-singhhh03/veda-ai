import { extractAnswers } from "@/lib/ai/extractAnswers";
import { jsonError, readUploadFile } from "@/lib/api/upload";
import { pageToBase64, processDocument } from "@/lib/documents/processDocument";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = await readUploadFile(formData, "file");
    const document = await processDocument(
      file.bytes,
      file.mimeType,
      file.fileName,
    );
    const answers = await extractAnswers(document.pages);

    // Reuse the same rendered pages used for extraction so highlights align.
    const pages = document.pages.map((page) => ({
      pageNumber: page.pageNumber,
      mimeType: page.mimeType,
      imageBase64: pageToBase64(page),
      width: page.width,
      height: page.height,
    }));

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
