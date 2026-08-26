# AI Assessment Extraction & Answer Mapping

VedaAI helps teachers map a printed question paper to a student's handwritten answer sheet.

Teachers upload two files (PDF or image). The app extracts questions, extracts handwritten answer candidates with page regions, maps answers to questions, highlights the exact region on the answer sheet, and can provide optional AI-assisted grading feedback.

This project was built as a focused hiring assignment: a single Next.js application with in-memory processing, no authentication, and no database.

## Overview

Exam review is slow when teachers must flip between a typed question paper and messy handwritten pages. This product reduces that friction by:

1. Reading the question paper into structured questions (including sub-parts like `11(a)` / `11(b)`).
2. Reading the answer sheet into answer candidates with normalized bounding boxes.
3. Mapping answers to questions with exact reference matching first, then semantic AI only for unresolved cases.
4. Showing the teacher the answer page with a green highlight over the student's handwriting.
5. Optionally grading answered questions on demand.

The design is intentionally hybrid: Gemini handles document understanding and ambiguous cases; TypeScript rules handle validation, ID normalization, unanswered/unmatched detection, coordinate conversion, and grade bounds.

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
- **Google Gemini** via `@google/genai` (`gemini-2.5-flash`)
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
- Normalized → pixel coordinate conversion
- Grade score bounds (`0 ≤ score ≤ maxMarks`)

## Exact Answer Highlighting

Each answer region is stored as normalized coordinates relative to its page:

```ts
{ page, x, y, width, height } // each of x/y/width/height in 0..1
```

The viewer converts them to pixels:

```
left   = x * renderedWidth
top    = y * renderedHeight
width  = width * renderedWidth
height = height * renderedHeight
```

A green overlay is drawn above the page image. Zoom scales the page and overlays together. Multi-page answers keep multiple regions; only regions for the current page are drawn.

## Edge Cases

- **Sub-parts** like `11(a)` and `11(b)` remain separate questions and separate cards.
- **Out-of-order answers** map by stable question IDs, not sheet order.
- **Unanswered questions** are detected deterministically when no mapped answer exists.
- **Unmatched answers** (e.g. `Q99`) are preserved and listed separately.
- **Multi-page answers** jump to the first region page and highlight later pages when navigated.

## AI Model

The implementation uses **`gemini-2.5-flash`** (configured in `lib/ai/config.ts`) for:

- multimodal question extraction
- multimodal answer extraction
- batched semantic mapping fallback
- on-demand grading

Structured JSON output is requested and then validated in TypeScript before becoming app state.

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

Coverage includes ID normalization, exact mapping, unanswered/unmatched behavior, region conversion, and grade validation.

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
4. Deploy.

Notes:

- API routes use the **Node.js** runtime.
- PDF rendering uses `@napi-rs/canvas` (native, Node-compatible; marked in `serverExternalPackages`).
- Processing is **in-memory** — refreshing the browser clears the current assessment.
- Long-running routes set `maxDuration` for serverless time limits.

## Assumptions / Limitations

- Handwritten recognition quality depends on scan clarity and handwriting.
- Answers without an explicit question number rely on semantic fallback.
- AI grading is teacher support, not an authoritative final mark.
- Diagram-only answers may be less reliable than text answers.
- There is no persistence across sessions (by design for this assignment).
- Proprietary Figma illustrations/avatars are approximated with simple placeholders.

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
  documents/          # PDF/image preprocessing
  mapping/            # normalize + exact map + unanswered
  viewer/             # region → pixel helpers
  validation/         # upload validation
types/                # shared domain types
```
