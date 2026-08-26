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

function humanizeApiError(raw: string, fallback: string): string {
  const message = raw.trim();
  if (!message) return fallback;

  if (message.includes("GEMINI_API_KEY")) {
    return "Gemini API key is missing on the server. Add GEMINI_API_KEY and try again.";
  }
  if (/unsupported file type/i.test(message)) {
    return "Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG.";
  }
  if (/too large/i.test(message)) {
    return "File is too large. Maximum size is 10MB.";
  }
  if (/question extraction/i.test(message) || /no questions/i.test(message)) {
    return "Question extraction failed. Please try uploading the question paper again.";
  }
  if (/answer extraction/i.test(message)) {
    return "Answer extraction failed. Please try uploading the answer sheet again.";
  }
  if (/mapping/i.test(message)) {
    return "Answer mapping failed. Extraction results could not be linked. Please try again.";
  }
  if (/document processing/i.test(message) || /pdf/i.test(message)) {
    return "Document processing failed. Please check the file and try again.";
  }
  if (/grading/i.test(message)) {
    return "Grading failed. You can still review mapped answers and highlights.";
  }

  return message.length > 180 ? fallback : message;
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  const raw =
    payload && typeof payload.error === "string" ? payload.error : fallback;
  return humanizeApiError(raw, fallback);
}

async function postFile<T>(url: string, file: File, fallback: string): Promise<T> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }

  return (await response.json()) as T;
}

export function extractQuestionsRequest(
  file: File,
): Promise<ExtractQuestionsResponse> {
  return postFile<ExtractQuestionsResponse>(
    "/api/extract-questions",
    file,
    "Question extraction failed. Please try uploading the question paper again.",
  );
}

export function extractAnswersRequest(
  file: File,
): Promise<ExtractAnswersResponse> {
  return postFile<ExtractAnswersResponse>(
    "/api/extract-answers",
    file,
    "Answer extraction failed. Please try uploading the answer sheet again.",
  );
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

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Answer mapping failed. Please try again.",
      ),
    );
  }

  return (await response.json()) as MapAnswersResponse;
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

  if (!response.ok) {
    throw new Error(
      await readErrorMessage(
        response,
        "Grading failed. You can still review mapped answers and highlights.",
      ),
    );
  }

  return (await response.json()) as GradeAnswerResponse;
}
