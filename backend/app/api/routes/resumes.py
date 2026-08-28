from uuid import UUID

from fastapi import APIRouter, Form, HTTPException, UploadFile

from app.api.deps import AppSettings, DbSession, ensure_user_exists
from app.models import FileKind, Resume
from app.schemas.analysis import ResumeOut
from app.services.resume_parser import (
    EmptyResumeError,
    UnsupportedFileTypeError,
    parse_resume,
)

router = APIRouter(prefix="/api/v1/resumes", tags=["resumes"])


@router.post("", response_model=ResumeOut, status_code=201)
async def upload_resume(
    file: UploadFile,
    db: DbSession,
    settings: AppSettings,
    user_id: UUID | None = Form(default=None),  # noqa: B008 - FastAPI's own injection pattern
) -> Resume:
    await ensure_user_exists(user_id, db)
    buffer = await file.read()

    if len(buffer) == 0:
        raise HTTPException(status_code=400, detail="The uploaded resume file is empty.")
    if len(buffer) > settings.max_upload_size_bytes:
        max_mb = settings.max_upload_size_bytes / (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Resume file is too large. Maximum size is {max_mb} MB.")

    try:
        parsed = parse_resume(buffer, file.filename or "resume", file.content_type or "")
    except UnsupportedFileTypeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except EmptyResumeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    resume = Resume(
        user_id=user_id,
        file_name=file.filename or "resume",
        file_kind=FileKind(parsed.file_kind),
        file_size_bytes=len(buffer),
        raw_text=parsed.text,
        word_count=parsed.word_count,
        page_count=parsed.layout.page_count,
        extracted_data={
            "contact": parsed.contact.model_dump(),
            "layout": parsed.layout.model_dump(),
        },
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


@router.get("/{resume_id}", response_model=ResumeOut)
async def get_resume(resume_id: UUID, db: DbSession) -> Resume:
    resume = await db.get(Resume, resume_id)
    if resume is None:
        raise HTTPException(status_code=404, detail="Resume not found.")
    return resume
