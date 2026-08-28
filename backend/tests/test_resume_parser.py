import io

import docx
import pymupdf
import pytest

from app.services.resume_parser import (
    EmptyResumeError,
    UnsupportedFileTypeError,
    parse_resume,
)


def _make_pdf_bytes(text: str) -> bytes:
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((50, 50), text)
    buf = doc.tobytes()
    doc.close()
    return buf


def _make_docx_bytes(paragraphs: list[str]) -> bytes:
    document = docx.Document()
    for p in paragraphs:
        document.add_paragraph(p)
    stream = io.BytesIO()
    document.save(stream)
    return stream.getvalue()


class TestParseResume:
    def test_parses_txt(self):
        result = parse_resume(
            b"Jane Doe\njane@example.com\n\nExperience\nBuilt things.",
            "resume.txt",
            "text/plain",
        )
        assert result.file_kind == "txt"
        assert result.contact.has_email is True
        assert "Jane Doe" in result.text

    def test_parses_pdf_and_reports_page_count(self):
        pdf_bytes = _make_pdf_bytes("Jane Doe jane@example.com Experience Built things here.")
        result = parse_resume(pdf_bytes, "resume.pdf", "application/pdf")
        assert result.file_kind == "pdf"
        assert result.layout.page_count == 1
        assert result.contact.has_email is True

    def test_parses_docx(self):
        docx_bytes = _make_docx_bytes(["Jane Doe", "jane@example.com", "Experience", "Built things here."])
        result = parse_resume(
            docx_bytes,
            "resume.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        assert result.file_kind == "docx"
        assert "Jane Doe" in result.text

    def test_rejects_unsupported_extension(self):
        with pytest.raises(UnsupportedFileTypeError):
            parse_resume(b"whatever", "resume.xyz", "application/octet-stream")

    def test_rejects_empty_content(self):
        with pytest.raises(EmptyResumeError):
            parse_resume(b"hi", "resume.txt", "text/plain")
