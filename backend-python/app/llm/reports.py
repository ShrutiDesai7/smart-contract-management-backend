from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

from app.config import settings
from app.llm.common import extract_openai_output_text


REPORT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "summary": {"type": "string"},
        "key_terms": {"type": "array", "items": {"type": "string"}},
        "risk_level": {"type": "string", "enum": ["LOW", "MEDIUM", "HIGH"]},
        "risk_points": {"type": "array", "items": {"type": "string"}},
        "important_dates": {"type": "array", "items": {"type": "string"}},
        "obligations": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "summary",
        "key_terms",
        "risk_level",
        "risk_points",
        "important_dates",
        "obligations",
    ],
}


def generate_contract_report(contract: dict[str, Any]) -> dict[str, Any]:
    text = (contract.get("extracted_text") or "").strip()
    if not text:
        return _empty_report()

    if settings.openai_api_key.strip():
        llm_report = _generate_with_openai(contract, text)
        if llm_report is not None:
            return llm_report

    return _generate_locally(text)


def _generate_with_openai(contract: dict[str, Any], text: str) -> dict[str, Any] | None:
    prompt = (
        "Analyze this contract text. Return concise JSON with summary, key_terms, "
        "risk_level, risk_points, important_dates, and obligations. Base the report "
        "only on the contract text.\n\n"
        f"Contract name: {contract.get('contract_name') or contract.get('title') or 'Contract'}\n\n"
        f"Contract text:\n{text[:18000]}"
    )
    payload = {
        "model": settings.openai_model,
        "input": prompt,
        "text": {
            "format": {
                "type": "json_schema",
                "name": "contract_report",
                "strict": True,
                "schema": REPORT_SCHEMA,
            }
        },
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.openai_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    output_text = extract_openai_output_text(body)
    if not output_text:
        return None

    try:
        report = json.loads(output_text)
    except json.JSONDecodeError:
        return None
    return _normalize_report(report, generated_by="llm")


def _generate_locally(text: str) -> dict[str, Any]:
    sentences = _sentences(text)
    summary = " ".join(sentences[:3]).strip() or text[:600].strip()
    risk_points = _matches(
        text,
        [
            "termination",
            "penalty",
            "liability",
            "indemn",
            "breach",
            "confidential",
            "non-compete",
            "dispute",
            "damages",
        ],
    )
    important_dates = _date_like_items(text)
    obligations = _obligation_sentences(sentences)
    key_terms = _term_matches(
        text,
        {
            "Payment": ["payment", "pay", "invoice", "invoices"],
            "Termination": ["termination", "terminate"],
            "Renewal": ["renewal", "renew"],
            "Confidentiality": ["confidentiality", "confidential"],
            "Liability": ["liability", "liable"],
            "Indemnity": ["indemnity", "indemn"],
            "Governing Law": ["governing law"],
            "Notice": ["notice"],
        },
    )
    risk_level = "HIGH" if len(risk_points) >= 4 else "MEDIUM" if risk_points else "LOW"
    return {
        "summary": _limit(summary, 900),
        "key_terms": key_terms,
        "risk_level": risk_level,
        "risk_points": risk_points,
        "important_dates": important_dates,
        "obligations": obligations,
        "generated_by": "local",
    }


def _empty_report() -> dict[str, Any]:
    return {
        "summary": "No extracted contract text is available for report generation.",
        "key_terms": [],
        "risk_level": "LOW",
        "risk_points": [],
        "important_dates": [],
        "obligations": [],
        "generated_by": "local",
    }


def _normalize_report(report: dict[str, Any], generated_by: str) -> dict[str, Any]:
    return {
        "summary": str(report.get("summary") or "").strip() or _empty_report()["summary"],
        "key_terms": _string_list(report.get("key_terms")),
        "risk_level": str(report.get("risk_level") or "LOW").upper(),
        "risk_points": _string_list(report.get("risk_points")),
        "important_dates": _string_list(report.get("important_dates")),
        "obligations": _string_list(report.get("obligations")),
        "generated_by": generated_by,
    }


def _sentences(text: str) -> list[str]:
    return [
        re.sub(r"\s+", " ", part).strip()
        for part in re.split(r"(?<=[.!?])\s+|\n+", text)
        if part.strip()
    ]


def _matches(text: str, keywords: list[str]) -> list[str]:
    lower = text.lower()
    return [keyword.title() for keyword in keywords if keyword in lower][:8]


def _term_matches(text: str, terms: dict[str, list[str]]) -> list[str]:
    lower = text.lower()
    return [
        label
        for label, aliases in terms.items()
        if any(alias in lower for alias in aliases)
    ][:8]


def _date_like_items(text: str) -> list[str]:
    patterns = [
        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",
        r"\b\d{1,2}\s+(?:days?|months?|years?)\b",
        r"\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}\b",
    ]
    found: list[str] = []
    for pattern in patterns:
        found.extend(re.findall(pattern, text, flags=re.IGNORECASE))
    return list(dict.fromkeys(item.strip() for item in found if item.strip()))[:8]


def _obligation_sentences(sentences: list[str]) -> list[str]:
    obligation_words = ("shall", "must", "will", "agrees to", "responsible for", "required to")
    return [
        _limit(sentence, 240)
        for sentence in sentences
        if any(word in sentence.lower() for word in obligation_words)
    ][:8]


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()][:12]


def _limit(text: str, max_chars: int) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_chars].strip()
