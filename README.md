# AI Assessment Extraction & Answer Mapping

VedaAI helps teachers map a printed question paper to a student's handwritten answer sheet.

Teachers upload two files (PDF or image). The app extracts questions, extracts handwritten answer candidates with page regions, maps answers to questions, highlights the exact region on the answer sheet, and can provide optional AI-assisted grading feedback.

This project was built as a focused hiring assignment: a single Next.js application with in-memory processing, no authentication, and no database.

## Overview

Exam review is slow when teachers must flip between a typed question paper and messy handwritten pages. This product reduces that friction by:

1. Reading the question paper into structured questions (including sub-parts like `11(a)` / `11(b)`).
2. Reading the answer sheet into answer candidates with normalized bounding boxes.
3. Mapping answers to questions with exact reference matching first, then semantic AI only for unresolved cases.
4. Showing the teacher the answer page with a green highlight and question badge over the student's handwriting.
5. Optionally grading answered questions on demand, with a compact summary of grades already completed.

The design is intentionally hybrid: Gemini handles document understanding and ambiguous cases; TypeScript rules handle validation, ID normalization, unanswered/unmatched detection, coordinate conversion, and grade bounds.

## Overview of teacher-facing extras

- **Mapping confidence / review** — exact matches show as high confidence; semantic matches show `AI mapped` or `AI mapped · Review recommended` using the existing confidence score (acceptance threshold unchanged at `0.75`).
- **Grading summary** — header pills for `Graded`, `Score`, and `Coverage` are derived only from grades already cached in React state (no extra Gemini calls).

## Core Flow

```
Upload
→ Document Processing
→ Question Extraction
→ Answer Extraction
→ Answer Mapping
→ Answer Highlighting
→ On-demand Grading
```

## Tech Stack

- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Lucide React** icons
- **Google Gemini** via `@google/genai` (`gemini-2.5-flash` by default)
- **unpdf** + **pdfjs-dist** + **@napi-rs/canvas** for PDF page rendering
- **Node test runner** + **tsx** for unit tests

## Architecture

```
Frontend (upload + assessment workspace)
    ↓
Next.js API routes (server only)
    ↓
Document processing (PDF/image → ordered page images)
    ↓
Gemini multimodal extraction / mapping / grading
    ↓
Deterministic validation + mapping rules
    ↓
In-memory React state → assessment UI + green overlays
```

AI calls never run in the browser. `GEMINI_API_KEY` stays server-side.

## Hybrid AI + Rule-Based Design

**AI is used for:**

- Question extraction from scanned/printed papers
- Handwritten answer extraction and region detection
- Semantic fallback mapping for answers without a clear question reference
- Optional grading feedback

**Rules / TypeScript logic are used for:**

- File type and size validation
- Question ID normalization (`Q11(a)` → `11(a)`)
- Exact reference matching before any semantic call
- Unanswered question detection (set difference)
- Unmatched answer preservation
- Mapping review labels from `mappingMethod` + confidence
- Normalized → pixel/percentage coordinate conversion
- Grade score bounds (`0 ≤ score ≤ maxMarks`)
- Local grading summary aggregation

## Exact Answer Highlighting

Each answer region is stored as normalized coordinates relative to its page:

```ts
{ page, x, y, width, height } // each of x/y/width/height in 0..1
```

The viewer converts them to CSS percentages so the overlay stays aligned with a responsive/zoomed page image. A green overlay and `Q#` badge are drawn above the page. Multi-page answers keep multiple regions; only regions for the current page are drawn.

## Edge Cases

- **Sub-parts** like `11(a)` and `11(b)` remain separate questions and separate cards.
- **Out-of-order answers** map by stable question IDs, not sheet order.
- **Unanswered questions** are detected deterministically when no mapped answer exists.
- **Unmatched answers** (e.g. `Q99`) are preserved and listed separately.
- **Multi-page answers** jump to the first region page and highlight later pages when navigated.
- **Semantic low-confidence mappings** remain mapped when `confidence ≥ 0.75`, but are flagged for teacher review when below `0.9`.

## AI Model

The implementation uses **`gemini-2.5-flash`** (configured in `lib/ai/config.ts`) for:

- multimodal question extraction
- multimodal answer extraction
- batched semantic mapping fallback
- on-demand grading

