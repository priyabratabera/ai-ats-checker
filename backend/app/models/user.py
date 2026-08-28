from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Lightweight identification, not authentication - visitors self-report a
    name + email before checking their ATS score (see POST /api/v1/users),
    identified by email (get-or-create). No login, password, or session -
    resumes/job_descriptions/analysis_results carry a nullable user_id so
    anonymous use still works if the frontend's local fallback engine runs
    instead of this backend.
    """

    __tablename__ = "users"

    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True, nullable=True)

    resumes: Mapped[list["Resume"]] = relationship(back_populates="user")  # noqa: F821
    job_descriptions: Mapped[list["JobDescription"]] = relationship(back_populates="user")  # noqa: F821
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(back_populates="user")  # noqa: F821
