from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.llm.reports import generate_contract_report
from app.main import app
from app.security import current_user
from app.services import contracts as contract_service
from app.services import reports as report_service


client = TestClient(app)
OWNER_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
CONTRACT_ID = UUID("44444444-4444-4444-4444-444444444444")
TEST_USER = {
    "id": OWNER_ID,
    "name": "Priya",
    "email": "priya@example.com",
    "role": "USER",
}


class FakeResult:
    def __init__(self, one: Any = None) -> None:
        self.one = one

    def fetchone(self) -> Any:
        return self.one


class ReportDb:
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self.contract = {
            "id": CONTRACT_ID,
            "owner_id": OWNER_ID,
            "title": "Services Agreement",
            "description": None,
            "status": "UPLOADED",
            "owner_name": "Priya",
            "created_at": now,
            "updated_at": now,
            "contract_name": "Services Agreement",
            "original_file_name": "services.pdf",
            "stored_file_name": "services.pdf.enc",
            "content_type": "application/pdf",
            "file_size_bytes": 123,
            "uploaded_at": now,
            "file_path": "services.pdf.enc",
            "extracted_text": (
                "The customer shall pay invoices within 30 days. "
                "Either party may terminate with 15 days notice. "
                "Confidential information must be protected."
            ),
        }
        self.report: dict[str, Any] | None = None

    def __enter__(self) -> "ReportDb":
        return self

    def __exit__(self, *_args) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> FakeResult:
        normalized = " ".join(sql.split()).lower()
        if normalized.startswith("select * from contracts"):
            if params and params[0] == CONTRACT_ID:
                return FakeResult(one=self.contract)
            return FakeResult(one=None)
        if normalized.startswith("select * from contract_reports"):
            return FakeResult(one=self.report)
        if normalized.startswith("insert into contract_reports"):
            (
                report_id,
                contract_id,
                summary,
                key_terms,
                risk_level,
                risk_points,
                important_dates,
                obligations,
                generated_by,
                generated_at,
            ) = params
            self.report = {
                "id": report_id,
                "contract_id": contract_id,
                "summary": summary,
                "key_terms": _jsonb_value(key_terms),
                "risk_level": risk_level,
                "risk_points": _jsonb_value(risk_points),
                "important_dates": _jsonb_value(important_dates),
                "obligations": _jsonb_value(obligations),
                "generated_by": generated_by,
                "generated_at": generated_at,
            }
            return FakeResult(one=self.report)
        raise AssertionError(f"Unexpected SQL: {sql}")


def test_local_report_generation_extracts_contract_insights(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.llm.reports.settings.openai_api_key", "")

    report = generate_contract_report(
        {
            "title": "Services Agreement",
            "extracted_text": (
                "The customer shall pay invoices within 30 days. "
                "The agreement includes termination and confidentiality obligations."
            ),
        }
    )

    assert "customer shall pay" in report["summary"].lower()
    assert "Payment" in report["key_terms"]
    assert "Termination" in report["risk_points"]
    assert report["risk_level"] in ("MEDIUM", "HIGH")
    assert report["generated_by"] == "local"


def test_generate_report_persists_report_for_owner(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = ReportDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)
    monkeypatch.setattr(report_service, "db", lambda: fake_db)
    monkeypatch.setattr("app.llm.reports.settings.openai_api_key", "")

    response = report_service.generate_report(CONTRACT_ID, TEST_USER)

    assert response["contractId"] == str(CONTRACT_ID)
    assert response["summary"]
    assert response["riskLevel"] in ("LOW", "MEDIUM", "HIGH")
    assert "Payment" in response["keyTerms"]
    assert fake_db.report is not None


def test_get_report_returns_404_when_report_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = ReportDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)
    monkeypatch.setattr(report_service, "db", lambda: fake_db)

    with pytest.raises(HTTPException) as error:
        report_service.get_report(CONTRACT_ID, TEST_USER)

    assert error.value.status_code == 404


def test_report_api_regenerates_report_for_authenticated_user(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "id": "55555555-5555-5555-5555-555555555555",
        "contractId": str(CONTRACT_ID),
        "summary": "Short summary",
        "keyTerms": ["Payment"],
        "riskLevel": "LOW",
        "riskPoints": [],
        "importantDates": ["30 days"],
        "obligations": ["Customer shall pay invoices."],
        "generatedBy": "local",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    monkeypatch.setattr(report_service, "generate_report", lambda contract_id, user: payload)
    app.dependency_overrides[current_user] = lambda: TEST_USER

    try:
        response = client.post(f"/api/contracts/{CONTRACT_ID}/report/regenerate")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == payload


def _jsonb_value(value: Any) -> Any:
    return getattr(value, "obj", value)
