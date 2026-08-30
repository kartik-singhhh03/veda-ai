import { getDocumentProxy } from "unpdf";
import {
  ensurePdfjsServer,
  getPdfjsDocumentOptions,
} from "@/lib/documents/pdfjsServer";

/** Read PDF page count without rendering (used before Gemini PDF extraction). */
export async function getPdfPageCount(bytes: Uint8Array): Promise<number> {
  await ensurePdfjsServer();
  const pdf = await getDocumentProxy(bytes, getPdfjsDocumentOptions());
  try {
    return pdf.numPages;
  } finally {
    await pdf.cleanup();
  }
}
