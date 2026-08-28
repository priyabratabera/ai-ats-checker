from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import DbSession
from app.core.text_utils import count_words
from app.models import JobDescription
from app.schemas.analysis import JobDescriptionOut
from app.services.jd_analyzer import analyze_job_description

router = APIRouter(prefix="/api/v1/job-descriptions", tags=["job-descriptions"])

MIN_JD_LENGTH = 40
MAX_JD_LENGTH = 20000


class CreateJobDescriptionRequest(BaseModel):
    raw_text: str = Field(min_length=MIN_JD_LENGTH, max_length=MAX_JD_LENGTH)
    title: str | None = None


@router.post("", response_model=JobDescriptionOut, status_code=201)
async def create_job_description(body: CreateJobDescriptionRequest, db: DbSession) -> JobDescription:
    text = body.raw_text.strip()
    jd = JobDescription(
        title=body.title,
        raw_text=text,
        word_count=count_words(text),
        extracted_requirements=analyze_job_description(text),
    )
    db.add(jd)
    await db.commit()
    await db.refresh(jd)
    return jd


@router.get("/{job_description_id}", response_model=JobDescriptionOut)
async def get_job_description(job_description_id: UUID, db: DbSession) -> JobDescription:
    jd = await db.get(JobDescription, job_description_id)
    if jd is None:
        raise HTTPException(status_code=404, detail="Job description not found.")
    return jd
