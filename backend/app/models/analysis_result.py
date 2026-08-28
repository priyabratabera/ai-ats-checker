import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AnalysisStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    complete = "complete"
    failed = "failed"


class AnalysisResult(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "analysis_results"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resume_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False
    )
    job_description_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("job_descriptions.id", ondelete="CASCADE"),
        nullable=False,
    )

    # POST /api/v1/analyze creates the row as "pending" and returns
    # immediately (202) - the worker/ process claims it, sets "processing",
    # runs the pipeline, and writes "complete"/"failed". See worker/main.py.
    status: Mapped[AnalysisStatus] = mapped_column(
        Enum(AnalysisStatus, name="analysis_status"),
        nullable=False,
        default=AnalysisStatus.pending,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # All three are null until the worker finishes (status="complete").
    overall_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # {"categories": [{"key": "keyword_match", "score": 88, "weight": 0.25, ...}, ...]}
    category_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {"matched": [...], "missing": [...], "partial": [...]}
    keyword_analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Raw structured output from the AI engine: job_match_score,
    # matched_skills, missing_skills, partial_matches, summary. Null if the
    # AI engine was unavailable and only the rule engine ran.
    ai_engine_output: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ai_provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ai_model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    user: Mapped["User | None"] = relationship(back_populates="analysis_results")  # noqa: F821
    resume: Mapped["Resume"] = relationship(back_populates="analysis_results")  # noqa: F821
    job_description: Mapped["JobDescription"] = relationship(  # noqa: F821
        back_populates="analysis_results"
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(  # noqa: F821
        back_populates="analysis_result", cascade="all, delete-orphan"
    )
