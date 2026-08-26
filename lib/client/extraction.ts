import type { AnswerCandidate, Question } from "@/types/assessment";

export type ExtractQuestionsResponse = {
  questions: Question[];
  pageCount: number;
  sourceName: string;
};

export type ExtractAnswersResponse = {
  answers: AnswerCandidate[];
  pageCount: number;
  sourceName: string;
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
