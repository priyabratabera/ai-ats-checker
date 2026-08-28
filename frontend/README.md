# ATS Checker - Frontend

Next.js + TypeScript + Tailwind CSS frontend for an AI-powered ATS (Applicant
Tracking System) resume checker: upload a resume and a job description and get
a rule-based + semantic ATS score, keyword-level highlighting on the resume
itself, and prioritized, actionable recommendations.

## Stack

- **Next.js 16** (App Router, Turbopack, TypeScript, Node.js runtime)
- **Tailwind CSS v4**
- **Zustand** for client analysis state
- **Radix UI primitives** (`class-variance-authority` + `tailwind-merge`) for
  an accessible, hand-rolled design system
- **react-dropzone** for resume upload
- **unpdf** / **mammoth** for server-side PDF/DOCX text extraction
- **jsPDF** for the client-side "Download report" PDF export
- **Vitest** for unit tests
- **Zod** for input validation

## How analysis works

There is no separate backend yet - the full analysis pipeline lives in this
app under `POST /api/analyze` (`src/app/api/analyze/route.ts`), which streams
newline-delimited JSON progress events followed by a final result, so the UI
can show real progress instead of a fake timer.

The pipeline (`src/lib/analysis/`) is self-contained and requires no external
API key:

1. **Text extraction** (`lib/parsing`) - PDF (via `unpdf`), DOCX (via
   `mammoth`), or plain text.
2. **Keyword extraction & matching** (`keyword-extraction.ts`, `matching.ts`)
   - rule-based extraction from the job description (weighted by frequency
     and by "requirements/must-have" cues), matched against the resume with
     a curated skill/synonym taxonomy (`skill-taxonomy.ts`).
3. **Semantic analysis** (`semantic-similarity.ts`,
   `semantic/heuristic-insights.ts`) - a TF-IDF/cosine-similarity comparison
   between resume and job description text, used for the "Experience Match"
   score and a template-based gap summary. This works fully offline.
4. **Optional LLM enhancement** (`semantic/llm-enhancer.ts`) - if
   `ANTHROPIC_API_KEY` is set, a Claude call replaces the heuristic summary
   with a richer narrative gap analysis. The app works identically without
   it; this is a pluggable, best-effort enhancement layer that fails
   gracefully back to the heuristic.
5. **Formatting & structure rules** (`formatting-rules.ts`,
   `structure-rules.ts`) - bullet usage, contact info, quantified
   achievements, weak/passive phrasing, section headings, date consistency.
6. **Scoring** (`scoring.ts`) - a weighted 0-100 overall score across five
   categories: Keyword Match, Skills Match, Experience Match, Formatting,
   Structure.
7. **Highlights & recommendations** (`highlights.ts`, `recommendations.ts`) -
   maps findings onto resume text spans for inline highlighting, and
   generates prioritized, actionable recommendations (with before/after
   examples where applicable).

## Getting started

Requires **Node.js >= 22.13** (pinned via `.nvmrc`; run `nvm use` first if
you use nvm).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local`. Every variable is optional - the app is
fully functional with none set.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables the optional Claude-powered semantic gap analysis. Omit to use the built-in heuristic analysis instead. |

## Scripts

```bash
npm run dev         # start the dev server (Turbopack)
npm run build        # production build
npm run start         # serve the production build
npm run lint          # ESLint
npm run test           # run unit tests once
npm run test:watch      # run unit tests in watch mode
```

## Project structure

```
src/
  app/                    routes (page, layout, /api/analyze)
  components/
    ui/                    design-system primitives (button, card, tabs, ...)
    upload/                resume dropzone, job description textarea
    progress/               streaming analysis progress indicator
    dashboard/               score gauge + category meters
    resume/                  highlighted resume preview + legend
    report/                  detailed report tab + PDF export
    recommendations/          recommendation list/cards
    app/                      top-level state machine + results composition
  lib/
    analysis/                 the rule-based + semantic scoring engine
    parsing/                   PDF/DOCX/TXT text extraction
    api/                       client-side streaming fetch helper
    validation/                 file/JD input validation (Zod)
    report/                    PDF report generation (jsPDF)
  store/                      Zustand store for the analysis flow
  types/                      shared TypeScript contracts (AnalysisResult, ...)
```
