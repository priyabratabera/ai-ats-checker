# ATS Checker - Frontend

Next.js + TypeScript + Tailwind CSS frontend for an AI-powered ATS (Applicant
Tracking System) resume checker: upload a resume and a job description and get
a rule-based + semantic ATS score, keyword-level highlighting on the resume
itself, and prioritized, actionable recommendations.

This app is wired to the [FastAPI backend](../backend/README.md) - see
[../README.md](../README.md) for how the two pieces fit together. It also
works entirely on its own if the backend isn't running (see below).

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

`POST /api/analyze` (`src/app/api/analyze/route.ts`) streams
newline-delimited JSON progress events followed by a final result, so the UI
shows real progress instead of a fake timer. What actually produces that
result depends on whether the backend is reachable:

1. **Backend path (default when `backend/` - and its
   [`worker/`](../worker/README.md) - are running).** The route calls a fast
   health check (`lib/api/backend-client.ts::isBackendReachable`, ~2.5s
   timeout) *before* streaming anything - if the backend answers, the route
   proxies to it: `POST /api/v1/users` (get-or-create by the name + email
   collected in step 1 of the form, best-effort - failure here degrades to
   an anonymous save rather than failing the analysis) -> `POST
   /api/v1/resumes` -> `POST /api/v1/job-descriptions` -> `POST
   /api/v1/analyze` (`lib/analysis/backend-pipeline.ts`). That last call
   only *queues* the check - the backend processes it asynchronously (see
   `worker/`), so `runBackendAnalysis` (`lib/api/backend-client.ts`) polls
   `GET /api/v1/analyses/{id}` every 1.5s (up to 2 minutes) until the
   worker settles it to `status: "complete"` or `"failed"`. The completed
   result (PyMuPDF-based rule engine + Ollama/OpenAI/Claude semantic engine,
   Postgres-persisted) is adapted into this app's `AnalysisResult` shape by
   `lib/analysis/backend-adapter.ts`. The backend has no resume-text-position
   API, so inline highlighting is rebuilt here from the extracted resume text
   plus the backend's real keyword analysis, reusing the local engine's own
   highlighting logic for that one purpose. If the backend is reachable but
   its worker isn't running, a check will queue and then time out after 2
   minutes stuck at `pending`/`processing` - the health check only confirms
   the API is up, not that a worker is consuming its queue.
2. **Local fallback path (when the backend is unreachable).** The route runs
   this app's own self-contained TypeScript pipeline (`lib/analysis/`)
   instead - full PDF/DOCX/TXT extraction, rule-based keyword matching
   against a curated synonym taxonomy, TF-IDF/cosine "semantic" scoring,
   formatting/structure checks, weighted scoring, and an optional
   `ANTHROPIC_API_KEY`-powered semantic summary (heuristic otherwise). No
   external dependency required at all.

Every result carries an `engineSource: "backend" | "local-fallback"` field,
surfaced in the UI as a badge, so it's always clear which engine actually
produced a given analysis - the app never silently switches mid-request.

## Getting started

Requires **Node.js >= 22.13** (pinned via `.nvmrc`; run `nvm use` first if
you use nvm).

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Start the
[backend](../backend/README.md) first if you want backend-powered analysis
(Postgres persistence, PyMuPDF layout checks, live LLM semantic analysis) -
otherwise every request automatically uses the local fallback engine.

For Docker, `Dockerfile` here is a multi-stage build using Next.js's
`output: "standalone"` (see `next.config.ts`) - it builds with the full
`node_modules`, then ships only the traced runtime files (no dev
dependencies) in the final image, run via `node server.js`. See the root
[`docker-compose.yml`](../docker-compose.yml) - `docker compose up` brings
this up alongside the backend and worker.

## Environment variables

Copy `.env.example` to `.env.local`. Every variable is optional - the app is
fully functional with none set.

| Variable | Purpose |
|---|---|
| `BACKEND_API_URL` | Base URL of the FastAPI backend (default `http://localhost:8000`). Used only server-side by the `/api/analyze` route. |
| `ANTHROPIC_API_KEY` | Used only by the local fallback engine, for richer semantic gap analysis instead of the built-in heuristic. Irrelevant when the backend is handling analysis (the backend has its own separate `ANTHROPIC_API_KEY`). |

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
    analysis/                 local fallback engine + backend-adapter/backend-pipeline
    parsing/                   PDF/DOCX/TXT text extraction (used by both paths)
    api/                       backend-client.ts (typed FastAPI calls) + streaming fetch helper
    validation/                 file/JD input validation (Zod)
    report/                    PDF report generation (jsPDF)
  store/                      Zustand store for the analysis flow
  types/                      analysis.ts (engine-agnostic UI types), backend.ts (FastAPI wire types)
```
