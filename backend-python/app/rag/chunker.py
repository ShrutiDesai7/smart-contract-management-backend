from __future__ import annotations

from dataclasses import dataclass
import re


@dataclass
class ContractChunk:
    chunk_index: int
    section_title: str
    clause_number: str | None
    page_number: int
    chunk_text: str
    search_text: str


KNOWN_LEGAL_HEADINGS = [
    "RECITALS",
    "PREAMBLE",
    "PURPOSE AND SCOPE",
    "DEFINITIONS",
    "TERM",
    "DELIVERABLES",
    "FEES AND PAYMENT",
    "FEES AND PAYMENT TERMS",
    "PAYMENT TERMS",
    "CONFIDENTIALITY",
    "DATA SECURITY",
    "INTELLECTUAL PROPERTY",
    "TERMINATION",
    "OBLIGATIONS",
    "SERVICE PROVIDER OBLIGATIONS",
    "CLIENT OBLIGATIONS",
    "INDEMNIFICATION",
    "LIMITATION OF LIABILITY",
    "GOVERNING LAW",
    "GOVERNING LAW AND JURISDICTION",
    "DISPUTE RESOLUTION",
    "NOTICES",
    "ENTIRE AGREEMENT",
    "SIGNATURES",
    "IN WITNESS WHEREOF",
]


def chunk_contract_by_sections(text: str | None) -> list[ContractChunk]:
    """
    Contract-aware chunker that splits documents into logical, independent
    clause/section retrieval units while preserving legal context and metadata.
    """
    if text is None:
        return []

    normalized = text.replace("\r\n", "\n").replace("\r", "\n").replace("\u00a0", " ").strip()
    if not normalized:
        return []

    # Detect form feeds or page markers
    pages = re.split(r"[\f\x0c]|\n\s*-+\s*Page\s+\d+\s*-+\s*\n", normalized)
    
    # Split pattern recognizing:
    # 1. Numbered clauses: "\n1. Purpose", "\n 14. Entire Agreement", "\n 2.1 Subclause"
    # 2. Article/Section headers: "\nARTICLE 1", "\nSECTION 2"
    # 3. Signature blocks: "\nFor TechNova Solutions"
    # 4. In witness whereof
    split_pattern = re.compile(
        r"(?=\n\s*(?:\d{1,2}(?:\.\d{1,2})*\.?\s+[A-Z]|(?:ARTICLE|SECTION|CLAUSE)\s+[\dIVXLCDM]+|For\s+[A-Z]|IN WITNESS WHEREOF))",
        re.MULTILINE
    )

    raw_parts = split_pattern.split("\n" + normalized)
    chunks: list[ContractChunk] = []
    chunk_idx = 0
    current_page = 1

    for part in raw_parts:
        cleaned = part.strip()
        if not cleaned:
            continue

        lines = [line.strip() for line in cleaned.split("\n") if line.strip()]
        if not lines:
            continue

        first_line = lines[0]

        # Check for numbered clause match e.g. "4. Fees and Payment Terms"
        numbered_match = re.match(r"^(\d{1,2}(?:\.\d{1,2})*)\.?\s+([^\n:]+)", first_line)
        article_match = re.match(r"^(?:ARTICLE|SECTION|CLAUSE)\s+([\dIVXLCDM]+(?:\.[\d]+)?)\.?\s*[:\-–]?\s*([^\n:]*)", first_line, re.IGNORECASE)
        signature_match = re.match(r"^For\s+([^\n:]+)", first_line)

        if numbered_match:
            clause_num = numbered_match.group(1)
            title_text = numbered_match.group(2).strip()
            sec_title = f"{clause_num}. {title_text}"
        elif article_match:
            clause_num = article_match.group(1)
            title_text = article_match.group(2).strip() or "General"
            sec_title = f"Section {clause_num}: {title_text}"
        elif signature_match:
            clause_num = "Signature"
            sec_title = f"Signature - For {signature_match.group(1).strip()}"
        elif re.match(r"^IN WITNESS WHEREOF", first_line, re.IGNORECASE):
            clause_num = "Signature"
            sec_title = "Signatures and Execution"
        elif "SOFTWARE SERVICES AGREEMENT" in cleaned or "entered into" in cleaned or "by and between" in cleaned:
            clause_num = "Preamble"
            sec_title = "Parties and Preamble"
        else:
            # Check for known legal headings
            matched_heading = None
            upper_line = first_line.upper()
            for heading in KNOWN_LEGAL_HEADINGS:
                if upper_line.startswith(heading):
                    matched_heading = heading
                    break

            if matched_heading:
                clause_num = ""
                sec_title = first_line[:60].strip()
            elif chunk_idx == 0:
                clause_num = "Preamble"
                sec_title = "Parties and Preamble"
            else:
                clause_num = ""
                sec_title = first_line[:50].strip()

        # Build retrieval-augmented search text with prepended section context
        search_text = f"Section: {sec_title}\n{cleaned}"

        chunks.append(
            ContractChunk(
                chunk_index=chunk_idx,
                section_title=sec_title,
                clause_number=clause_num if clause_num else None,
                page_number=current_page,
                chunk_text=cleaned,
                search_text=search_text,
            )
        )
        chunk_idx += 1

    # If no section pattern matched (e.g. single unstructured text), fallback to paragraphs
    if len(chunks) <= 1 and len(normalized.split()) > 150:
        return _fallback_paragraph_chunks(normalized)

    return chunks


def _fallback_paragraph_chunks(text: str) -> list[ContractChunk]:
    """Fallback splitting for unstructured text into coherent paragraph units."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n+", text) if p.strip()]
    chunks: list[ContractChunk] = []
    for i, para in enumerate(paragraphs):
        first_line = para.split("\n", 1)[0][:50].strip()
        sec_title = f"Section {i + 1}: {first_line}" if first_line else f"Section {i + 1}"
        search_text = f"Section: {sec_title}\n{para}"
        chunks.append(
            ContractChunk(
                chunk_index=i,
                section_title=sec_title,
                clause_number=str(i + 1),
                page_number=1,
                chunk_text=para,
                search_text=search_text,
            )
        )
    return chunks


def chunk_by_words(
    text: str | None,
    min_words: int = 200,
    max_words: int = 400,
    overlap_words: int = 50,
) -> list[str]:
    """Legacy word-count chunking preserved for unit test compatibility."""
    if text is None:
        return []

    normalized = text.replace("\r\n", "\n").replace("\r", "\n").replace("\u00a0", " ").strip()
    if not normalized:
        return []

    min_count = max(1, min_words)
    max_count = max(min_count, max_words)
    overlap = max(0, min(overlap_words, max_count - 1))
    words = [word.strip() for word in normalized.split() if word.strip()]
    if not words:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = min(len(words), start + max_count)
        if end - start < min_count:
            end = len(words)

        chunk = " ".join(words[start:end]).strip()
        if chunk:
            chunks.append(chunk)

        if end >= len(words):
            break
        start = max(start + 1, end - overlap)

    return chunks
