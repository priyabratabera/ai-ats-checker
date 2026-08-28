from app.schemas.ai_engine import LLMAnalysisResult
from app.services.scoring_service import (
    CategoryScores,
    blend_experience_score,
    compute_score_breakdown,
)
from app.services.semantic_similarity import ExperienceMatchResult


class TestComputeScoreBreakdown:
    def test_weighted_overall_matches_spec_weights(self):
        scores = CategoryScores(
            keyword_match=88, skills_match=91, experience_match=84,
            structure=100, formatting=72, content_quality=80,
        )
        breakdown = compute_score_breakdown(scores)
        assert len(breakdown.categories) == 6
        # 88*.25 + 91*.20 + 84*.20 + 100*.15 + 72*.10 + 80*.10 = 87.2
        assert breakdown.overall == 87

    def test_all_perfect_scores_100(self):
        scores = CategoryScores(100, 100, 100, 100, 100, 100)
        assert compute_score_breakdown(scores).overall == 100

    def test_all_zero_scores_0(self):
        scores = CategoryScores(0, 0, 0, 0, 0, 0)
        assert compute_score_breakdown(scores).overall == 0

    def test_weights_sum_to_one(self):
        from app.services.scoring_service import WEIGHTS

        assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9


class TestBlendExperienceScore:
    def test_uses_rule_score_alone_when_ai_unavailable(self):
        rule = ExperienceMatchResult(score=60, required_years=5, estimated_years=3, semantic_overlap=0.4)
        assert blend_experience_score(rule, None) == 60

    def test_blends_with_ai_score_when_available(self):
        rule = ExperienceMatchResult(score=60, required_years=5, estimated_years=3, semantic_overlap=0.4)
        ai = LLMAnalysisResult(job_match_score=90)
        blended = blend_experience_score(rule, ai)
        # 60*0.35 + 90*0.65 = 79.5 -> 80
        assert blended == 80
