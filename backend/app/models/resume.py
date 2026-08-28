import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FileKind(str, enum.Enum):
    pdf = "pdf"
    docx = "docx"
    txt = "txt"


class Resume(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "resumes"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    file_kind: Mapped[FileKind] = mapped_column(Enum(FileKind, name="file_kind"), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_text: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, nullable=False)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Deterministic engine findings: contact info, section headings found,
    # bullet/date stats, table/image/column-layout flags. See
    # services/resume_parser.py + services/ats_engine.py for the shape.
    extracted_data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    user: Mapped["User | None"] = relationship(back_populates="resumes")  # noqa: F821
    analysis_results: Mapped[list["AnalysisResult"]] = relationship(  # noqa: F821
        back_populates="resume"
    )
