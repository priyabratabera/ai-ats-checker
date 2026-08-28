from pydantic import BaseModel


class ContactInfo(BaseModel):
    has_email: bool
    has_phone: bool
    has_url: bool
    emails: list[str] = []
    urls: list[str] = []


class LayoutFindings(BaseModel):
    """Only meaningful for PDF - DOCX/TXT extraction has no positional data."""

    page_count: int | None = None
    has_tables: bool = False
    table_count: int = 0
    has_images: bool = False
    image_count: int = 0
    likely_multi_column: bool = False


class ParsedResume(BaseModel):
    text: str
    word_count: int
    file_kind: str
    contact: ContactInfo
    layout: LayoutFindings
