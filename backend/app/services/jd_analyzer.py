from app.services.keyword_matcher import ExtractedKeyword, extract_keywords
from app.services.semantic_similarity import extract_required_years


def analyze_job_description(jd_text: str) -> dict:
    """
    Rule-based JD requirement extraction, persisted on
    JobDescription.extracted_requirements so the same JD can be reused
    across multiple analyses without re-parsing.
    """
    keywords: list[ExtractedKeyword] = extract_keywords(jd_text)
    required_years = extract_required_years(jd_text)

    return {
        "keywords": [{"term": k.term, "weight": k.weight} for k in keywords],
        "required_years": required_years,
    }
