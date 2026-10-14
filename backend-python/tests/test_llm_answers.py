from __future__ import annotations

import json
from io import BytesIO
from typing import Any

from app.llm import answers


class FakeHttpResponse:
    def __init__(self, body: dict[str, Any]) -> None:
        self.body = body

    def __enter__(self) -> "FakeHttpResponse":
        return self

    def __exit__(self, *_args) -> None:
        return None

    def read(self) -> bytes:
        return json.dumps(self.body).encode("utf-8")


def test_generate_answer_uses_local_fallback_without_provider(monkeypatch) -> None:
    monkeypatch.setattr(answers.settings, "llm_provider", "openai")
    monkeypatch.setattr(answers.settings, "openai_api_key", "")

    result = answers.generate_contract_answer(
        "What are the payment terms?",
        ["Payment terms are Net 30 days from invoice date."],
    )

    assert "Net 30" in result["answer"]
    assert result["generated_by"] == "local"


def test_generate_answer_uses_openai_when_configured(monkeypatch) -> None:
    captured_payload = BytesIO()

    def fake_urlopen(request, timeout):
        captured_payload.write(request.data)
        return FakeHttpResponse({"output_text": "The payment terms are Net 30 days."})

    monkeypatch.setattr(answers.settings, "llm_provider", "openai")
    monkeypatch.setattr(answers.settings, "openai_api_key", "test-key")
    monkeypatch.setattr(answers.urllib.request, "urlopen", fake_urlopen)

    result = answers.generate_contract_answer(
        "What are the payment terms?",
        ["Payment terms are Net 30 days from invoice date."],
    )

    payload = json.loads(captured_payload.getvalue().decode("utf-8"))
    assert payload["model"] == answers.settings.openai_model
    assert "Net 30" in result["answer"]
    assert result["generated_by"] == "llm"


def test_generate_answer_uses_ollama_when_configured(monkeypatch) -> None:
    captured_payload = BytesIO()

    def fake_urlopen(request, timeout):
        captured_payload.write(request.data)
        return FakeHttpResponse({"message": {"content": "Payment is due within 30 days."}})

    monkeypatch.setattr(answers.settings, "llm_provider", "ollama")
    monkeypatch.setattr(answers.settings, "ollama_model", "llama3.2")
    monkeypatch.setattr(answers.urllib.request, "urlopen", fake_urlopen)

    result = answers.generate_contract_answer(
        "When is payment due?",
        ["The customer shall pay invoices within 30 days."],
    )

    payload = json.loads(captured_payload.getvalue().decode("utf-8"))
    assert payload["stream"] is False
    assert payload["model"] == "llama3.2"
    assert "30 days" in result["answer"]
    assert result["generated_by"] == "ollama"
