import logging

from app.core.config import Settings
from app.schemas.ai_engine import LLMAnalysisResult
from app.schemas.analysis import (
    KeywordAnalysisOut,
    KeywordMatchOut,
    KeywordMissingOut,
    KeywordPartialOut,
    ScoreBreakdownOut,
)
from app.schemas.parsing import LayoutFindings
from app.services.ats_engine import run_rule_engine
from app.services.llm.base import LLMProviderError
from app.services.llm.factory import get_llm_provider
from app.services.recommendation_service import (
    RecommendationDraft,
    build_recommendations,
)
from app.services.scoring_service import (
    CategoryScores,
    blend_experience_score,
    compute_content_quality_score,
    compute_score_breakdown,
)

logger = logging.getLogger(__name__)


class AnalysisPipelineResult:
    def __init__(
        self,
        score: ScoreBreakdownOut,
        keyword_analysis: KeywordAnalysisOut,
        ai_result: LLMAnalysisResult | None,
        ai_provider: str | None,
        ai_model: str | None,
        recommendations: list[RecommendationDraft],
    ):
        self.score = score
        self.keyword_analysis = keyword_analysis
        self.ai_result = ai_result
        self.ai_provider = ai_provider
        self.ai_model = ai_model
        self.recommendations = recommendations


def _to_keyword_analysis_out(ka) -> KeywordAnalysisOut:
    return KeywordAnalysisOut(
        matched=[KeywordMatchOut(term=m.term, count=m.count, weight=m.weight) for m in ka.matched],
        missing=[KeywordMissingOut(term=m.term, weight=m.weight) for m in ka.missing],
        partial=[KeywordPartialOut(term=p.term, matched_as=p.matched_as) for p in ka.partial],
    )


async def run_analysis(
    resume_text: str,
    file_kind: str,
    layout: LayoutFindings,
    jd_text: str,
    settings: Settings,
) -> AnalysisPipelineResult:
    rule_result = run_rule_engine(resume_text, file_kind, layout, jd_text)

    ai_result: LLMAnalysisResult | None = None
    ai_provider_name: str | None = None
    ai_model_name: str | None = None
    try:
        provider = get_llm_provider(settings)
        ai_result = await provider.analyze_semantic_match(resume_text, jd_text)
        ai_provider_name = provider.name
        ai_model_name = provider.model_name()
    except LLMProviderError as exc:
        # Engine 2 is a best-effort enhancement - Engine 1 alone still
        # produces a complete, useful analysis.
        logger.warning("AI engine unavailable, falling back to rule-engine-only scoring: %s", exc)

    content_quality = compute_content_quality_score(rule_result.formatting)
    experience_score = blend_experience_score(rule_result.experience, ai_result)

    category_scores = CategoryScores(
        keyword_match=rule_result.keyword_score,
        skills_match=rule_result.skills_score,
        experience_match=experience_score,
        structure=rule_result.structure.score,
        formatting=rule_result.formatting.score,
        content_quality=content_quality,
    )
    score = compute_score_breakdown(category_scores)

    recommendations = build_recommendations(
        keyword_analysis=rule_result.keyword_analysis,
        formatting=rule_result.formatting,
        structure=rule_result.structure,
        ai_result=ai_result,
    )

    return AnalysisPipelineResult(
        score=score,
        keyword_analysis=_to_keyword_analysis_out(rule_result.keyword_analysis),
        ai_result=ai_result,
        ai_provider=ai_provider_name,
        ai_model=ai_model_name,
        recommendations=recommendations,
    )
