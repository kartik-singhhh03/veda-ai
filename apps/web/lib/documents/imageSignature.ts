/** First 8 bytes as hex — safe for logs (no document content). */
export function imageHeaderHex(bytes: Uint8Array): string {
  return [...bytes.slice(0, 8)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function detectImageMime(bytes: Uint8Array): "image/png" | "image/jpeg" | null {
  if (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (bytes.byteLength >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "image/jpeg";
  }

  return null;
}

export function validatePageImage(bytes: Uint8Array, width: number, height: number): {
  ok: boolean;
  detectedMime: "image/png" | "image/jpeg" | null;
  headerHex: string;
  reason?: string;
} {
  const headerHex = imageHeaderHex(bytes);
  const detectedMime = detectImageMime(bytes);

  if (bytes.byteLength === 0) {
    return { ok: false, detectedMime, headerHex, reason: "empty image bytes" };
  }

  if (width <= 0 || height <= 0) {
    return { ok: false, detectedMime, headerHex, reason: "invalid dimensions" };
  }

  if (!detectedMime) {
    return {
      ok: false,
      detectedMime,
      headerHex,
      reason: "missing PNG/JPEG signature",
    };
  }

  return { ok: true, detectedMime, headerHex };
}
