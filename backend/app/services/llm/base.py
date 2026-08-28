from abc import ABC, abstractmethod

from app.schemas.ai_engine import LLMAnalysisResult


class LLMProviderError(Exception):
    """Raised when the configured AI engine can't produce a result (network,
    auth, or unparseable response). Callers should catch this and fall back
    to rule-engine-only scoring rather than fail the whole analysis."""


class LLMProvider(ABC):
    name: str

    @abstractmethod
    async def analyze_semantic_match(
        self, resume_text: str, jd_text: str
    ) -> LLMAnalysisResult:
        """Run Engine 2 (semantic judgment only - see prompts.py) and return
        its structured output. Raises LLMProviderError on failure."""

    @abstractmethod
    def model_name(self) -> str: ...
