/** Strip markdown fences and parse JSON from Gemini text output. */
export function parseGeminiJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new SyntaxError("Empty response");
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // ```json ... ``` wrapper
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }

    // First {...} object in the response
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }

    throw new SyntaxError("No JSON object found");
  }
}

/** Normalize common Gemini field variants before validation. */
export function normalizeQuestionsPayload(raw: unknown): unknown {
  if (Array.isArray(raw)) {
    return { questions: raw.map(normalizeQuestionItem) };
  }

  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const record = raw as Record<string, unknown>;
  const questionsRaw =
    record.questions ??
    record.items ??
    record.data ??
    record.examQuestions;

  if (!Array.isArray(questionsRaw)) {
    return raw;
  }

  return {
    questions: questionsRaw.map((item, index) => normalizeQuestionItem(item, index)),
  };
}

function normalizeQuestionItem(item: unknown, index = 0): unknown {
  if (!item || typeof item !== "object") {
    return item;
  }

  const record = item as Record<string, unknown>;
  const textValue =
    record.text ??
    record.question ??
    record.questionText ??
    record.body ??
    record.content;
  const numberValue =
    record.number ?? record.label ?? record.id ?? record.questionNumber;
  const orderValue = record.order ?? record.sequence ?? index;
  const idValue = record.id ?? numberValue ?? String(index + 1);

  return {
    ...record,
    id: stringifyField(idValue),
    number: stringifyField(numberValue),
    text: typeof textValue === "string" ? textValue : stringifyField(textValue),
    order: orderValue,
    ...(record.maxMarks !== undefined ? { maxMarks: record.maxMarks } : {}),
  };
}

function stringifyField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function coerceConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return NaN;
}

function hasBoxFields(record: Record<string, unknown>): boolean {
  return (
    record.box_2d !== undefined ||
    record.box2d !== undefined ||
    record.bounding_box !== undefined ||
    record.boundingBox !== undefined ||
    record.bbox !== undefined ||
    record.box !== undefined ||
    (record.x !== undefined &&
      record.y !== undefined &&
      record.width !== undefined &&
      record.height !== undefined)
  );
}

function normalizeRegionItem(region: unknown): unknown {
  if (Array.isArray(region) && region.length === 4) {
    return { page: 1, box_2d: region };
  }
  if (!region || typeof region !== "object") {
    return region;
  }
  const record = region as Record<string, unknown>;
  const box =
    record.box_2d ??
    record.box2d ??
    record.bounding_box ??
    record.boundingBox ??
    record.bbox ??
    record.box;
  return {
    ...record,
    page: record.page ?? 1,
    box_2d: box ?? record.box_2d,
  };
}

/** Normalize common Gemini answer field variants before validation. */
export function normalizeAnswersPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const record = raw as Record<string, unknown>;
  const answersRaw =
    record.answers ?? record.items ?? record.candidates ?? record.data;

  if (!Array.isArray(answersRaw)) {
    return raw;
  }

  return {
    answers: answersRaw.map((item, index) => {
      if (!item || typeof item !== "object") {
        return item;
      }

      const answer = item as Record<string, unknown>;
      const questionReference =
        answer.questionReference ??
        answer.question_reference ??
        answer.reference ??
        answer.label;

      let regionsUnknown: unknown[] = [];
      const regionsRaw = answer.regions ?? answer.region ?? answer.boxes;
      if (Array.isArray(regionsRaw)) {
        regionsUnknown = regionsRaw;
      }

      if (regionsUnknown.length === 0 && hasBoxFields(answer)) {
        regionsUnknown = [
          normalizeRegionItem({
            page: answer.page ?? 1,
            box_2d:
              answer.box_2d ??
              answer.box2d ??
              answer.bounding_box ??
              answer.boundingBox ??
              answer.bbox ??
              answer.box,
            x: answer.x,
            y: answer.y,
            width: answer.width,
            height: answer.height,
          }),
        ];
      }

      return {
        ...answer,
        id: answer.id ?? `answer-${index + 1}`,
        text:
          typeof answer.text === "string"
            ? answer.text
            : stringifyField(answer.answer ?? answer.content ?? answer.body),
        confidence: coerceConfidence(answer.confidence),
        questionReference,
        regions: regionsUnknown.map(normalizeRegionItem),
      };
    }),
  };
}
