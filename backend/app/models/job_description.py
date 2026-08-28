import uuid

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class JobDescription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "job_descriptions"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str | None] = mapped_column(String(300), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False)

    # Rule-based requirement extraction: weighted keywords, skill terms,
    # required years of experience, must-have vs nice-to-have cues. See
    # services/jd_analyzer.py.
    extracted_requirements: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    user: Mapped["User | None"] = relationship(back_populates="job_descriptions")  # noqa: F821
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(  # noqa: F821
        back_populates="job_description"
    )
