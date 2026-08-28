from app.services.structure_rules import run_structure_checks

FULL_RESUME = """
Jane Doe

Summary
Engineer.

Experience
Senior Engineer, Acme (2020 - Present)
- Did things.

Education
B.S. Computer Science

Skills
Python, SQL
"""


class TestStructureChecks:
    def test_detects_all_standard_sections(self):
        result = run_structure_checks(FULL_RESUME)
        assert "experience" in result.sections_found
        assert "education" in result.sections_found
        assert "skills" in result.sections_found
        assert result.sections_missing == []

    def test_flags_missing_required_sections(self):
        result = run_structure_checks("Jane Doe\n\nJust some text with no headings at all.")
        assert "experience" in result.sections_missing
        assert any(i.id == "missing-experience" for i in result.issues)

    def test_full_resume_scores_higher_than_bare_text(self):
        full = run_structure_checks(FULL_RESUME)
        bare = run_structure_checks("random text with nothing structured about it whatsoever")
        assert full.score > bare.score
