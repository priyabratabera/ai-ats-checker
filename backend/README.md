# ATS Checker - Backend

FastAPI + PostgreSQL backend implementing two independent analysis engines,
combined by a scoring engine - the design goal being that the LLM never
calculates anything a deterministic check can verify.

The [frontend](../frontend/README.md) proxies to this service when it's
reachable and falls back to its own local engine otherwise - see
[../README.md](../README.md) for the full picture. This backend has no
knowledge of the frontend; it's a standalone API consumable by anything.

```
                 Resume
                    |
          +---------+---------+
          v                   v
    ATS Rule Engine        AI Engine
   (Python, no LLM)     (Ollama / OpenAI / Claude)
          |                   |
          v                   v
   Objective Score        AI Score
          |                   |
          +---------+---------+
                    v
             Scoring Engine
                    v
              Final Score
```

## Engine 1 - deterministic rule engine (`app/services/ats_engine.py` + friends)

Everything objectively checkable without an LLM, using [PyMuPDF](https://pymupdf.readthedocs.io/)
for real positional/layout data (not just plain text):

- Contact info (email/phone/URL), resume sections, word count, page count
- Bullet usage, weak/passive phrasing, quantified-achievement ratio
- Dates and date-format consistency
- **Tables, images, and multi-column layout** - detected from the PDF's
  actual text-block coordinates and embedded objects (`page.find_tables()`,
  `page.get_images()`, and a column-layout heuristic over block bounding
  boxes) - all of which commonly break real ATS parsers and none of which a
  plain-text-only engine could ever see
- Keyword/skill frequency against the job description, via a curated
  synonym taxonomy (`app/core/skill_taxonomy.py`)

## Engine 2 - AI semantic engine (`app/services/llm/`)

The LLM's job is strictly the judgment calls a rule engine can't make -
does the experience genuinely match, is a claimed skill actually
demonstrated, are bullet points strong, what should be rewritten (using
only facts already in the resume - the system prompt explicitly forbids
inventing experience). It returns **only** structured JSON matching
`app/schemas/ai_engine.py::LLMAnalysisResult` - see `app/services/llm/prompts.py`
for the exact contract.

Three interchangeable providers behind one `LLMProvider` interface
(`app/services/llm/base.py`):

| Provider | Default | Needs |
|---|---|---|
| `ollama` (default) | `llama3.1` | A local Ollama daemon - no API key, fully offline |
| `openai` | `gpt-4o-mini` | `OPENAI_API_KEY` |
| `anthropic` | `claude-opus-5` | `ANTHROPIC_API_KEY` |

Switch via the `AI_PROVIDER` env var. **If the configured provider is
unavailable or fails, analysis falls back to Engine 1 alone rather than
failing the request** - see `app/services/analysis_pipeline.py`.

## Scoring engine (`app/services/scoring_service.py`)

```
25%  Keyword Match       (Engine 1)
20%  Skills Match        (Engine 1)
20%  Experience Match    (Engine 1 baseline, blended 65% toward Engine 2's
                          job_match_score when the AI engine ran)
15%  Resume Structure    (Engine 1)
10%  ATS Formatting      (Engine 1)
10%  Content Quality     (Engine 1: quantification ratio + weak-phrase density)
```

This is an application-specific compatibility score, not an official/universal
ATS score - different real ATS products score differently.

## Database

PostgreSQL via SQLAlchemy 2.0 (async, `asyncpg`) + Alembic migrations.
Five tables: `users`, `resumes`, `job_descriptions`, `analysis_results`,
`recommendations`. **This is identification, not authentication** - the
frontend collects a name + email before analysis and `POST /api/v1/users`
get-or-creates a row by email (anyone can claim any email; there's no
password or session), and `resume_id`/`job_description_id`/`analysis_id`
requests all carry an optional `user_id` that's resolved from that row.
Every `user_id` column stays nullable, so anonymous use still works (e.g.
when the frontend's local fallback engine runs instead of this backend).
ChromaDB/vector storage is intentionally not used for this first version.

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/users` | Get-or-create a user by email (identification, not auth) |
| `POST` | `/api/v1/resumes` | Upload + parse a PDF/DOCX/TXT resume, persist it (optional `user_id`) |
| `GET` | `/api/v1/resumes/{id}` | Fetch a stored resume |
| `POST` | `/api/v1/job-descriptions` | Submit JD text, persist extracted requirements (optional `user_id`) |
| `GET` | `/api/v1/job-descriptions/{id}` | Fetch a stored job description |
| `POST` | `/api/v1/analyze` | Run both engines against a resume + JD, persist + return the full result |
| `GET` | `/api/v1/analyses/{id}` | Fetch a stored analysis result + recommendations |
| `GET` | `/api/v1/health` | DB connectivity + active AI provider |

Interactive docs at `/docs` once the server is running.

## Not yet built (see the phased plan)

- PDF-coordinate-based inline highlighting (Engine 1 already captures
  table/image/column positions via PyMuPDF's word/block coordinates in
  `resume_parser.py`, but nothing in the API surfaces them yet - the
  frontend's highlighting today is text-search-based, computed on its own
  side from this backend's `keyword_analysis` rather than from these real
  positions)
- Authentication
- Production deployment (containerized here via `Dockerfile`/`docker-compose.yml`,
  but not deployed)

## Setup

Requires Python 3.12+ (developed against 3.14 locally; the Docker image
pins 3.12 for broader wheel availability) and a running PostgreSQL server.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt   # or requirements.txt for runtime-only

cp .env.example .env                  # defaults work with local Postgres + local Ollama
createdb ats_checker                  # or set DATABASE_URL to point elsewhere
alembic upgrade head

uvicorn app.main:app --reload --port 8000
```

Or via Docker (Postgres + API; point `OLLAMA_BASE_URL` at your host's
Ollama if you want Engine 2 active):

```bash
cp .env.example .env
docker compose up --build
```

## Tests

```bash
pytest
```

Covers the deterministic rule engine (keyword matching, formatting/structure
checks, scoring math) and the parsers (real PDF/DOCX bytes generated
in-memory). The LLM providers aren't unit-tested against a live model - they
were verified manually end-to-end against a running Ollama instance during
development; `analysis_pipeline.py`'s fallback path (AI engine unavailable ->
rule-engine-only) is what actually needs to hold up in production, and that
*is* exercised by the pipeline design (any `LLMProviderError` degrades
gracefully rather than failing the request).
