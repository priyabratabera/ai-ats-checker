from dataclasses import dataclass, field

from app.core.text_utils import (
    EMAIL_PATTERN,
    PHONE_PATTERN,
    contains_number,
    count_words,
    find_weak_phrases,
    split_into_bullets,
)
from app.schemas.parsing import LayoutFindings


@dataclass
class FormattingIssue:
    id: str
    message: str
    severity: str  # low | medium | high
    deduction: int


@dataclass
class FormattingCheckResult:
    score: int
    issues: list[FormattingIssue] = field(default_factory=list)
    bullets: list[str] = field(default_factory=list)
    weak_phrases: list[tuple[str, int]] = field(default_factory=list)
    low_quantification_bullets: list[str] = field(default_factory=list)
    word_count: int = 0


def run_formatting_checks(
    resume_text: str, file_kind: str, layout: LayoutFindings
) -> FormattingCheckResult:
    issues: list[FormattingIssue] = []
    word_count = count_words(resume_text)
    bullets = split_into_bullets(resume_text)
    weak_phrases = find_weak_phrases(resume_text)

    if word_count < 300:
        issues.append(FormattingIssue(
            id="too-short",
            message=f"Resume is only {word_count} words - it may be too thin to demonstrate impact. Aim for 400-800 words.",
            severity="medium",
            deduction=12,
        ))
    elif word_count > 1200:
        issues.append(FormattingIssue(
            id="too-long",
            message=f"Resume is {word_count} words - consider tightening it. Most ATS-friendly resumes run 400-800 words.",
            severity="low",
            deduction=6,
        ))

    if len(bullets) < 3:
        issues.append(FormattingIssue(
            id="few-bullets",
            message="Few or no bullet points detected. ATS parsers and recruiters both favor scannable bullet points over dense paragraphs.",
            severity="high",
            deduction=18,
        ))

    if not EMAIL_PATTERN.search(resume_text):
        issues.append(FormattingIssue(
            id="no-email",
            message="No email address detected. Make sure your contact info is in plain text, not an image.",
            severity="high",
            deduction=15,
        ))

    if not PHONE_PATTERN.search(resume_text):
        issues.append(FormattingIssue(
            id="no-phone",
            message="No phone number detected in plain text.",
            severity="low",
            deduction=5,
        ))

    low_quantification_bullets = [b for b in bullets if not contains_number(b)]
    quantified_ratio = (
        (len(bullets) - len(low_quantification_bullets)) / len(bullets) if bullets else 0
    )
    if len(bullets) >= 3 and quantified_ratio < 0.3:
        issues.append(FormattingIssue(
            id="low-quantification",
            message=f"Only {round(quantified_ratio * 100)}% of bullet points include numbers or metrics. Quantified achievements (\"increased X by 30%\") score higher with both ATS and recruiters.",
            severity="medium",
            deduction=12,
        ))

    if weak_phrases:
        issues.append(FormattingIssue(
            id="weak-language",
            message=f'Found {len(weak_phrases)} instance(s) of passive/weak phrasing (e.g. "responsible for"). Replace with strong action verbs.',
            severity="medium",
            deduction=min(15, len(weak_phrases) * 4),
        ))

    if file_kind == "txt":
        issues.append(FormattingIssue(
            id="plain-text-upload",
            message="Uploaded as a .txt file - double check your real submission preserves section formatting when exported as PDF/DOCX.",
            severity="low",
            deduction=3,
        ))

    # PDF-only layout signals from PyMuPDF - not available for DOCX/TXT.
    if layout.has_tables:
        issues.append(FormattingIssue(
            id="uses-tables",
            message=f"Detected {layout.table_count} table(s) in the PDF. Many ATS parsers read tables out of order or drop their content entirely - use plain paragraphs/bullets instead.",
            severity="high",
            deduction=min(20, layout.table_count * 10),
        ))

    if layout.has_images:
        issues.append(FormattingIssue(
            id="uses-images",
            message=f"Detected {layout.image_count} image(s) in the PDF. Text inside images (icons, headshots, infographics) is invisible to most ATS parsers.",
            severity="medium",
            deduction=min(10, layout.image_count * 5),
        ))

    if layout.likely_multi_column:
        issues.append(FormattingIssue(
            id="multi-column-layout",
            message="This PDF appears to use a multi-column layout. Many ATS parsers read left-to-right across the whole page, which scrambles multi-column text into the wrong order.",
            severity="high",
            deduction=15,
        ))

    deduction = sum(issue.deduction for issue in issues)
    score = max(0, min(100, 100 - deduction))

    return FormattingCheckResult(
        score=score,
        issues=issues,
        bullets=bullets,
        weak_phrases=weak_phrases,
        low_quantification_bullets=low_quantification_bullets,
        word_count=word_count,
    )
