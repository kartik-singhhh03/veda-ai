import type {
  Answer,
  AnswerCandidate,
  MappingMethod,
  Question,
} from "@vedaai/types";

export type { MappingMethod };

/** Internal debug info — extends Answer with reference traces. */
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
