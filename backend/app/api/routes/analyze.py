from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession
from app.models import AnalysisResult, JobDescription, Resume
from app.schemas.analysis import (
    AnalysisListItemOut,
    AnalysisResultOut,
    AnalyzeRequest,
    RecommendationOut,
)

router = APIRouter(prefix="/api/v1", tags=["analysis"])


def _to_result_out(result: AnalysisResult) -> AnalysisResultOut:
    score = None
    if result.overall_score is not None and result.category_scores is not None:
        score = {
            "overall": result.overall_score,
            "categories": result.category_scores["categories"],
        }

    return AnalysisResultOut(
        id=result.id,
        resume_id=result.resume_id,
        job_description_id=result.job_description_id,
        status=result.status.value,
        error_message=result.error_message,
        score=score,
        keyword_analysis=result.keyword_analysis,
        ai_engine_output=result.ai_engine_output,
        ai_provider=result.ai_provider,
        ai_model=result.ai_model,
        recommendations=[
            RecommendationOut(
                id=r.id,
                category=r.category,
                priority=r.priority.value,
                source=r.source.value,
                title=r.title,
                description=r.description,
                before_text=r.before_text,
                after_text=r.after_text,
            )
            for r in result.recommendations
        ],
        created_at=result.created_at,
    )


@router.post("/analyze", response_model=AnalysisResultOut, status_code=202)
async def analyze(body: AnalyzeRequest, db: DbSession) -> AnalysisResultOut:
    """
    Queues a check rather than running it inline: creates a "pending"
    AnalysisResult row and returns immediately (202). worker/ polls for
    pending rows, runs the actual rule engine + AI engine pipeline, and
    writes the result - poll GET /api/v1/analyses/{id} until status is
    "complete" (or "failed").
    """
    resume = await db.get(Resume, body.resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")

    job_description = await db.get(JobDescription, body.job_description_id)
    if job_description is None:
        raise HTTPException(status_code=404, detail="Job description not found.")

    analysis_result = AnalysisResult(
        user_id=resume.user_id,
        resume_id=resume.id,
        job_description_id=job_description.id,
    )
    db.add(analysis_result)
    await db.commit()
    await db.refresh(analysis_result)

    # Deliberately not using _to_result_out here: even *assigning* [] to
    # analysis_result.recommendations would make SQLAlchemy diff against the
    # current collection first, which means lazy-loading it - unsupported
    # under asyncpg outside an explicit query. A freshly created row has no
    # recommendations yet regardless, so this is built directly instead of
    # touching that relationship at all.
    return AnalysisResultOut(
        id=analysis_result.id,
        resume_id=analysis_result.resume_id,
        job_description_id=analysis_result.job_description_id,
        status=analysis_result.status.value,
        created_at=analysis_result.created_at,
    )


@router.get("/analyses", response_model=list[AnalysisListItemOut])
async def list_analyses(db: DbSession, limit: int = 500) -> list[AnalysisListItemOut]:
    """
    Read-only listing, one row per completed ATS check (not one row per
    unique user) - the same person checking multiple resumes appears once
    per check, most recent first. Powers the frontend's /users page.
    """
    results = await db.scalars(
        select(AnalysisResult)
        .options(selectinload(AnalysisResult.user), selectinload(AnalysisResult.resume))
        .order_by(AnalysisResult.created_at.desc())
        .limit(limit)
    )
    return [
        AnalysisListItemOut(
            id=r.id,
            name=r.user.name if r.user else None,
            email=r.user.email if r.user else None,
            resume_file_name=r.resume.file_name,
            status=r.status.value,
            overall_score=r.overall_score,
            created_at=r.created_at,
        )
        for r in results
    ]


@router.get("/analyses/{analysis_id}", response_model=AnalysisResultOut)
async def get_analysis(analysis_id: UUID, db: DbSession) -> AnalysisResultOut:
    result = await db.get(
        AnalysisResult, analysis_id, options=[selectinload(AnalysisResult.recommendations)]
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    return _to_result_out(result)
