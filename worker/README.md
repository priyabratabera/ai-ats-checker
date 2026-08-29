# ATS Checker - Worker

Background job processor for the slow part of an ATS check: the AI engine
call (Ollama/OpenAI/Claude, typically 10-20s+). It exists so `POST
/api/v1/analyze` on the [backend](../backend/README.md) doesn't have to
block an HTTP request for that long.

```
POST /api/v1/analyze  ->  creates analysis_results row, status="pending"  ->  responds 202 immediately
                                          |
                                          v
                          worker/main.py polls Postgres for "pending" rows
                                          |
                          claims one (status -> "processing"), runs the
                          same rule engine + AI engine pipeline the old
                          synchronous endpoint used to run inline
                                          |
                                          v
                    writes score/keywords/recommendations, status -> "complete"
                    (or "failed" + error_message on an unhandled exception)
                                          |
                                          v
              client polls GET /api/v1/analyses/{id} until status is settled
```

## Why polling Postgres instead of a real queue (Redis/Celery/RQ)

No new infrastructure to run - this project already avoids extra moving
parts where they're not earning their cost (same reasoning as skipping
ChromaDB - see the root README). The tradeoff is polling latency (a job can
sit up to `WORKER_POLL_INTERVAL_SECONDS` before being picked up) and it
doesn't scale to high job volume. If this ever needs to handle real
concurrent load, that's the point to introduce a proper broker.

Multiple worker instances can run safely at once: claiming a job uses
`SELECT ... FOR UPDATE SKIP LOCKED` (`backend/app/services/job_queue.py`),
so two workers polling concurrently never grab the same row.

## Why this isn't a separate copy of the analysis logic

`worker/main.py` imports `app.services.analysis_pipeline`,
`app.models`, `app.db`, `app.core.config` - the **same** `app` package the
backend uses, not a duplicate. In Docker, the image is built with the repo
root as context so `worker/Dockerfile` can `COPY backend/app ./app`. There's
no independent "worker service" codebase to keep in sync - the backend's
`app/` is the single source of truth for the domain logic; this directory
only adds the polling loop and its own (smaller) dependency set - no
FastAPI/uvicorn, no PyMuPDF/python-docx (resume parsing already happened at
upload time), no Alembic (migrations are a backend concern).

## Running locally (no Docker)

Reuses the backend's virtualenv, since backend/requirements.txt is a
superset of worker/requirements.txt:

```bash
cd backend
source .venv/bin/activate   # created per backend/README.md
cd ..
cp worker/.env.example worker/.env   # defaults work with local Postgres + local Ollama
PYTHONPATH=backend python worker/main.py
```

`PYTHONPATH=backend` is what makes `backend/app` importable as `app` from
here - the same trick the Dockerfile achieves by copying instead.

## Running via Docker

See the root [`docker-compose.yml`](../docker-compose.yml) - `docker compose up`
brings up Postgres, the API, this worker, and the frontend together.

## Environment variables

Same shape as [`backend/.env.example`](../backend/.env.example) (it reads
the same `Settings` class) plus `WORKER_POLL_INTERVAL_SECONDS` (default 3).
See [`.env.example`](.env.example).

## Known limitation

If the worker crashes mid-job, that row stays `status="processing"` forever
- there's no timeout/requeue logic yet. For this project's current scale
that's an acceptable manual-cleanup case rather than something worth adding
retry infrastructure for; flagged here rather than silently accepted.