Structured JSON output is requested and then validated in TypeScript before becoming app state.

**Call-count discipline:**

- Question extraction: once per uploaded question document
- Answer extraction: once per uploaded answer document
- Mapping: exact matches never call Gemini; only unresolved candidates use semantic fallback
- Grading: on demand, one request per question, cached after success (no Gemini on React rerenders)

## Local Setup

```bash
npm install
```

Create `.env.local` (preferred) or `.env`:

```bash
GEMINI_API_KEY=your_key_here
```

See `.env.example`.

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm test
```

Coverage includes ID normalization, exact mapping, unanswered/unmatched behavior, region conversion, grade validation, mapping review labels, grading summary math, and upload-size guards.

## Production Build

```bash
npm run build
npm start
```

Optional:

```bash
npm run lint
```

## Deployment (Vercel)

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Set environment variable **`GEMINI_API_KEY`** in the Vercel project settings.
4. Optional: **`GEMINI_EXTRACTION_MODEL`** / **`GEMINI_MODEL`** (default `gemini-2.5-flash`). New Google AI Studio **AQ.** auth keys are supported.
5. Deploy.

### Runtime / duration

| Route | Runtime | maxDuration |
|-------|---------|-------------|
| `/api/extract-questions` | `nodejs` | 60s |
| `/api/extract-answers` | `nodejs` | 60s |
| `/api/map-answers` | `nodejs` | 60s |
| `/api/grade` | `nodejs` | 30s |

PDF rendering uses `@napi-rs/canvas` (native, Node-compatible; listed in `serverExternalPackages`). Edge runtime is not used for document processing.

**Node.js 22.x** is required (`package.json` `engines`) so PDF.js and native canvas bindings match local/Vercel behavior.

**PDF.js on Vercel:** preload the worker on `globalThis.pdfjsWorker`, resolve font/CMap dirs from `process.cwd()/node_modules/pdfjs-dist`, and include `standard_fonts` + `cmaps` via `outputFileTracingIncludes` in `next.config.ts`. Question extraction sends the **original PDF** to Gemini (not rendered PNGs) so extraction works even if serverless renders are blank.

### Payload / file-size assumptions

Vercel Functions currently enforce ~**4.5 MB** request and response body limits.

This assignment therefore :-

- Accepts uploads up to **4 MB** (client + server, same constant in `lib/limits.ts`)
- Returns answer-sheet page images as base64 only from `/api/extract-answers` (needed by the viewer)
- Rejects oversized rendered page payloads with a clear 413-style message before exceeding the response limit
- Keeps processing **in memory** (no Blob/S3/database) — appropriate for the demo assignment

The Figma copy shows “Max 10MB”; the product intentionally uses **Max 4MB** so the UI does not promise uploads that cannot survive the serverless body limit.

Typical synthetic demo sheets (a few pages) are expected to fit. Very long, high-resolution multi-page scans may still hit the response ceiling — that is a known limitation of the in-memory demo architecture, not a prompt to add persistent storage for this assignment.

### Observability

Extraction/mapping routes log compact timing (`preprocessMs`, `geminiMs`, `totalMs`) without API keys, full answers, or base64 payloads.

## Assumptions / Limitations

- Handwritten recognition quality depends on scan clarity and handwriting.
- Answers without an explicit question number rely on semantic fallback.
- AI grading is teacher support, not an authoritative final mark.
- Diagram-only answers may be less reliable than text answers.
- There is no persistence across sessions (by design for this assignment).
- Serverless body limits constrain upload size and answer-sheet page image responses.
- Proprietary Figma character art is used only when explicitly provided for the hero; otherwise approximations remain acceptable.

## Project Structure (high level)

```
app/                  # pages + API routes
components/
  layout/             # sidebar + headers
  upload/             # upload UI
  processing/         # loading state
  assessment/         # workspace, viewer, cards
lib/
  ai/                 # Gemini client + extraction/grading
  assessment/         # grading summary helpers
  documents/          # PDF/image preprocessing
  mapping/            # normalize + exact map + review labels
  viewer/             # region → pixel/percent helpers
  validation/         # upload validation
  limits.ts           # shared deployment size limits
types/                # shared domain types
```
