from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi.testclient import TestClient

from app.main import app
from app.rag.vector_codec import to_bytes
from app.rag.vectorizer import HashedTfVectorizer
from app.security import current_user
from app.services import contracts as contract_service


client = TestClient(app)
OWNER_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
OTHER_USER_ID = UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")


def _user(user_id: UUID = OWNER_ID, role: str = "USER") -> dict[str, Any]:
    return {
        "id": user_id,
        "name": "Contract Owner",
        "email": "owner@example.com",
        "role": role,
    }


class FakeResult:
    def __init__(self, one: Any = None, all_rows: list[dict[str, Any]] | None = None) -> None:
        self.one = one
        self.all_rows = [] if all_rows is None else all_rows

    def fetchone(self) -> Any:
        return self.one

    def fetchall(self) -> list[dict[str, Any]]:
        return self.all_rows


class AskDb:
    def __init__(self) -> None:
        vectorizer = HashedTfVectorizer(1024)
        now = datetime.now(timezone.utc)
        self.contract_id = UUID("22222222-2222-2222-2222-222222222222")
        self.contract = {
            "id": self.contract_id,
            "owner_id": OWNER_ID,
            "title": "Services Agreement",
            "description": None,
            "status": "DRAFT",
            "owner_name": None,
            "created_at": now,
            "updated_at": now,
            "contract_name": "Services Agreement",
            "original_file_name": "services.docx",
            "stored_file_name": "stored-services.docx",
            "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "file_size_bytes": 123,
            "uploaded_at": now,
            "file_path": None,
            "extracted_text": "Payment terms are Net 30 days. Termination notice is 15 days.",
        }
        self.chunks = [
            {
                "chunk_text": "Termination notice is 15 days.",
                "embedding": to_bytes(vectorizer.embed_tf("Termination notice is 15 days.")),
            },
            {
                "chunk_text": "Payment terms are Net 30 days from invoice date.",
                "embedding": to_bytes(
                    vectorizer.embed_tf("Payment terms are Net 30 days from invoice date.")
                ),
            },
        ]

    def __enter__(self) -> "AskDb":
        return self

    def __exit__(self, *_args) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> FakeResult:
        normalized = " ".join(sql.split()).lower()
        if normalized.startswith("select * from contracts"):
            if params and params[0] == self.contract_id:
                return FakeResult(one=self.contract)
            return FakeResult(one=None)
        if normalized.startswith("select count(*) as count from contract_chunk"):
            return FakeResult(one={"count": len(self.chunks)})
        if "from contract_chunk" in normalized:
            return FakeResult(all_rows=self.chunks)
        raise AssertionError(f"Unexpected SQL: {sql}")


def test_ask_contract_api_returns_natural_answer_and_evidence(monkeypatch) -> None:
    fake_db = AskDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)
    app.dependency_overrides[current_user] = lambda: _user()

    try:
        response = client.post(
            f"/api/contracts/{fake_db.contract_id}/ask",
            json={"question": "What are the payment terms?"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert "Net 30" in body["answer"]
    assert body["evidence"][0].startswith("Payment terms")
    assert body["generatedBy"] == "local"


def test_ask_contract_api_returns_404_for_missing_contract(monkeypatch) -> None:
    fake_db = AskDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)
    app.dependency_overrides[current_user] = lambda: _user()

    try:
        response = client.post(
            "/api/contracts/99999999-9999-9999-9999-999999999999/ask",
            json={"question": "What are the payment terms?"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404


def test_ask_contract_api_hides_other_users_contract(monkeypatch) -> None:
    fake_db = AskDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)
    app.dependency_overrides[current_user] = lambda: _user(OTHER_USER_ID)

    try:
        response = client.post(
            f"/api/contracts/{fake_db.contract_id}/ask",
            json={"question": "What are the payment terms?"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 404
