"""
Polls Postgres for pending ATS analysis jobs and runs them - the async
counterpart to backend/'s POST /api/v1/analyze, which now only creates a
"pending" row and returns immediately instead of running the (10-20s+) AI
engine call inline.

Imports the backend's `app` package directly (same models/services/config -
see worker/Dockerfile and worker/README.md for how that's made importable);
this is intentionally not a separate copy of that logic.
"""

import asyncio
import logging
import signal
import uuid

from app.core.config import Settings, get_settings
from app.db.session import AsyncSessionLocal
from app.models import (
    AnalysisResult,
    AnalysisStatus,
    JobDescription,
    Recommendation,
    Resume,
)
from app.models.recommendation import RecommendationPriority, RecommendationSource
from app.schemas.parsing import LayoutFindings
from app.services.analysis_pipeline import run_analysis
from app.services.job_queue import claim_next_pending_analysis

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s worker: %(message)s")
logger = logging.getLogger("worker")

_shutdown = asyncio.Event()


def _request_shutdown(*_args: object) -> None:
    logger.info("Shutdown requested - finishing the current job, then exiting.")
    _shutdown.set()


async def _run_pipeline_and_record_failure_on_error(
    analysis_id: uuid.UUID, settings: Settings
) -> None:
    try:
        async with AsyncSessionLocal() as db:
            analysis_result = await db.get(AnalysisResult, analysis_id)
            resume = await db.get(Resume, analysis_result.resume_id)
            job_description = await db.get(JobDescription, analysis_result.job_description_id)
            # Pull out plain values before the session (and these ORM
            # objects) close, so the slow pipeline call below doesn't hold a
            # DB connection open for no reason.
            resume_text = resume.raw_text
            file_kind = resume.file_kind.value
            layout = LayoutFindings.model_validate(resume.extracted_data.get("layout", {}))
            jd_text = job_description.raw_text

        # Everything above is in the same try as the pipeline call itself -
        # a bad row (e.g. malformed extracted_data) is a job failure just
        # like an AI-engine exception, and must be recorded as "failed"
        # rather than silently leaving the row stuck in "processing".
        pipeline_result = await run_analysis(
            resume_text=resume_text,
            file_kind=file_kind,
            layout=layout,
            jd_text=jd_text,
            settings=settings,
        )
    except Exception:
        logger.exception("Analysis %s failed", analysis_id)
        async with AsyncSessionLocal() as db:
            analysis_result = await db.get(AnalysisResult, analysis_id)
            analysis_result.status = AnalysisStatus.failed
            analysis_result.error_message = "Analysis failed unexpectedly - see worker logs."
            await db.commit()
        return

    async with AsyncSessionLocal() as db:
        analysis_result = await db.get(AnalysisResult, analysis_id)
        analysis_result.overall_score = pipeline_result.score.overall
        analysis_result.category_scores = {
            "categories": [c.model_dump() for c in pipeline_result.score.categories]
        }
        analysis_result.keyword_analysis = pipeline_result.keyword_analysis.model_dump()
        analysis_result.ai_engine_output = (
            pipeline_result.ai_result.model_dump() if pipeline_result.ai_result else None
        )
        analysis_result.ai_provider = pipeline_result.ai_provider
        analysis_result.ai_model = pipeline_result.ai_model
        # Added directly (FK set explicitly) rather than via
        # analysis_result.recommendations = [...] - analysis_result is a
        # *persistent* object here (fetched with db.get, not freshly
        # constructed), so assigning to a relationship collection makes
        # SQLAlchemy lazy-load the current collection first to diff against,
        # which asyncpg doesn't support outside an explicit query.
        for draft in pipeline_result.recommendations:
            db.add(
                Recommendation(
                    analysis_result_id=analysis_result.id,
                    category=draft.category,
                    priority=RecommendationPriority(draft.priority),
                    source=RecommendationSource(draft.source),
                    title=draft.title,
                    description=draft.description,
                    before_text=draft.before_text,
                    after_text=draft.after_text,
                )
            )
        analysis_result.status = AnalysisStatus.complete
        await db.commit()
        logger.info(
            "Completed analysis %s - overall score %s", analysis_id, pipeline_result.score.overall
        )


async def poll_loop() -> None:
    settings = get_settings()
    logger.info(
        "Started. ai_provider=%s poll_interval=%ss",
        settings.ai_provider,
        settings.worker_poll_interval_seconds,
    )

    while not _shutdown.is_set():
        async with AsyncSessionLocal() as db:
            claimed = await claim_next_pending_analysis(db)
            claimed_id = claimed.id if claimed is not None else None

        if claimed_id is None:
            try:
                await asyncio.wait_for(
                    _shutdown.wait(), timeout=settings.worker_poll_interval_seconds
                )
            except TimeoutError:
                pass
            continue

        logger.info("Claimed analysis %s", claimed_id)
        try:
            await _run_pipeline_and_record_failure_on_error(claimed_id, settings)
        except Exception:
            # Belt-and-suspenders: _run_pipeline_and_record_failure_on_error
            # already catches pipeline errors and records status="failed".
            # This catches anything else (e.g. the DB write itself failing)
            # so one bad job can't take the whole poll loop down - the row
            # is left in "processing" (see README's known limitation).
            logger.exception("Unexpected error handling analysis %s", claimed_id)

    logger.info("Stopped.")


def main() -> None:
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, _request_shutdown)
        except NotImplementedError:
            # add_signal_handler isn't available on every platform (e.g. Windows)
            pass
    loop.run_until_complete(poll_loop())


if __name__ == "__main__":
    main()
