import re
from dataclasses import dataclass, field

from app.core.skill_taxonomy import SECTION_HEADERS
from app.core.text_utils import split_lines

REQUIRED_SECTIONS = ("experience", "education", "skills")


@dataclass
class StructureIssue:
    id: str
    message: str
    severity: str
    deduction: int


@dataclass
class StructureCheckResult:
    score: int
    issues: list[StructureIssue] = field(default_factory=list)
    sections_found: list[str] = field(default_factory=list)
    sections_missing: list[str] = field(default_factory=list)


def _is_likely_heading(line: str) -> bool:
    return len(line) <= 40 and not line.rstrip().endswith((".", "!", "?"))


_DATE_PATTERNS: list[tuple[str, re.Pattern]] = [
    ("MM/YYYY", re.compile(r"\b\d{1,2}/\d{4}\b")),
    (
        "Month YYYY",
        re.compile(
            r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b",
            re.IGNORECASE,
        ),
    ),
    ("YYYY-YYYY", re.compile(r"\b\d{4}\s*[-–]\s*\d{4}\b")),
    ("YYYY", re.compile(r"\b(19|20)\d{2}\b")),
]


def run_structure_checks(resume_text: str) -> StructureCheckResult:
    lines = split_lines(resume_text)
    lower_lines = [line.lower() for line in lines]

    sections_found: list[str] = []
    for section, headings in SECTION_HEADERS.items():
        found = any(
            _is_likely_heading(lines[idx])
            and (line == h or line.startswith(f"{h}:"))
            for idx, line in enumerate(lower_lines)
            for h in headings
        )
        if found:
            sections_found.append(section)

    sections_missing = [s for s in REQUIRED_SECTIONS if s not in sections_found]

    issues: list[StructureIssue] = [
        StructureIssue(
            id=f"missing-{section}",
            message=f'No clearly labeled "{section}" section found. Standard section headings help ATS parsers map your content correctly.',
            severity="high",
            deduction=18,
        )
        for section in sections_missing
    ]

    if "summary" not in sections_found:
        issues.append(StructureIssue(
            id="missing-summary",
            message="Consider adding a brief professional summary at the top - it helps both ATS keyword scanning and recruiter skim-reading.",
            severity="low",
            deduction=5,
        ))

    date_formats_found = {label for label, pattern in _DATE_PATTERNS if pattern.search(resume_text)}
    if len(date_formats_found) > 2:
        issues.append(StructureIssue(
            id="inconsistent-dates",
            message='Multiple date formats detected. Use one consistent format (e.g. "Jan 2022 - Present") throughout.',
            severity="low",
            deduction=6,
        ))

    deduction = sum(issue.deduction for issue in issues)
    score = max(0, min(100, 100 - deduction))

    return StructureCheckResult(
        score=score, issues=issues, sections_found=sections_found, sections_missing=sections_missing
    )
