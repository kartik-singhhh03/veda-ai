# AI Assessment Extraction & Answer Mapping

VedaAI helps teachers map a printed question paper to a student's handwritten answer sheet.

Teachers upload two files (PDF or image). The app extracts questions, extracts handwritten answer candidates with page regions, maps answers to questions, highlights the exact region on the answer sheet, and can provide optional AI-assisted grading feedback.

This project was built as a focused hiring assignment: a Next.js monorepo with in-memory processing, no authentication, and no database.
![Uploading image.png…]()


## Repository Structure

```text
apps/
  web/              Next.js application (UI + API routes)

packages/
  types/            Shared assessment domain types (@vedaai/types)
```

Root scripts orchestrate the workspace through [Turborepo](https://turbo.build/).

## Overview

Exam review is slow when teachers must flip between a typed question paper and messy handwritten pages. This product reduces that friction by:

1. Reading the question paper into structured questions (including sub-parts like `11(a)` / `11(b)`).
2. Reading the answer sheet into answer candidates with normalized bounding boxes.
3. Mapping answers to questions with exact reference matching first, then semantic AI only for unresolved cases.
4. Showing the teacher the answer page with a green highlight and question badge over the student's handwriting.
5. Optionally grading answered questions on demand, with a compact summary of grades already completed.

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

- **Turborepo** + **npm workspaces**
- **Next.js** (App Router) + **React** + **TypeScript**
- **Tailwind CSS**
- **Lucide React** icons
- **Google Gemini** via `@google/genai`
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

## Local Setup

From the repository root:

```bash
npm install
```

Create `apps/web/.env.local` (preferred) or `apps/web/.env`:

```bash
GEMINI_API_KEY=your_key_here
```

Optional overrides:

```bash
GEMINI_EXTRACTION_MODEL=gemini-3.5-flash-lite
GEMINI_MODEL=gemini-3.6-flash
```

See `apps/web/.env.example`.

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Workspace commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (`apps/web`) |
| `npm run build` | Production build via Turbo |
| `npm start` | Start production server |
| `npm test` | Run unit tests |
| `npm run lint` | ESLint |

Build or test the web app directly:

```bash
npm --workspace @vedaai/web run build
npm --workspace @vedaai/web run test
```

## Testing

```bash
npm test
```

Coverage includes ID normalization, exact mapping, unanswered/unmatched behavior, region conversion, grade validation, mapping review labels, grading summary math, and upload-size guards.

## Deployment (Vercel)

The Next.js app lives in **`apps/web`**.

### Option A — Root Directory `apps/web` (recommended)

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Set **Root Directory** to **`apps/web`**.
4. Set **Install Command** to `npm install` (runs from monorepo root; enable *Include source files outside Root Directory* if prompted).
5. Set **Build Command** to `cd ../.. && turbo run build --filter=@vedaai/web` or leave default `next build` after install from root.
6. Set **`GEMINI_API_KEY`** (and optional model overrides) in Vercel env vars.
7. Deploy.

`apps/web/vercel.json` configures API route `maxDuration` limits.

### Option B — Deploy from repository root

If Root Directory is left at the repo root, the root **`vercel.json`** points Vercel at `apps/web/.next` and runs `turbo run build --filter=@vedaai/web`.

Verify deployment: open `/api/health` — commit hash should match latest `main`.

### Runtime / duration

| Route | Runtime | maxDuration |
|-------|---------|-------------|
| `/api/extract-questions` | `nodejs` | 60s |
| `/api/extract-answers` | `nodejs` | 60s |
| `/api/map-answers` | `nodejs` | 60s |
| `/api/grade` | `nodejs` | 30s |

PDF rendering uses `@napi-rs/canvas` (native, Node-compatible; listed in `serverExternalPackages`). Edge runtime is not used for document processing.

**Node.js 22.x** is required (`engines` in root `package.json`).

### Payload / file-size assumptions

Vercel Functions enforce ~**4.5 MB** request and response body limits. Uploads are capped at **4 MB** (client + server, `apps/web/lib/limits.ts`).

## Assumptions / Limitations

- Handwritten recognition quality depends on scan clarity and handwriting.
- Answers without an explicit question number rely on semantic fallback.
- AI grading is teacher support, not an authoritative final mark.
- No persistence across sessions (by design for this assignment).
- Serverless body limits constrain upload size and answer-sheet page image responses.

## Package layout (detail)

```text
apps/web/
  app/                  pages + API routes
  components/           layout, upload, assessment UI
  lib/                  AI, documents, mapping, viewer, validation
  public/
  types/                web-only declarations (e.g. pdfjs worker)
  next.config.ts
  vercel.json

packages/types/
  src/index.ts          Question, Answer, GradeResult, ViewerPage, etc.
```

Shared domain types are imported as `@vedaai/types` throughout the web app.
