import math
import re
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.text_utils import stem, tokenize


def _term_frequency(tokens: list[str]) -> dict[str, int]:
    freq: dict[str, int] = {}
    for token in tokens:
        key = stem(token)
        freq[key] = freq.get(key, 0) + 1
    return freq


def cosine_similarity(text_a: str, text_b: str) -> float:
    """
    Cosine similarity between stemmed term-frequency vectors - a classic
    bag-of-words comparison that rewards vocabulary overlap even when exact
    keyword matching misses it, without needing an embeddings model. This is
    the rule engine's own "experience" signal, used standalone when the AI
    engine is unavailable and blended with it otherwise.
    """
    freq_a = _term_frequency(tokenize(text_a))
    freq_b = _term_frequency(tokenize(text_b))
    if not freq_a or not freq_b:
        return 0.0

    dot = sum(count_a * freq_b.get(term, 0) for term, count_a in freq_a.items())
    mag_a = math.sqrt(sum(c * c for c in freq_a.values()))
    mag_b = math.sqrt(sum(c * c for c in freq_b.values()))
    denom = mag_a * mag_b
    return dot / denom if denom else 0.0


_YEARS_REQUIRED_PATTERN = re.compile(r"(\d{1,2})\+?\s*(?:-\s*\d{1,2}\s*)?years?", re.IGNORECASE)
_YEAR_TOKEN_PATTERN = re.compile(r"\b(19|20)\d{2}\b")


def extract_required_years(jd_text: str) -> int | None:
    values = [
        int(m.group(1))
        for m in _YEARS_REQUIRED_PATTERN.finditer(jd_text)
        if 0 < int(m.group(1)) <= 40
    ]
    return max(values) if values else None


def estimate_resume_years(resume_text: str) -> int | None:
    current_year = datetime.now(timezone.utc).year
    years = [
        int(m.group(0))
        for m in _YEAR_TOKEN_PATTERN.finditer(resume_text)
        if 1970 <= int(m.group(0)) <= current_year + 1
    ]
    if len(years) < 2:
        return None
    return max(years) - min(years)


@dataclass
class ExperienceMatchResult:
    score: int
    required_years: int | None
    estimated_years: int | None
    semantic_overlap: float


def score_experience_match(resume_text: str, jd_text: str) -> ExperienceMatchResult:
    semantic_overlap = cosine_similarity(resume_text, jd_text)
    required_years = extract_required_years(jd_text)
    estimated_years = estimate_resume_years(resume_text)

    years_score = 70
    if required_years is not None and estimated_years is not None:
        years_score = (
            100
            if estimated_years >= required_years
            else round(max(30, (estimated_years / required_years) * 100))
        )

    semantic_score = round(semantic_overlap * 100)
    score = round(semantic_score * 0.6 + years_score * 0.4)

    return ExperienceMatchResult(
        score=max(0, min(100, score)),
        required_years=required_years,
        estimated_years=estimated_years,
        semantic_overlap=semantic_overlap,
    )
