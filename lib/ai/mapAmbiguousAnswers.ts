import { Type, type Schema } from "@google/genai";
import { getGeminiClient } from "@/lib/ai/client";
import { GEMINI_MODEL } from "@/lib/ai/config";
import { structuredJsonConfig } from "@/lib/ai/geminiConfig";
import { SEMANTIC_MATCH_THRESHOLD } from "@/lib/mapping/constants";
import { buildQuestionIndex } from "@/lib/mapping/buildQuestionIndex";
import { normalizeQuestionId } from "@/lib/mapping/normalizeQuestionId";
import type { MappedAnswerDebug } from "@/lib/mapping/types";
import type { AnswerCandidate, Question } from "@/types/assessment";

const semanticBatchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          candidateId: { type: Type.STRING },
          questionId: {
            type: Type.STRING,
            nullable: true,
            description: "Must be an existing question id, or null if no match",
          },
          confidence: {
            type: Type.NUMBER,
            description: "0 to 1 confidence in the match",
          },
        },
        required: ["candidateId", "questionId", "confidence"],
      },
    },
  },
  required: ["matches"],
};

export type SemanticMappingOutcome = {
  mapped: MappedAnswerDebug[];
  stillUnresolved: AnswerCandidate[];
};

/**
 * Batch semantic fallback for unresolved candidates only.
 * On total Gemini failure, returns all candidates as stillUnresolved
 * so exact matches elsewhere are preserved by the caller.
 */
export async function mapAmbiguousAnswers(
  questions: Question[],
  unresolvedCandidates: AnswerCandidate[],
): Promise<SemanticMappingOutcome> {
  if (unresolvedCandidates.length === 0) {
    return { mapped: [], stillUnresolved: [] };
  }

  const questionIndex = buildQuestionIndex(questions);
  const knownIds = new Set(questions.map((q) => q.id));
  // Also allow normalized forms as valid returns that we resolve via index
  const knownNormalized = new Set(questionIndex.keys());

  const questionSummaries = questions.map((q) => ({
    id: q.id,
    number: q.number,
    text: q.text,
  }));

  const candidateSummaries = unresolvedCandidates.map((c) => ({
    id: c.id,
    questionReference: c.questionReference,
    text: c.text,
  }));

  const prompt = `You map handwritten student answers to extracted exam questions.

Rules:
1. Only use question ids from the provided question list.
2. Never invent a question id.
3. If no reasonable match exists, set questionId to null.
4. confidence must be between 0 and 1.
5. Prefer strong semantic matches based on answer content vs question text.
6. Sub-parts like 11(a) and 11(b) are different questions — do not merge them.

Questions:
${JSON.stringify(questionSummaries, null, 2)}

Unresolved answer candidates:
${JSON.stringify(candidateSummaries, null, 2)}

Return one match object per candidate id.`;

  let parsed: unknown;
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: structuredJsonConfig(semanticBatchSchema),
    });

    if (!response.text) {
      throw new Error("Empty semantic mapping response.");
    }
    parsed = JSON.parse(response.text);
  } catch (error) {
    console.error("Semantic mapping failed:", error);
    // Graceful degradation: keep exact matches; treat these as unmatched later.
    return { mapped: [], stillUnresolved: unresolvedCandidates };
  }

  const matchesUnknown =
    parsed && typeof parsed === "object"
      ? (parsed as { matches?: unknown }).matches
      : null;

  if (!Array.isArray(matchesUnknown)) {
    return { mapped: [], stillUnresolved: unresolvedCandidates };
  }

  const matchByCandidate = new Map<
    string,
    { questionId: string | null; confidence: number }
  >();

  for (const item of matchesUnknown) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const candidateId =
      typeof record.candidateId === "string" ? record.candidateId : "";
    if (!candidateId) continue;

    const confidence =
      typeof record.confidence === "number" ? record.confidence : NaN;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      continue;
    }

    let questionId: string | null = null;
    if (typeof record.questionId === "string" && record.questionId.trim()) {
      const raw = record.questionId.trim();
      if (knownIds.has(raw)) {
        questionId = raw;
      } else {
        const normalized = normalizeQuestionId(raw);
        if (normalized && knownNormalized.has(normalized)) {
          questionId = questionIndex.get(normalized)!.id;
        } else {
          // Invented / unknown id → treat as no match
          questionId = null;
        }
      }
    } else if (record.questionId === null) {
      questionId = null;
    }

    matchByCandidate.set(candidateId, { questionId, confidence });
  }

  const mapped: MappedAnswerDebug[] = [];
  const stillUnresolved: AnswerCandidate[] = [];

  for (const candidate of unresolvedCandidates) {
    const match = matchByCandidate.get(candidate.id);
    if (
      match &&
      match.questionId &&
      match.confidence >= SEMANTIC_MATCH_THRESHOLD
    ) {
      mapped.push({
        id: candidate.id,
        questionId: match.questionId,
        text: candidate.text,
        regions: candidate.regions.map((region) => ({ ...region })),
        confidence: match.confidence,
        status: "answered",
        questionReference: candidate.questionReference,
        normalizedReference: normalizeQuestionId(candidate.questionReference),
        mappingMethod: "semantic",
      });
    } else {
      stillUnresolved.push(candidate);
    }
  }

  return { mapped, stillUnresolved };
}
