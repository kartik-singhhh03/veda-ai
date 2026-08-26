import { mapAmbiguousAnswers } from "@/lib/ai/mapAmbiguousAnswers";
import { findUnansweredQuestions } from "@/lib/mapping/findUnansweredQuestions";
import { mapAnswersExact } from "@/lib/mapping/mapAnswers";
import type { MappingResult } from "@/lib/mapping/types";
import type { Answer, AnswerCandidate, Question } from "@/types/assessment";
import { isValidNormalizedRegion } from "@/lib/ai/coordinates";

function regionsAreValid(candidate: AnswerCandidate): boolean {
  if (!Array.isArray(candidate.regions) || candidate.regions.length === 0) {
    return false;
  }
  return candidate.regions.every(isValidNormalizedRegion);
}

function candidateIsUsable(candidate: AnswerCandidate): boolean {
  if (!candidate || typeof candidate.id !== "string" || !candidate.id.trim()) {
    return false;
  }
  if (typeof candidate.text !== "string") {
    return false;
  }
  if (
    typeof candidate.confidence !== "number" ||
    candidate.confidence < 0 ||
    candidate.confidence > 1
  ) {
    return false;
  }
  return regionsAreValid(candidate);
}

/**
 * Full hybrid mapping pipeline:
 * exact match → semantic fallback for unresolved → unanswered + unmatched.
 */
export async function runMappingPipeline(
  questions: Question[],
  candidates: AnswerCandidate[],
): Promise<MappingResult> {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Mapping requires at least one extracted question.");
  }
  if (!Array.isArray(candidates)) {
    throw new Error("Mapping requires an answer candidates array.");
  }

  const usableCandidates = candidates.filter(candidateIsUsable);
  const exact = mapAnswersExact(questions, usableCandidates);

  const semantic = await mapAmbiguousAnswers(
    questions,
    exact.unresolvedCandidates,
  );

  const debugAnswers = [...exact.answers, ...semantic.mapped];

  // One answered mapping per question — first wins (exact preferred since first)
  const usedQuestionIds = new Set<string>();
  const answers: Answer[] = [];
  const duplicateMappedAsUnmatched: AnswerCandidate[] = [];

  for (const mapped of debugAnswers) {
    if (mapped.questionId && usedQuestionIds.has(mapped.questionId)) {
      duplicateMappedAsUnmatched.push({
        id: mapped.id,
        questionReference: mapped.questionReference,
        text: mapped.text,
        regions: mapped.regions,
        confidence: mapped.confidence,
      });
      continue;
    }
    if (mapped.questionId) {
      usedQuestionIds.add(mapped.questionId);
    }
    answers.push({
      id: mapped.id,
      questionId: mapped.questionId,
      text: mapped.text,
      regions: mapped.regions,
      confidence: mapped.confidence,
      status: "answered",
      mappingMethod: mapped.mappingMethod,
    });
  }

  const unmatchedCandidates: AnswerCandidate[] = [
    ...semantic.stillUnresolved.map((candidate) => ({
      ...candidate,
      regions: candidate.regions.map((region) => ({ ...region })),
    })),
    ...duplicateMappedAsUnmatched,
  ].map((candidate) => ({
    ...candidate,
    // Represent unmatched as Answer-compatible edge cases in UI via candidates
  }));

  // Also expose unmatched as Answer objects with status "unmatched"
  for (const candidate of unmatchedCandidates) {
    answers.push({
      id: candidate.id,
      questionId: null,
      text: candidate.text,
      regions: candidate.regions.map((region) => ({ ...region })),
      confidence: candidate.confidence,
      status: "unmatched",
    });
  }

  const unansweredQuestions = findUnansweredQuestions(
    questions,
    answers.filter((a) => a.status === "answered"),
  );

  return {
    answers,
    unansweredQuestions,
    unmatchedCandidates,
    debugAnswers,
  };
}
