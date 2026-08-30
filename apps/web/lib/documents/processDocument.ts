import { bytesToBase64 } from "@/lib/documents/bytesToBase64";
import { getDocumentProxy, renderPageAsImage } from "unpdf";
import {
  ensurePdfjsServer,
  getPdfjsDocumentOptions,
  probeCanvasModule,
  probePdfjsAssets,
} from "@/lib/documents/pdfjsServer";
import type { DocumentPage, ProcessedDocument } from "@vedaai/types";

const PDF_RENDER_SCALE = 1.5;

export type DocumentErrorCode =
  | "PDFJS_ERROR"
  | "PDF_PARSE_ERROR"
  | "PDF_RENDER_ERROR"
  | "CANVAS_LOAD_ERROR";

export class DocumentProcessingError extends Error {
  code: DocumentErrorCode;

  constructor(code: DocumentErrorCode, message: string) {
    super(message);
    this.name = "DocumentProcessingError";
    this.code = code;
  }
}

function isPdf(mimeType: string, fileName: string): boolean {
  return (
    mimeType === "application/pdf" ||
    fileName.toLowerCase().endsWith(".pdf")
  );
}

function normalizeImageMime(
  mimeType: string,
): "image/png" | "image/jpeg" {
  if (mimeType === "image/png") return "image/png";
  return "image/jpeg";
}

async function readImageDimensions(
  bytes: Uint8Array,
  mimeType: "image/png" | "image/jpeg",
): Promise<{ width: number; height: number }> {
  if (mimeType === "image/png") {
    if (bytes.length < 24) {
      throw new Error("Invalid PNG file.");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      width: view.getUint32(16),
      height: view.getUint32(20),
    };
  }

  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      return {
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const length = view.getUint16(offset + 2);
    offset += 2 + length;
  }

  return { width: 0, height: 0 };
}

async function processImageDocument(
  bytes: Uint8Array,
  mimeType: string,
  sourceName: string,
): Promise<ProcessedDocument> {
  try {
    const imageMime = normalizeImageMime(mimeType);
    const { width, height } = await readImageDimensions(bytes, imageMime);

    const page: DocumentPage = {
      pageNumber: 1,
      mimeType: imageMime,
      bytes,
      width,
      height,
    };

    return {
      sourceName,
      pageCount: 1,
      pages: [page],
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Image processing failed: ${detail}`);
  }
}

async function processPdfDocument(
  bytes: Uint8Array,
  sourceName: string,
): Promise<ProcessedDocument> {
  try {
    await ensurePdfjsServer();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[document] PDFJS_ERROR:", detail);
    throw new DocumentProcessingError(
      "PDFJS_ERROR",
      `PDF engine failed to load: ${detail}`,
    );
  }

  const canvasOk = await probeCanvasModule();
  if (!canvasOk) {
    console.error("[document] CANVAS_LOAD_ERROR: @napi-rs/canvas unavailable");
    throw new DocumentProcessingError(
      "CANVAS_LOAD_ERROR",
      "Canvas/native module failed: @napi-rs/canvas could not be loaded.",
    );
  }

  const pdfAssets = probePdfjsAssets();
  if (!pdfAssets.standardFonts || !pdfAssets.cmaps) {
    console.warn("[document] PDFJS_ASSETS_MISSING:", pdfAssets);
  }

  let pdf;
  try {
    pdf = await getDocumentProxy(bytes, getPdfjsDocumentOptions());
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[document] PDF_PARSE_ERROR:", {
      sourceName,
      byteLength: bytes.byteLength,
      detail,
    });
    throw new DocumentProcessingError(
      "PDF_PARSE_ERROR",
      `PDF parsing failed: ${detail}`,
    );
  }

  const pageCount = pdf.numPages;
  const pages: DocumentPage[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      let dataUrl: string;
      try {
        dataUrl = (await renderPageAsImage(pdf, pageNumber, {
          canvasImport: () => import("@napi-rs/canvas"),
          scale: PDF_RENDER_SCALE,
          toDataURL: true,
        })) as string;
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[document] PDF_RENDER_ERROR page ${pageNumber}:`,
          detail,
        );
        if (/canvas|napi|native/i.test(detail)) {
          throw new DocumentProcessingError(
            "CANVAS_LOAD_ERROR",
            `Canvas/native module failed: ${detail}`,
          );
        }
        throw new DocumentProcessingError(
          "PDF_RENDER_ERROR",
          `PDF rendering failed on page ${pageNumber}: ${detail}`,
        );
      }

      const match = /^data:(image\/png|image\/jpeg);base64,(.+)$/.exec(dataUrl);
      if (!match) {
        throw new DocumentProcessingError(
          "PDF_RENDER_ERROR",
          `PDF rendering failed on page ${pageNumber}: invalid image output.`,
        );
      }

      const mimeType = match[1] as "image/png" | "image/jpeg";
      const imageBase64 = match[2];
      const pageBytes = Uint8Array.from(Buffer.from(imageBase64, "base64"));
      const pdfPage = await pdf.getPage(pageNumber);
      const viewport = pdfPage.getViewport({ scale: PDF_RENDER_SCALE });

      pages.push({
        pageNumber,
        mimeType,
        bytes: pageBytes,
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        imageBase64,
      });
    }
  } finally {
    await pdf.cleanup();
  }

  return {
    sourceName,
    pageCount,
    pages,
  };
}

/**
 * Convert an uploaded PDF or image into ordered page images.
 * PDFs become one image per page; images become a single page.
 */
export async function processDocument(
  bytes: Uint8Array,
  mimeType: string,
  sourceName: string,
): Promise<ProcessedDocument> {
  try {
    if (isPdf(mimeType, sourceName)) {
      return await processPdfDocument(bytes, sourceName);
    }

    if (
      mimeType === "image/png" ||
      mimeType === "image/jpeg" ||
      mimeType === "image/jpg" ||
      sourceName.toLowerCase().match(/\.(png|jpe?g)$/)
    ) {
      return await processImageDocument(bytes, mimeType || "image/jpeg", sourceName);
    }

    throw new Error("Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG.");
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith("Unsupported")) {
      throw error;
    }

    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[document] processDocument failed:", {
      sourceName,
      mimeType,
      byteLength: bytes.byteLength,
      detail,
    });

    if (
      /PDF parsing failed|PDF rendering failed|PDF engine failed|Canvas\/native|Image processing failed/i.test(
        detail,
      )
    ) {
      throw error instanceof Error ? error : new Error(detail);
    }

    throw new Error(`Document processing failed: ${detail}`);
  }
}

export function pageToBase64(page: DocumentPage): string {
  if (page.imageBase64) return page.imageBase64;
  return bytesToBase64(page.bytes);
}
