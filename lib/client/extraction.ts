import type {
  Answer,
  AnswerCandidate,
  GradeResult,
  Question,
  ViewerPage,
} from "@/types/assessment";

export type ExtractQuestionsResponse = {
  questions: Question[];
  pageCount: number;
  sourceName: string;
};

export type ExtractAnswersResponse = {
  answers: AnswerCandidate[];
  pageCount: number;
  sourceName: string;
  pages: ViewerPage[];
};

export type MapAnswersResponse = {
  answers: Answer[];
  unansweredQuestions: Question[];
  unmatchedCandidates: AnswerCandidate[];
  debugAnswers?: unknown;
};

export type GradeAnswerResponse = {
  grade: GradeResult;
};

async function postFile<T>(url: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export function extractQuestionsRequest(
  file: File,
): Promise<ExtractQuestionsResponse> {
  return postFile<ExtractQuestionsResponse>("/api/extract-questions", file);
}

export function extractAnswersRequest(
  file: File,
): Promise<ExtractAnswersResponse> {
  return postFile<ExtractAnswersResponse>("/api/extract-answers", file);
}

export async function mapAnswersRequest(
  questions: Question[],
  candidates: AnswerCandidate[],
): Promise<MapAnswersResponse> {
  const response = await fetch("/api/map-answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions, candidates }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | MapAnswersResponse
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : `Mapping failed (${response.status})`;
    throw new Error(message);
  }

  return payload as MapAnswersResponse;
}

export async function gradeAnswerRequest(
  question: Question,
  answer: Answer | null,
): Promise<GradeAnswerResponse> {
  const response = await fetch("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | GradeAnswerResponse
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error
        ? payload.error
        : `Grading failed (${response.status})`;
    throw new Error(message);
  }

  return payload as GradeAnswerResponse;
}
