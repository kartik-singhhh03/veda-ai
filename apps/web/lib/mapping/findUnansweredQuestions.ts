import type { Answer, Question } from "@vedaai/types";

/**
 * Deterministic unanswered detection — no AI.
 * A question is unanswered when no mapped Answer with status "answered"
 * references its id.
 */
export function findUnansweredQuestions(
  questions: Question[],
  answers: Answer[],
): Question[] {
  const answeredIds = new Set<string>();

  for (const answer of answers) {
    if (answer.status === "answered" && answer.questionId) {
      answeredIds.add(answer.questionId);
    }
  }

  return questions.filter((question) => !answeredIds.has(question.id));
}
