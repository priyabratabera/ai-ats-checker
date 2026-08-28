from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.ai_engine import LLMAnalysisResult


class ScoreCategoryOut(BaseModel):
    key: str
    label: str
    score: int
    weight: float
    summary: str


class ScoreBreakdownOut(BaseModel):
    overall: int
    categories: list[ScoreCategoryOut]


class KeywordMatchOut(BaseModel):
    term: str
    count: int
    weight: float


class KeywordMissingOut(BaseModel):
    term: str
    weight: float


class KeywordPartialOut(BaseModel):
    term: str
    matched_as: str


class KeywordAnalysisOut(BaseModel):
    matched: list[KeywordMatchOut]
    missing: list[KeywordMissingOut]
    partial: list[KeywordPartialOut]


class RecommendationOut(BaseModel):
    id: UUID
    category: str
    priority: str
    source: str
    title: str
    description: str
    before_text: str | None = None
    after_text: str | None = None


class ResumeOut(BaseModel):
    id: UUID
    file_name: str
    file_kind: str
    file_size_bytes: int
    word_count: int
    page_count: int | None
    extracted_data: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class JobDescriptionOut(BaseModel):
    id: UUID
    title: str | None
    raw_text: str
    word_count: int
    extracted_requirements: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyzeRequest(BaseModel):
    resume_id: UUID
    job_description_id: UUID


class AnalysisResultOut(BaseModel):
    id: UUID
    resume_id: UUID
    job_description_id: UUID
    # "pending" | "processing" | "complete" | "failed" - see
    # app.models.AnalysisStatus. The fields below are only populated once
    # status == "complete"; error_message only when status == "failed".
    status: str
    error_message: str | None = None
    score: ScoreBreakdownOut | None = None
    keyword_analysis: KeywordAnalysisOut | None = None
    ai_engine_output: LLMAnalysisResult | None = None
    ai_provider: str | None = None
    ai_model: str | None = None
    recommendations: list[RecommendationOut] = []
    created_at: datetime


class AnalysisListItemOut(BaseModel):
    """One row per completed ATS check (not one row per unique user) - the
    same person checking 3 resumes shows up as 3 rows, each with its own
    timestamp. See GET /api/v1/analyses."""

    id: UUID
    name: str | None
    email: str | None
    resume_file_name: str
    status: str
    overall_score: int | None
    created_at: datetime
