import type { DocumentPage } from "@vedaai/types";

/** Serverless PDF renders are often blank while the original PDF bytes are fine. */
export function looksLikeBlankRenders(pages: DocumentPage[]): boolean {
  if (pages.length === 0) return true;

  const sizes = pages.map((page) => page.bytes.byteLength);
  const max = Math.max(...sizes);

  // Typical blank/minimal PNG for a full page on Vercel is ~7 KB.
  if (max < 12_000) return true;

  if (
    pages.length > 1 &&
    max < 20_000 &&
    sizes.every((size) => Math.abs(size - sizes[0]!) < 500)
  ) {
    return true;
  }

  return false;
}
