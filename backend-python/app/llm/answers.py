from __future__ import annotations

import json
import re
import urllib.error
import urllib.request

from app.config import settings
from app.llm.common import extract_openai_output_text
from app.rag.answer import compose_always


def generate_contract_answer(question: str, evidence: list[str]) -> dict[str, str]:
    if not evidence:
        return {"answer": "Not found in contract", "generated_by": "local"}

    provider = settings.llm_provider.strip().lower()
    if provider == "ollama":
        answer = _generate_with_ollama(question, evidence)
        if answer:
            return {"answer": answer, "generated_by": "ollama"}
    elif settings.openai_api_key.strip():
        answer = _generate_with_openai(question, evidence)
        if answer:
            return {"answer": answer, "generated_by": "llm"}

    return {"answer": compose_always(question, evidence, 900), "generated_by": "local"}


def _generate_with_openai(question: str, evidence: list[str]) -> str | None:
    payload = {
        "model": settings.openai_model,
        "input": _prompt(question, evidence),
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

    return _clean_answer(extract_openai_output_text(body))


def _generate_with_ollama(question: str, evidence: list[str]) -> str | None:
    payload = {
        "model": settings.ollama_model,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You answer contract questions using only the supplied evidence. "
                    "If the evidence does not contain the answer, say: Not found in contract."
                ),
            },
            {"role": "user", "content": _prompt(question, evidence)},
        ],
    }
    request = urllib.request.Request(
        f"{settings.ollama_base_url.rstrip('/')}/api/chat",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        return None

    message = body.get("message", {})
    return _clean_answer(message.get("content") if isinstance(message, dict) else None)


def _prompt(question: str, evidence: list[str]) -> str:
    evidence_text = "\n\n".join(
        f"[Contract Clause {index + 1}]\n{chunk[:3000]}" for index, chunk in enumerate(evidence)
    )
    return (
        "You are an expert contract analysis assistant.\n"
        "Answer the user's contract question directly and concisely using ONLY the contract clause below.\n"
        "Strict rules:\n"
        "1. Base your answer strictly on facts directly mentioned in the supplied contract clause.\n"
        "2. Do NOT use outside knowledge or infer facts not explicitly stated.\n"
        "3. Do NOT combine unrelated clauses or assume terms from other sections.\n"
        "4. If the requested information is not mentioned in the clause, explicitly state: 'The contract does not specify this information.'\n"
        "5. If asked about employee notice period, do NOT use contract termination notice; state that the contract does not specify an employee notice period.\n"
        "6. Keep the answer factual and concise.\n\n"
        f"Question: {question.strip()}\n\n"
        f"{evidence_text}"
    )


def _clean_answer(answer: str | None) -> str | None:
    if not answer:
        return None
    cleaned = re.sub(r"\s+", " ", answer).strip()
    return cleaned[:1200].strip() if cleaned else None
