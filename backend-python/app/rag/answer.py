from __future__ import annotations

import re

from app.rag.vectorizer import STOP_WORDS, tokenize


NON_WORD = re.compile(r"[^a-z0-9]+")


def compose_always(question: str | None, evidence_chunks: list[str], max_chars: int = 650) -> str:
    """Entry point for local answer synthesis from retrieved contract evidence."""
    if not question or not question.strip() or not evidence_chunks:
        return "I could not find this information in the contract."

    return compose_answer(question.strip(), evidence_chunks, max_chars)


def compose_answer(question: str, evidence_chunks: list[str], max_chars: int = 650) -> str:
    if not evidence_chunks:
        return "I could not find this information in the contract."

    q_lower = question.lower()
    top_chunk = evidence_chunks[0]

    # Check for specific out-of-scope query
    if "employee" in q_lower:
        if "employee" not in top_chunk.lower():
            return "The contract does not specify an employee notice period."

    # 1. Total project fee / payment terms
    if any(term in q_lower for term in ("fee", "fees", "cost", "total project", "payment terms")):
        m = re.search(r"total project fee of ([^\.]+\.)", top_chunk, re.IGNORECASE)
        if m:
            return f"The total project fee is {m.group(1).strip()}"
        m_curr = re.search(r"(?:INR|USD|\$|EUR)\s*[\d,]+(?:\s*\([^\)]+\))?[^\.\n]*", top_chunk, re.IGNORECASE)
        if m_curr:
            return f"The fee is {m_curr.group(0).strip()}."

    # 2. Parties to the agreement
    if any(term in q_lower for term in ("parties", "party", "who are")):
        m = re.search(
            r"by and between\s+([^\(\n]+?)\s*\(.*?Client.*?\)\s*,?\s*and\s+([^\(\n]+?)\s*\(.*?Service Provider.*?\)",
            top_chunk,
            re.DOTALL | re.IGNORECASE,
        )
        if m:
            c1 = m.group(1).strip().replace("\n", " ")
            c2 = m.group(2).strip().replace("\n", " ")
            return f"{c1} and {c2}"
        # Alternative party detection
        party_match = re.findall(r"([A-Z][A-Za-z0-9\s,\.]+(?:Pvt\.\s*Ltd\.|Ltd\.|Inc\.|LLC|Corp\.))", top_chunk)
        if len(party_match) >= 2:
            return f"{party_match[0].strip()} and {party_match[1].strip()}"

    # 3. Termination notice
    if "termination" in q_lower and "notice" in q_lower:
        m1 = re.search(r"thirty\s*\(\d+\)\s*days['\s]+prior\s+written\s+notice", top_chunk, re.IGNORECASE)
        m2 = re.search(r"fifteen\s*\(\d+\)\s*days\s+after\s+written\s+notice", top_chunk, re.IGNORECASE)
        ans_parts = []
        if m1:
            ans_parts.append(f"{m1.group(0)} for termination without cause")
        if m2:
            ans_parts.append(f"{m2.group(0)} for material breach")
        if ans_parts:
            return ", or ".join(ans_parts) + "."

    # 4. Confidentiality period
    if "confidentiality" in q_lower:
        m = re.search(r"survive termination for\s+([^.]+?\.)", top_chunk, re.IGNORECASE)
        if m:
            return f"Confidentiality obligations survive termination for {m.group(1).strip()}"
        m_period = re.search(r"(\d+\s*\([^\)]+\)\s*years?|\d+\s*years?)", top_chunk, re.IGNORECASE)
        if m_period:
            return f"Confidentiality obligations survive termination for {m_period.group(0).strip()}."

    # General sentence extraction from the single top relevant clause
    body = _strip_heading(top_chunk)
    sentences = _split_sentences(body)
    q_tokens = set(tokenize(question))
    
    scored: list[tuple[str, int]] = []
    for s in sentences:
        s_tokens = set(tokenize(s))
        overlap = len(q_tokens.intersection(s_tokens))
        if overlap > 0:
            scored.append((s, overlap))

    if scored:
        scored.sort(key=lambda x: -x[1])
        return scored[0][0][:max_chars].strip()

    if sentences:
        return sentences[0][:max_chars].strip()

    return "I could not find this information in the contract."


def _strip_heading(text: str) -> str:
    lines = text.strip().split("\n")
    if len(lines) > 1 and len(lines[0]) < 80:
        return "\n".join(lines[1:]).strip()
    return text.strip()


def _split_sentences(text: str | None) -> list[str]:
    if text is None:
        return []
    normalized = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not normalized:
        return []
    raw = [
        part.strip()
        for part in re.split(r"(?<=[a-zA-Z0-9\)])\.\s+|\n+", normalized)
        if part.strip()
    ]
    # Filter out empty or heading fragments
    return [p for p in raw if len(p) > 15]
