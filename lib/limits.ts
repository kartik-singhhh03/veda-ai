/**
 * Shared deployment-aware limits.
 *
 * Vercel Functions allow ~4.5 MB request and response bodies.
 * Multipart overhead + JSON encoding means the practical upload
 * ceiling must sit below that hard limit.
 */
export const VERCEL_BODY_LIMIT_BYTES = 4.5 * 1024 * 1024;

/** Comfortable upload ceiling under the Vercel request-body limit. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const MAX_UPLOAD_LABEL = "Max 4MB";

/**
 * Soft ceiling for total base64 page payload returned by extract-answers.
 * Leaves headroom under the 4.5 MB response limit for JSON wrapping.
 */
export const MAX_VIEWER_PAGES_BASE64_BYTES = 3.5 * 1024 * 1024;
