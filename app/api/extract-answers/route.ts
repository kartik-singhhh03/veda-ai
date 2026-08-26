import { extractAnswers } from "@/lib/ai/extractAnswers";
import { jsonError, readUploadFile } from "@/lib/api/upload";
import { processDocument } from "@/lib/documents/processDocument";

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

    return Response.json({
      answers,
      pageCount: document.pageCount,
      sourceName: document.sourceName,
    });
  } catch (error) {
    return jsonError(error);
  }
}
