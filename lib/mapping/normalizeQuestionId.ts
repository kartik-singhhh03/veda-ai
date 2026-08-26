/**
 * Normalize a human-written question reference to the same stable form as Question.id.
 * Returns null when the reference is clearly unusable.
 */
export function normalizeQuestionId(reference: string | null | undefined): string | null {
  if (reference == null) return null;

  let value = reference.trim().toLowerCase();
  if (!value) return null;

  // Strip common prefixes: "question", "q.", "q"
  value = value.replace(/^question\s*/i, "");
  value = value.replace(/^q\.?\s*/i, "");
  value = value.trim();
  if (!value) return null;

  // Unify separators around sub-parts: "11 (a)", "11-a", "11 a", "11.a"
  value = value.replace(/\s+/g, " ");
  value = value.replace(/^(\d+)\s*[-.\s]\s*([a-z])\b/i, "$1($2)");
  value = value.replace(/^(\d+)\s*\(\s*([a-z])\s*\)/i, "$1($2)");

  // Remove leftover spaces inside the id
  value = value.replace(/\s+/g, "");

  // Must start with a number; optional single-letter sub-part in parentheses
  const match = /^(\d+)(?:\(([a-z])\))?$/i.exec(value);
  if (!match) {
    // Also accept bare "11a" → "11(a)"
    const barePart = /^(\d+)([a-z])$/i.exec(value);
    if (!barePart) return null;
    return `${barePart[1]}(${barePart[2].toLowerCase()})`;
  }

  const number = match[1];
  const part = match[2]?.toLowerCase();
  return part ? `${number}(${part})` : number;
}
