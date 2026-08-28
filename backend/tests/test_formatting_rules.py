from app.schemas.parsing import LayoutFindings
from app.services.formatting_rules import run_formatting_checks

GOOD_RESUME = """
Jane Doe
jane.doe@example.com | (555) 123-4567

Summary
Product-minded engineer.

Experience
- Led migration cutting latency by 40%.
- Built ML pipeline improving accuracy by 15%.
- Shipped API used by 2M requests/day.
"""


class TestFormattingChecks:
    def test_flags_missing_email(self):
        result = run_formatting_checks("No contact info here at all, just text.", "txt", LayoutFindings())
        issue_ids = {i.id for i in result.issues}
        assert "no-email" in issue_ids

    def test_flags_few_bullets(self):
        result = run_formatting_checks("Just a paragraph with no bullet points whatsoever here.", "txt", LayoutFindings())
        issue_ids = {i.id for i in result.issues}
        assert "few-bullets" in issue_ids

    def test_flags_tables_in_pdf(self):
        layout = LayoutFindings(has_tables=True, table_count=2)
        result = run_formatting_checks(GOOD_RESUME, "pdf", layout)
        issue_ids = {i.id for i in result.issues}
        assert "uses-tables" in issue_ids

    def test_flags_multi_column_layout(self):
        layout = LayoutFindings(likely_multi_column=True)
        result = run_formatting_checks(GOOD_RESUME, "pdf", layout)
        issue_ids = {i.id for i in result.issues}
        assert "multi-column-layout" in issue_ids

    def test_clean_resume_scores_higher_than_dirty_one(self):
        clean = run_formatting_checks(GOOD_RESUME, "pdf", LayoutFindings())
        dirty = run_formatting_checks(
            "no bullets no email no phone", "pdf", LayoutFindings(has_tables=True, has_images=True)
        )
        assert clean.score > dirty.score

    def test_score_never_negative(self):
        layout = LayoutFindings(has_tables=True, table_count=99, has_images=True, image_count=99, likely_multi_column=True)
        result = run_formatting_checks("bad", "txt", layout)
        assert result.score >= 0
