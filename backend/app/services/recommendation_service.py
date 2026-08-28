from dataclasses import dataclass

from app.core.text_utils import STRONG_VERB_SUGGESTIONS
from app.schemas.ai_engine import LLMAnalysisResult
from app.services.formatting_rules import FormattingCheckResult
from app.services.keyword_matcher import KeywordAnalysis
from app.services.structure_rules import StructureCheckResult

_FORMATTING_TITLES: dict[str, str] = {
    "too-short": "Expand your resume with more detail",
    "too-long": "Tighten your resume length",
    "few-bullets": "Convert paragraphs into bullet points",
    "no-email": "Add a plain-text email address",
    "no-phone": "Add a plain-text phone number",
    "low-quantification": "Quantify more of your bullet points",
    "plain-text-upload": "Export as PDF or DOCX for the real submission",
    "uses-tables": "Remove tables from your PDF",
    "uses-images": "Remove images/graphics from your PDF",
    "multi-column-layout": "Switch to a single-column layout",
}

_PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


@dataclass
class RecommendationDraft:
    category: str
    priority: str
    source: str
    title: str
    description: str
    before_text: str | None = None
    after_text: str | None = None


def _priority_for_weight(weight: float) -> str:
    if weight >= 0.65:
        return "high"
    if weight >= 0.35:
        return "medium"
    return "low"


def build_recommendations(
    keyword_analysis: KeywordAnalysis,
    formatting: FormattingCheckResult,
    structure: StructureCheckResult,
    ai_result: LLMAnalysisResult | None,
    limit: int = 20,
) -> list[RecommendationDraft]:
    drafts: list[RecommendationDraft] = []

    top_missing = sorted(keyword_analysis.missing, key=lambda m: m.weight, reverse=True)[:6]
    for missing in top_missing:
        drafts.append(RecommendationDraft(
            category="keywords",
            priority=_priority_for_weight(missing.weight),
            source="rule_engine",
            title=f'Add the keyword "{missing.term}"',
            description=(
                f'The job description emphasizes "{missing.term}" but it doesn\'t appear '
                "anywhere in your resume. If it genuinely applies to your background, work "
                "it into a bullet point or your skills list in the same wording the job "
                "description uses."
            ),
        ))

    for issue in structure.issues:
        section = issue.id.replace("missing-", "")
        drafts.append(RecommendationDraft(
            category="structure",
            priority=issue.severity if issue.severity in _PRIORITY_ORDER else "low",
            source="rule_engine",
            title=(
                f'Add a clear "{section}" section heading'
                if issue.id.startswith("missing-")
                else "Fix section structure"
            ),
            description=issue.message,
        ))

    for issue in formatting.issues:
        if issue.id == "weak-language":
            continue  # covered by the dedicated weak-phrase drafts below
        drafts.append(RecommendationDraft(
            category="formatting",
            priority=issue.severity if issue.severity in _PRIORITY_ORDER else "low",
            source="rule_engine",
            title=_FORMATTING_TITLES.get(issue.id, "Fix a formatting issue"),
            description=issue.message,
        ))

    seen_phrases: set[str] = set()
    for phrase, _ in formatting.weak_phrases:
        key = phrase.lower()
        if key in seen_phrases:
            continue
        seen_phrases.add(key)
        suggestions = STRONG_VERB_SUGGESTIONS.get(key, ["Led", "Built", "Drove"])
        drafts.append(RecommendationDraft(
            category="content",
            priority="medium",
            source="rule_engine",
            title=f'Replace "{phrase}" with a stronger action verb',
            description=f'Passive phrasing undersells your ownership. Try "{suggestions[0]}" or "{suggestions[1]}" instead.',
            before_text=f"{phrase} managing the migration...",
            after_text=f"{suggestions[0]} the migration...",
        ))

    if formatting.low_quantification_bullets:
        drafts.append(RecommendationDraft(
            category="content",
            priority="medium",
            source="rule_engine",
            title="Quantify your achievements",
            description=(
                f"{len(formatting.low_quantification_bullets)} bullet point(s) have no "
                "numbers. Recruiters and ATS scoring both respond well to measurable impact."
            ),
            before_text="Improved team onboarding process",
            after_text="Redesigned onboarding process, cutting new-hire ramp time by 35%",
        ))

    if ai_result is not None:
        for ai_rec in ai_result.recommendations:
            priority = ai_rec.priority if ai_rec.priority in _PRIORITY_ORDER else "medium"
            drafts.append(RecommendationDraft(
                category=ai_rec.section.lower().strip() or "experience",
                priority=priority,
                source="ai_engine",
                title=ai_rec.recommendation[:120],
                description=ai_rec.recommendation,
            ))

    drafts.sort(key=lambda d: _PRIORITY_ORDER.get(d.priority, 1))
    return drafts[:limit]
