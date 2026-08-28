import uuid

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


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

    overall_score: Mapped[int] = mapped_column(Integer, nullable=False)

    # {"keyword_match": {"score": 88, "weight": 0.25, ...}, "skills_match": {...}, ...}
    category_scores: Mapped[dict] = mapped_column(JSONB, nullable=False)

    # {"matched": [...], "missing": [...], "partial": [...]}
    keyword_analysis: Mapped[dict] = mapped_column(JSONB, nullable=False)

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
