import { buildQuestionIndex } from "./buildQuestionIndex";
import { normalizeQuestionId } from "./normalizeQuestionId";
import type { ExactMappingResult } from "./types";
import type { AnswerCandidate, Question } from "../../types/assessment";

/**
 * Deterministic exact matching: normalize reference → lookup Question.id.
 * Unresolved candidates are returned for semantic fallback — not discarded.
 */
export function mapAnswersExact(
  questions: Question[],
  candidates: AnswerCandidate[],
): ExactMappingResult {
  const questionIndex = buildQuestionIndex(questions);
  const answers: ExactMappingResult["answers"] = [];
  const unresolvedCandidates: AnswerCandidate[] = [];

  for (const candidate of candidates) {
    const normalizedReference = normalizeQuestionId(candidate.questionReference);

    if (!normalizedReference) {
      unresolvedCandidates.push(candidate);
      continue;
    }

    const question = questionIndex.get(normalizedReference);
    if (!question) {
      unresolvedCandidates.push(candidate);
      continue;
    }

    answers.push({
      id: candidate.id,
      questionId: question.id,
      text: candidate.text,
      regions: candidate.regions.map((region) => ({ ...region })),
      confidence: candidate.confidence,
      status: "answered",
      questionReference: candidate.questionReference,
      normalizedReference,
      mappingMethod: "exact",
    });
  }

  return { answers, unresolvedCandidates };
}
