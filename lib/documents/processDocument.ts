import { definePDFJSModule, getDocumentProxy, renderPageAsImage } from "unpdf";
import type { DocumentPage, ProcessedDocument } from "@/types/assessment";

const PDF_RENDER_SCALE = 1.5;

let pdfjsReady: Promise<void> | null = null;

async function ensurePdfjs(): Promise<void> {
  if (!pdfjsReady) {
    // Node must use the PDF.js legacy build. The modern build throws in Node
    // (e.g. "hashOriginal.toHex is not a function" / DOMMatrix issues).
    pdfjsReady = definePDFJSModule(
      () => import("pdfjs-dist/legacy/build/pdf.mjs"),
    ).then(() => undefined);
  }
  await pdfjsReady;
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
  // Lightweight header parse — avoids loading a full image decoder dependency.
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

  // JPEG SOF scan
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
    await ensurePdfjs();
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[document] PDF.js module init failed:", detail);
    throw new Error(`PDF engine failed to load: ${detail}`);
  }

  let pdf;
  try {
    pdf = await getDocumentProxy(bytes);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[document] PDF parse failed:", detail);
    throw new Error(`PDF parsing failed: ${detail}`);
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
          `[document] PDF render failed on page ${pageNumber}:`,
          detail,
        );
        if (/canvas|napi|native/i.test(detail)) {
          throw new Error(`Canvas/native module failed: ${detail}`);
        }
        throw new Error(`PDF rendering failed on page ${pageNumber}: ${detail}`);
      }

      const match = /^data:(image\/png|image\/jpeg);base64,(.+)$/.exec(dataUrl);
      if (!match) {
        throw new Error(`PDF rendering failed on page ${pageNumber}: invalid image output.`);
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
        // Keep the render-time base64 so Gemini/API do not re-encode.
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

    // Preserve already-classified messages; wrap only generic failures.
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
  return Buffer.from(page.bytes).toString("base64");
}
