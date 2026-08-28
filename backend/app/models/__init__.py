"""
Import every model module here so all classes are registered on Base's
mapper registry before any relationship() string forward-reference (e.g.
Mapped["Resume"]) is resolved. Alembic's env.py and app.main both import
this package for that side effect - don't remove an import even if it
looks unused.
"""

from app.models.analysis_result import AnalysisResult, AnalysisStatus
from app.models.job_description import JobDescription
from app.models.recommendation import (
    Recommendation,
    RecommendationPriority,
    RecommendationSource,
)
from app.models.resume import FileKind, Resume
from app.models.user import User

__all__ = [
    "AnalysisResult",
    "AnalysisStatus",
    "FileKind",
    "JobDescription",
    "Recommendation",
    "RecommendationPriority",
    "RecommendationSource",
    "Resume",
    "User",
]
