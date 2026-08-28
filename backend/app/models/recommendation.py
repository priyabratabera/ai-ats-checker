import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class RecommendationPriority(str, enum.Enum):
    high = "high"
    medium = "medium"
    low = "low"


class RecommendationSource(str, enum.Enum):
    rule_engine = "rule_engine"
    ai_engine = "ai_engine"


class Recommendation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "recommendations"

    analysis_result_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("analysis_results.id", ondelete="CASCADE"),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[RecommendationPriority] = mapped_column(
        Enum(RecommendationPriority, name="recommendation_priority"), nullable=False
    )
    source: Mapped[RecommendationSource] = mapped_column(
        Enum(RecommendationSource, name="recommendation_source"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    before_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    after_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    analysis_result: Mapped["AnalysisResult"] = relationship(  # noqa: F821
        back_populates="recommendations"
    )
