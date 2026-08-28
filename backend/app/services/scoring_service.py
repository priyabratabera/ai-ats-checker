from dataclasses import dataclass

from app.schemas.ai_engine import LLMAnalysisResult
from app.schemas.analysis import ScoreBreakdownOut, ScoreCategoryOut
from app.services.formatting_rules import FormattingCheckResult
from app.services.semantic_similarity import ExperienceMatchResult

# Weights per the product spec: 25/20/20/15/10/10 = 100.
WEIGHTS: dict[str, float] = {
    "keyword_match": 0.25,
    "skills_match": 0.20,
    "experience_match": 0.20,
    "structure": 0.15,
    "formatting": 0.10,
    "content_quality": 0.10,
}

LABELS: dict[str, str] = {
    "keyword_match": "Keyword Match",
    "skills_match": "Skills Match",
    "experience_match": "Experience Match",
    "structure": "Resume Structure",
    "formatting": "ATS Formatting",
    "content_quality": "Content Quality",
}


def _tier_summary(key: str, score: int) -> str:
    tier = "Excellent" if score >= 85 else "Good" if score >= 70 else "Needs work" if score >= 50 else "Weak"
    detail = {
        "keyword_match": "how many job-description terms appear in your resume",
        "skills_match": "overlap between listed skills/tools and what the role asks for",
        "experience_match": "how closely your experience matches the role's requirements",
        "structure": "presence and ordering of standard resume sections",
        "formatting": "ATS-readability: bullet usage, contact info, layout, tables/images",
        "content_quality": "how strong and quantified your bullet points are",
    }
    return f"{tier} - {detail[key]}."


def compute_content_quality_score(formatting: FormattingCheckResult) -> int:
    bullets = formatting.bullets
    if not bullets:
        return 40  # no bullets to judge content quality from at all

    quantified_ratio = (len(bullets) - len(formatting.low_quantification_bullets)) / len(bullets)
    weak_ratio = len(formatting.weak_phrases) / len(bullets)

    score = 100.0
    if quantified_ratio < 0.6:
        score -= (0.6 - quantified_ratio) * 100
    score -= min(30.0, weak_ratio * 100)
    return round(max(0, min(100, score)))


@dataclass
class CategoryScores:
    keyword_match: int
    skills_match: int
    experience_match: int
    structure: int
    formatting: int
    content_quality: int


def blend_experience_score(
    rule_experience: ExperienceMatchResult, ai_result: LLMAnalysisResult | None
) -> int:
    """
    The rule engine's cosine-similarity + years-of-experience heuristic is
    the deterministic baseline; the AI engine's job_match_score is a
    genuine semantic judgment call the rule engine can't make. When the AI
    engine ran, it dominates the blend - when it didn't, the rule engine
    signal is all we have.
    """
    if ai_result is None:
        return rule_experience.score
    return round(rule_experience.score * 0.35 + ai_result.job_match_score * 0.65)


def compute_score_breakdown(scores: CategoryScores) -> ScoreBreakdownOut:
    values = {
        "keyword_match": scores.keyword_match,
        "skills_match": scores.skills_match,
        "experience_match": scores.experience_match,
        "structure": scores.structure,
        "formatting": scores.formatting,
        "content_quality": scores.content_quality,
    }

    categories = [
        ScoreCategoryOut(
            key=key,
            label=LABELS[key],
            score=round(score),
            weight=WEIGHTS[key],
            summary=_tier_summary(key, round(score)),
        )
        for key, score in values.items()
    ]

    overall = round(sum(c.score * c.weight for c in categories))
    return ScoreBreakdownOut(overall=overall, categories=categories)
