import type { Question } from "@vedaai/types";

export type QuestionValidationResult =
  | { ok: true; questions: Question[] }
  | { ok: false; error: string; details?: string[] };

function parseOrder(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

export function validateQuestions(raw: unknown): QuestionValidationResult {
  const details: string[] = [];

  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      error: "Question extraction response was not an object.",
      details: [`typeof response: ${typeof raw}`],
    };
  }

  const questionsUnknown = (raw as { questions?: unknown }).questions;
  if (!Array.isArray(questionsUnknown)) {
    return {
      ok: false,
      error: "Question extraction missing questions array.",
      details: [`questions field: ${String(questionsUnknown)}`],
    };
  }

  if (questionsUnknown.length === 0) {
    return {
      ok: false,
      error: "No questions were extracted from the document.",
      details: ["Gemini returned an empty questions array."],
    };
  }

  const questions: Question[] = [];
  const ids = new Set<string>();
  const orders = new Set<number>();

  for (let index = 0; index < questionsUnknown.length; index += 1) {
    const item = questionsUnknown[index];
    if (!item || typeof item !== "object") {
      details.push(`Item ${index} is not an object.`);
      continue;
    }

    const record = item as Record<string, unknown>;
    const number =
      typeof record.number === "string"
        ? record.number.trim()
        : typeof record.number === "number" && Number.isFinite(record.number)
          ? String(record.number)
          : typeof record.id === "string"
            ? record.id.trim()
            : typeof record.id === "number" && Number.isFinite(record.id)
              ? String(record.id)
              : "";
    const text = typeof record.text === "string" ? record.text.trim() : "";
    const order = parseOrder(record.order);
    const idRaw =
      typeof record.id === "string" && record.id.trim()
        ? record.id.trim()
        : number;
    const maxMarks =
      typeof record.maxMarks === "number" && Number.isFinite(record.maxMarks)
        ? record.maxMarks
        : undefined;

    if (!number) details.push(`Item ${index}: missing number.`);
    if (!text) details.push(`Item ${index}: missing or empty text.`);
    if (!Number.isFinite(order)) details.push(`Item ${index}: missing order.`);

    if (!number || !text || !Number.isFinite(order)) continue;

    if (ids.has(idRaw)) {
      details.push(`Duplicate id: ${idRaw}`);
    }
    if (orders.has(order)) {
      details.push(`Duplicate order: ${order}`);
    }

    ids.add(idRaw);
    orders.add(order);

    questions.push({
      id: idRaw,
      number,
      text,
      order,
      ...(maxMarks !== undefined ? { maxMarks } : {}),
    });
  }

  if (details.length > 0) {
    return {
      ok: false,
      error: "Question extraction failed validation.",
      details,
    };
  }

  const sorted = [...questions].sort((a, b) => a.order - b.order);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].order < sorted[i - 1].order) {
      return {
        ok: false,
        error: "Question order is not monotonically increasing.",
        details: [`order ${sorted[i - 1].order} then ${sorted[i].order}`],
      };
    }
  }

  return { ok: true, questions: sorted };
}
