from dataclasses import dataclass

from app.schemas.parsing import LayoutFindings
from app.services.formatting_rules import FormattingCheckResult, run_formatting_checks
from app.services.keyword_matcher import (
    KeywordAnalysis,
    extract_keywords,
    keyword_score,
    match_keywords,
    skills_score,
)
from app.services.semantic_similarity import (
    ExperienceMatchResult,
    score_experience_match,
)
from app.services.structure_rules import StructureCheckResult, run_structure_checks


@dataclass
class RuleEngineResult:
    """
    Engine 1 - everything objectively checkable without an LLM: contact
    info, sections, word/page count, headings, dates, tables, images,
    column layout, and keyword frequency. See services/ats_engine.py
    module docstring context in scoring_service.py for how this combines
    with Engine 2 (the AI engine).
    """

    keyword_analysis: KeywordAnalysis
    formatting: FormattingCheckResult
    structure: StructureCheckResult
    experience: ExperienceMatchResult
    keyword_score: int
    skills_score: int


def run_rule_engine(
    resume_text: str, file_kind: str, layout: LayoutFindings, jd_text: str
) -> RuleEngineResult:
    keywords = extract_keywords(jd_text)
    keyword_analysis = match_keywords(resume_text, keywords)
    formatting = run_formatting_checks(resume_text, file_kind, layout)
    structure = run_structure_checks(resume_text)
    experience = score_experience_match(resume_text, jd_text)

    return RuleEngineResult(
        keyword_analysis=keyword_analysis,
        formatting=formatting,
        structure=structure,
        experience=experience,
        keyword_score=keyword_score(keyword_analysis),
        skills_score=skills_score(keyword_analysis),
    )
