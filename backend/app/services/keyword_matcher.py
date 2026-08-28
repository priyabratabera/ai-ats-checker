import re
from dataclasses import dataclass, field

from app.core.skill_taxonomy import KNOWN_PHRASES, SKILL_TERMS, SYNONYMS, canonicalize
from app.core.text_utils import (
    STOP_WORDS,
    escape_regex,
    find_token_occurrences,
    split_lines,
    stem,
    tokenize,
)

REQUIREMENT_HEADING = re.compile(
    r"^(requirements?|qualifications?|must[ -]haves?|what you('| wi)ll need|"
    r"skills? (required|needed)|responsibilities)",
    re.IGNORECASE,
)
REQUIREMENT_CUE = re.compile(
    r"\b(required|must have|proficien(t|cy)|experience with|expertise in|"
    r"knowledge of|familiarity with|strong (understanding|command) of)\b",
    re.IGNORECASE,
)

GENERIC_NOISE = {
    "job", "role", "position", "company", "team", "candidate", "candidates",
    "years", "year", "work", "working", "ability", "skills", "skill",
    "experience", "experienced", "knowledge", "strong", "excellent",
    "including", "such", "etc", "environment", "opportunity", "looking",
    "join", "plus", "preferred", "required", "responsibilities",
    "requirements", "qualifications",
}


@dataclass
class ExtractedKeyword:
    term: str
    weight: float


def _find_phrase_occurrences(lower_text: str, phrase: str) -> int:
    count = 0
    start = 0
    while True:
        idx = lower_text.find(phrase, start)
        if idx == -1:
            break
        count += 1
        start = idx + len(phrase)
    return count


def extract_keywords(jd_text: str, limit: int = 30) -> list[ExtractedKeyword]:
    """
    Rule-based keyword/skill extraction from a job description: known
    multi-word phrases first, then significant unigrams, weighted by
    frequency and by whether they appear near a "required/must have" cue or
    under a requirements-style heading.
    """
    lower = jd_text.lower()
    lines = split_lines(jd_text)
    scores: dict[str, float] = {}

    def bump(term: str, amount: float) -> None:
        canonical = canonicalize(term)
        scores[canonical] = scores.get(canonical, 0) + amount

    for phrase in KNOWN_PHRASES:
        occurrences = _find_phrase_occurrences(lower, phrase)
        if occurrences > 0:
            bump(phrase, occurrences * 2)

    under_requirements_heading = False
    for line in lines:
        if REQUIREMENT_HEADING.match(line):
            under_requirements_heading = True
            continue
        if len(line) < 40 and re.match(r"^[A-Z][A-Za-z /&-]*:?$", line):
            under_requirements_heading = False

        has_cue = bool(REQUIREMENT_CUE.search(line)) or under_requirements_heading
        for token in tokenize(line):
            if token in GENERIC_NOISE or token in STOP_WORDS or token.isdigit():
                continue
            bump(token, 1.5 if has_cue else 1)

    ranked = sorted(
        ((term, score) for term, score in scores.items() if len(term) > 1),
        key=lambda item: item[1],
        reverse=True,
    )[:limit]

    if not ranked:
        return []

    max_score = ranked[0][1]
    return [
        ExtractedKeyword(term=term, weight=max(0.15, round((score / max_score), 2)))
        for term, score in ranked
    ]


@dataclass
class KeywordMatch:
    term: str
    count: int
    weight: float


@dataclass
class KeywordMissing:
    term: str
    weight: float


@dataclass
class KeywordPartial:
    term: str
    matched_as: str


@dataclass
class KeywordAnalysis:
    matched: list[KeywordMatch] = field(default_factory=list)
    missing: list[KeywordMissing] = field(default_factory=list)
    partial: list[KeywordPartial] = field(default_factory=list)


def _term_variants(term: str) -> list[str]:
    canonical = canonicalize(term)
    variants = [canonical]
    if term not in variants:
        variants.append(term)
    for alt in SYNONYMS.get(canonical, []):
        if alt not in variants:
            variants.append(alt)
    return variants


def _count_occurrences(lower_text: str, term: str) -> int:
    if " " in term or "." in term or "-" in term:
        pattern = re.compile(escape_regex(term))
        return len(pattern.findall(lower_text))
    return len(find_token_occurrences(lower_text, term))


def match_keywords(resume_text: str, keywords: list[ExtractedKeyword]) -> KeywordAnalysis:
    """
    Compares JD keywords against the resume text: exact/synonym matches
    count as "matched", stemmed overlap counts as "partial", everything
    else is reported as "missing" so recommendations can point at real gaps.
    """
    lower_resume = resume_text.lower()
    resume_stems = {stem(t) for t in tokenize(resume_text)}

    analysis = KeywordAnalysis()

    for kw in keywords:
        variants = _term_variants(kw.term)
        total_count = 0
        matched_as = ""
        for variant in variants:
            count = _count_occurrences(lower_resume, variant)
            if count > total_count:
                total_count = count
                matched_as = variant

        if total_count > 0:
            analysis.matched.append(KeywordMatch(term=matched_as, count=total_count, weight=kw.weight))
            continue

        term_stem = stem(kw.term.split(" ")[-1] if " " in kw.term else kw.term)
        if term_stem in resume_stems:
            analysis.partial.append(KeywordPartial(term=kw.term, matched_as=term_stem))
            continue

        analysis.missing.append(KeywordMissing(term=kw.term, weight=kw.weight))

    return analysis


def keyword_score(analysis: KeywordAnalysis) -> int:
    items = (
        [(m.weight, 1.0) for m in analysis.matched]
        + [(0.3, 0.6) for _ in analysis.partial]
        + [(m.weight, 0.0) for m in analysis.missing]
    )
    if not items:
        return 100

    total_weight = sum(w for w, _ in items)
    if total_weight == 0:
        return 100

    earned = sum(w * credit for w, credit in items)
    return round((earned / total_weight) * 100)


def _is_skill_term(term: str) -> bool:
    if term in SKILL_TERMS:
        return True
    return " " not in term and 3 <= len(term) <= 20


def skills_score(analysis: KeywordAnalysis) -> int:
    matched = [m for m in analysis.matched if _is_skill_term(m.term)]
    missing = [m for m in analysis.missing if _is_skill_term(m.term)]
    partial = [p for p in analysis.partial if _is_skill_term(p.term)]

    total = len(matched) + len(missing) + len(partial)
    if total == 0:
        return 85

    earned = len(matched) + len(partial) * 0.5
    return round((earned / total) * 100)
