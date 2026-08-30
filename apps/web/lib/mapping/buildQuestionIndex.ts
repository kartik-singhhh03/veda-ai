import type { Question } from "@vedaai/types";
import { normalizeQuestionId } from "./normalizeQuestionId";

/**
 * Build an O(1) lookup from normalized Question.id → Question.
 * Also indexes normalized Question.number when it differs.
 */
export function buildQuestionIndex(questions: Question[]): Map<string, Question> {
  const index = new Map<string, Question>();

  for (const question of questions) {
    const idKey = normalizeQuestionId(question.id) ?? question.id.trim().toLowerCase();
    index.set(idKey, question);

    const numberKey = normalizeQuestionId(question.number);
    if (numberKey && numberKey !== idKey) {
      index.set(numberKey, question);
    }
  }

  return index;
}
