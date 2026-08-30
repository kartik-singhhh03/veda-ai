/** Base64 from Uint8Array — safe when array is a subarray view (Vercel/serverless). */
export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(
    "base64",
  );
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
