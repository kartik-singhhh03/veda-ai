/** Independent copy — PDF.js may detach the original ArrayBuffer during parsing. */
export function cloneBytes(bytes: Uint8Array): Uint8Array {
  return Uint8Array.from(bytes);
}

/** Base64 from Uint8Array — copies bytes so detached ArrayBuffers are safe. */
export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(cloneBytes(bytes)).toString("base64");
}

/** Some PDFs have leading whitespace or a BOM before the %PDF header. */
export function findPdfHeaderOffset(bytes: Uint8Array, maxScan = 1024): number {
  const limit = Math.min(bytes.byteLength - 4, maxScan);
  for (let offset = 0; offset <= limit; offset += 1) {
    if (
      bytes[offset] === 0x25 &&
      bytes[offset + 1] === 0x50 &&
      bytes[offset + 2] === 0x44 &&
      bytes[offset + 3] === 0x46
    ) {
      return offset;
    }
  }
  return -1;
}

export function isPdfBytes(bytes: Uint8Array): boolean {
  return findPdfHeaderOffset(bytes) >= 0;
}
