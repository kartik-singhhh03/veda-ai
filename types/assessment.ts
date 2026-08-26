export type Question = {
  id: string;
  number: string;
  text: string;
  order: number;
  maxMarks?: number;
};

export type AnswerRegion = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Extracted student answer before Phase 3 mapping. */
export type AnswerCandidate = {
  id: string;
  questionReference: string | null;
  text: string;
  regions: AnswerRegion[];
  confidence: number;
};

/** Mapped application answer after Phase 3. */
export type Answer = {
  id: string;
  questionId: string | null;
  text: string;
  regions: AnswerRegion[];
  confidence: number;
  status: "answered" | "unanswered" | "unmatched";
};

export type Assessment = {
  questions: Question[];
  answers: Answer[];
};

export type UploadSlot = "questionPaper" | "answerSheet";

export type DocumentPage = {
  pageNumber: number;
  mimeType: "image/png" | "image/jpeg";
  /** Raw image bytes for this page. */
  bytes: Uint8Array;
  width: number;
  height: number;
};

export type ProcessedDocument = {
  sourceName: string;
  pageCount: number;
  pages: DocumentPage[];
};

export type ProcessingStage =
  | "idle"
  | "preparing"
  | "extracting_questions"
  | "extracting_answers"
  | "done"
  | "error";
