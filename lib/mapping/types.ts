import type { Answer, AnswerCandidate, Question } from "../../types/assessment";

export type MappingMethod = "exact" | "semantic";

/** Internal debug info — not required by the public Answer type. */
export type MappedAnswerDebug = Answer & {
  questionReference: string | null;
  normalizedReference: string | null;
  mappingMethod: MappingMethod;
};

export type ExactMappingResult = {
  answers: MappedAnswerDebug[];
  unresolvedCandidates: AnswerCandidate[];
};

export type MappingResult = {
  answers: Answer[];
  unansweredQuestions: Question[];
  unmatchedCandidates: AnswerCandidate[];
  /** Optional debug detail for development inspection. */
  debugAnswers?: MappedAnswerDebug[];
};
