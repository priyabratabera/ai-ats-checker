from uuid import UUID

from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import selectinload

from app.api.deps import AppSettings, DbSession
from app.models import AnalysisResult, JobDescription, Recommendation, Resume
from app.models.recommendation import RecommendationPriority, RecommendationSource
from app.schemas.analysis import AnalysisResultOut, AnalyzeRequest, RecommendationOut
from app.schemas.parsing import LayoutFindings
from app.services.analysis_pipeline import run_analysis

router = APIRouter(prefix="/api/v1", tags=["analysis"])


def _to_result_out(result: AnalysisResult) -> AnalysisResultOut:
    return AnalysisResultOut(
        id=result.id,
        resume_id=result.resume_id,
        job_description_id=result.job_description_id,
        score={
            "overall": result.overall_score,
            "categories": result.category_scores["categories"],
        },
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


@router.post("/analyze", response_model=AnalysisResultOut, status_code=201)
async def analyze(body: AnalyzeRequest, db: DbSession, settings: AppSettings) -> AnalysisResultOut:
    resume = await db.get(Resume, body.resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")

    job_description = await db.get(JobDescription, body.job_description_id)
    if job_description is None:
        raise HTTPException(status_code=404, detail="Job description not found.")

    layout = LayoutFindings.model_validate(resume.extracted_data.get("layout", {}))

    pipeline_result = await run_analysis(
        resume_text=resume.raw_text,
        file_kind=resume.file_kind.value,
        layout=layout,
        jd_text=job_description.raw_text,
        settings=settings,
    )

    analysis_result = AnalysisResult(
        resume_id=resume.id,
        job_description_id=job_description.id,
        overall_score=pipeline_result.score.overall,
        category_scores={"categories": [c.model_dump() for c in pipeline_result.score.categories]},
        keyword_analysis=pipeline_result.keyword_analysis.model_dump(),
        ai_engine_output=pipeline_result.ai_result.model_dump() if pipeline_result.ai_result else None,
        ai_provider=pipeline_result.ai_provider,
        ai_model=pipeline_result.ai_model,
    )
    analysis_result.recommendations = [
        Recommendation(
            category=draft.category,
            priority=RecommendationPriority(draft.priority),
            source=RecommendationSource(draft.source),
            title=draft.title,
            description=draft.description,
            before_text=draft.before_text,
            after_text=draft.after_text,
        )
        for draft in pipeline_result.recommendations
    ]

    db.add(analysis_result)
    await db.commit()
    await db.refresh(analysis_result, attribute_names=["recommendations"])

    return _to_result_out(analysis_result)


@router.get("/analyses/{analysis_id}", response_model=AnalysisResultOut)
async def get_analysis(analysis_id: UUID, db: DbSession) -> AnalysisResultOut:
    result = await db.get(
        AnalysisResult, analysis_id, options=[selectinload(AnalysisResult.recommendations)]
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis result not found.")
    return _to_result_out(result)
