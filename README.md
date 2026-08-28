# AI ATS Checker

Upload a resume and a job description, get back an explainable ATS
compatibility score, keyword-level highlighting on the resume itself, and
prioritized, actionable recommendations - powered by a deterministic rule
engine plus a pluggable AI semantic engine (Ollama by default, OpenAI/Claude
optional).

```
Browser
  │
  ▼
frontend/ (Next.js)  --  POST /api/analyze
  │
  ├─ backend reachable? ── yes ──▶ backend/ (FastAPI)  --  POST /api/v1/analyze
  │                                   │
  │                                   ├─ Rule Engine (PyMuPDF, deterministic)
  │                                   ├─ AI Engine (Ollama / OpenAI / Claude)
  │                                   ▼
  │                              Scoring Engine ──▶ PostgreSQL
  │
  └─ no ──▶ local TS fallback engine (same UI, no persistence, no PyMuPDF checks)
```

## Two pieces, one product

| | [`frontend/`](frontend/README.md) | [`backend/`](backend/README.md) |
|---|---|---|
| Stack | Next.js 16, TypeScript, Tailwind v4 | FastAPI, PostgreSQL, SQLAlchemy/Alembic |
| Job | Upload UI, JD input, progress, score dashboard, highlighted resume, report, recommendations, PDF export | Deterministic PyMuPDF-based rule engine + pluggable LLM semantic engine + Postgres persistence |
| Standalone? | Yes - has its own complete fallback analysis engine, works with zero backend | Yes - a plain REST API, usable by anything, not just this frontend |

The frontend calls the backend when it's reachable (the backend's result is
authoritative - real layout analysis, real LLM judgment, persisted history)
and transparently falls back to its own engine when it isn't, so the app
never simply breaks because a service is down. Every result is labeled with
which engine actually produced it. See
[frontend/README.md § How analysis works](frontend/README.md#how-analysis-works)
for the integration details.

## Quickstart (full stack)

Prerequisites: Node.js >= 22.13, Python 3.12+, a running PostgreSQL server,
and (optional, for the default AI engine) a running [Ollama](https://ollama.com)
daemon with a model pulled (`ollama pull llama3.1`).

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
createdb ats_checker
alembic upgrade head
uvicorn app.main:app --reload --port 8000 &

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Skip the backend steps
entirely and the frontend still works, using its local fallback engine.

Full setup, environment variables, scripts, tests, and architecture details
live in each part's own README: [frontend/README.md](frontend/README.md),
[backend/README.md](backend/README.md).

## Status

Both frontend and backend are independently complete and tested, and wired
together as described above. Not yet built: authentication, PDF-coordinate-based
inline highlighting (the backend captures real word/table/image positions via
PyMuPDF; nothing consumes them yet), and production deployment (a
`Dockerfile`/`docker-compose.yml` exist for the backend but nothing is deployed).
