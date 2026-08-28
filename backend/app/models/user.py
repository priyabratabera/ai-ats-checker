from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Minimal placeholder for future auth. No authentication is implemented
    yet - resumes/job_descriptions/analysis_results all carry a nullable
    user_id so the app runs single-tenant today and can be scoped to real
    accounts later without a schema change.
    """

    __tablename__ = "users"

    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True)

    resumes: Mapped[list["Resume"]] = relationship(back_populates="user")  # noqa: F821
    job_descriptions: Mapped[list["JobDescription"]] = relationship(back_populates="user")  # noqa: F821
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(back_populates="user")  # noqa: F821
