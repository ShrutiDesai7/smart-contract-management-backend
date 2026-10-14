from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException


def extract_text(path: Path, content_type: str | None) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf" or content_type == "application/pdf":
        from pypdf import PdfReader

        return "\n".join(page.extract_text() or "" for page in PdfReader(str(path)).pages)
    if (
        suffix == ".docx"
        or content_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ):
        from docx import Document

        return "\n".join(paragraph.text for paragraph in Document(str(path)).paragraphs)
    raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
