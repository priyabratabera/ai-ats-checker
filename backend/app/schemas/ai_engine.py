from pydantic import BaseModel, Field


class PartialMatch(BaseModel):
    requirement: str
    evidence: str


class AiRecommendation(BaseModel):
    priority: str  # high | medium | low
    section: str
    recommendation: str


class LLMAnalysisResult(BaseModel):
    """
    The AI engine's ENTIRE job: semantic judgment calls a rule engine can't
    make (does experience genuinely match the JD, is a claimed skill
    actually demonstrated, are bullet points strong). It does not compute
    any score by itself beyond job_match_score, which the scoring engine
    blends with the deterministic rule-engine scores - see scoring_service.py.
    """

    job_match_score: int = Field(ge=0, le=100)
    matched_skills: list[str] = []
    missing_skills: list[str] = []
    partial_matches: list[PartialMatch] = []
    recommendations: list[AiRecommendation] = []
    summary: str = ""
