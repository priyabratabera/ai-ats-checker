from app.services.keyword_matcher import (
    ExtractedKeyword,
    extract_keywords,
    keyword_score,
    match_keywords,
    skills_score,
)


class TestExtractKeywords:
    def test_prioritizes_known_multi_word_phrases(self):
        jd = """
        We are looking for a Senior Data Scientist with strong machine learning
        and data analysis experience. Requirements: proficiency in Python and SQL,
        experience with machine learning pipelines, and strong communication skills.
        """
        keywords = extract_keywords(jd)
        terms = [k.term for k in keywords]
        assert "machine learning" in terms
        assert "python" in terms
        assert "sql" in terms

    def test_empty_input_returns_empty_list(self):
        assert extract_keywords("") == []


class TestMatchKeywords:
    def test_matches_exact_terms_and_synonyms(self):
        resume = "Built scalable services in JavaScript and worked with AWS and PostgreSQL."
        result = match_keywords(
            resume,
            [
                ExtractedKeyword(term="javascript", weight=1),
                ExtractedKeyword(term="amazon web services", weight=0.8),
                ExtractedKeyword(term="postgresql", weight=0.5),
            ],
        )
        matched_terms = {m.term for m in result.matched}
        assert matched_terms == {"javascript", "aws", "postgresql"}
        assert result.missing == []

    def test_reports_missing_terms(self):
        result = match_keywords(
            "Built scalable services in Python.",
            [ExtractedKeyword(term="kubernetes", weight=0.9)],
        )
        assert len(result.missing) == 1
        assert result.missing[0].term == "kubernetes"

    def test_score_100_when_everything_matches(self):
        result = match_keywords("Python Python Python", [ExtractedKeyword(term="python", weight=1)])
        assert keyword_score(result) == 100

    def test_score_0_when_nothing_matches(self):
        result = match_keywords("irrelevant text", [ExtractedKeyword(term="kubernetes", weight=1)])
        assert keyword_score(result) == 0

    def test_short_abbreviation_does_not_false_match_inside_compound_token(self):
        """
        Regression test: "js" must not match inside "Node.js" when the
        resume separately and genuinely contains the word "JavaScript".
        """
        resume = "Skills: JavaScript, TypeScript, Node.js"
        result = match_keywords(resume, [ExtractedKeyword(term="javascript", weight=1)])
        assert len(result.matched) == 1
        assert result.matched[0].term == "javascript"
        assert result.matched[0].count == 1

    def test_matches_term_followed_by_sentence_punctuation(self):
        result = match_keywords(
            "Experience with PostgreSQL.", [ExtractedKeyword(term="postgresql", weight=1)]
        )
        assert len(result.matched) == 1
        assert result.matched[0].count == 1


class TestSkillsScore:
    def test_returns_default_when_no_terms(self):
        from app.services.keyword_matcher import KeywordAnalysis

        assert skills_score(KeywordAnalysis()) == 85
