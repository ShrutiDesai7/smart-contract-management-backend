from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
import shutil
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException

from app.rag.vector_codec import from_bytes
from app.schemas import ContractStatus, ReviewDecisionRequest, StatusUpdate
from app.services import contracts as contract_service


OWNER_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
ADMIN_ID = UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
TEST_USER = {
    "id": OWNER_ID,
    "name": "Priya",
    "email": "priya@example.com",
    "role": "USER",
}
ADMIN_USER = {
    "id": ADMIN_ID,
    "name": "Admin",
    "email": "admin@example.com",
    "role": "ADMIN",
}


class FakeUploadFile:
    def __init__(self, filename: str, content: bytes, content_type: str) -> None:
        self.filename = filename
        self.file = BytesIO(content)
        self.content_type = content_type


class FakeResult:
    def __init__(self, one: Any = None, all_rows: list[dict[str, Any]] | None = None) -> None:
        self.one = one
        self.all_rows = [] if all_rows is None else all_rows

    def fetchone(self) -> Any:
        return self.one

    def fetchall(self) -> list[dict[str, Any]]:
        return self.all_rows


class UploadDb:
    def __init__(self) -> None:
        self.contract: dict[str, Any] | None = None
        self.chunks: list[dict[str, Any]] = []
        self.deleted_contract_ids: list[UUID] = []

    def __enter__(self) -> "UploadDb":
        return self

    def __exit__(self, *_args) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> FakeResult:
        normalized = " ".join(sql.split()).lower()
        if normalized.startswith("select * from contracts"):
            if self.contract and params and params[0] == self.contract["id"]:
                return FakeResult(one=self.contract)
            return FakeResult(one=None)
        if normalized.startswith("insert into contracts"):
            (
                contract_id,
                owner_id,
                title,
                status,
                owner_name,
                contract_name,
                original_file_name,
                stored_file_name,
                content_type,
                file_size_bytes,
                uploaded_at,
                created_at,
                updated_at,
                file_path,
                extracted_text,
            ) = params
            self.contract = {
                "id": contract_id,
                "owner_id": owner_id,
                "title": title,
                "description": None,
                "status": status,
                "owner_name": owner_name,
                "created_at": created_at,
                "updated_at": updated_at,
                "contract_name": contract_name,
                "original_file_name": original_file_name,
                "stored_file_name": stored_file_name,
                "content_type": content_type,
                "file_size_bytes": file_size_bytes,
                "uploaded_at": uploaded_at,
                "file_path": file_path,
                "extracted_text": extracted_text,
            }
            return FakeResult(one=self.contract)
        if normalized.startswith("delete from contract_chunk"):
            self.deleted_contract_ids.append(params[0])
            return FakeResult()
        if normalized.startswith("insert into contract_chunk"):
            contract_id, chunk_index, chunk_text, embedding = params[:4]
            self.chunks.append(
                {
                    "contract_id": contract_id,
                    "chunk_index": chunk_index,
                    "chunk_text": chunk_text,
                    "embedding": embedding,
                }
            )
            return FakeResult()
        raise AssertionError(f"Unexpected SQL: {sql}")


class StatusDb:
    def __init__(self) -> None:
        now = datetime.now(timezone.utc)
        self.contract = {
            "id": UUID("11111111-1111-1111-1111-111111111111"),
            "owner_id": OWNER_ID,
            "title": "Vendor Agreement",
            "description": None,
            "status": ContractStatus.UPLOADED,
            "owner_name": "Priya",
            "created_at": now,
            "updated_at": now,
            "contract_name": "Vendor Agreement",
            "original_file_name": None,
            "stored_file_name": None,
            "content_type": None,
            "file_size_bytes": None,
            "uploaded_at": now,
            "file_path": None,
            "extracted_text": None,
        }
        self.history: list[tuple[Any, ...]] = []

    def __enter__(self) -> "StatusDb":
        return self

    def __exit__(self, *_args) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> FakeResult:
        normalized = " ".join(sql.split()).lower()
        if normalized.startswith("select * from contracts"):
            return FakeResult(one=self.contract)
        if normalized.startswith("update contracts set status"):
            status, updated_at, _contract_id = params
            self.contract = self.contract | {"status": status, "updated_at": updated_at}
            return FakeResult(one=self.contract)
        if normalized.startswith("insert into workflow_history"):
            self.history.append(tuple(params))
            return FakeResult()
        raise AssertionError(f"Unexpected SQL: {sql}")


def test_upload_contract_saves_file_extracts_text_and_indexes_embeddings(
    monkeypatch: pytest.MonkeyPatch
) -> None:
    upload_dir = Path.cwd() / ".test-uploads" / str(uuid4())
    fake_db = UploadDb()
    monkeypatch.setattr(contract_service.settings, "upload_dir", str(upload_dir))
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)
    monkeypatch.setattr(
        contract_service,
        "extract_text",
        lambda _target, _content_type: "Payment terms are Net 30 days. " * 80,
    )

    try:
        response = contract_service.upload_contract(
            "NDA - ACME",
            FakeUploadFile("nda.pdf", b"%PDF fake", "application/pdf"),
            TEST_USER,
        )

        assert response["contractName"] == "NDA - ACME"
        assert response["status"] == ContractStatus.UPLOADED
        assert response["originalFileName"] == "nda.pdf"
        assert fake_db.contract is not None
        assert Path(fake_db.contract["file_path"]).exists()
        assert Path(fake_db.contract["file_path"]).suffix == ".enc"
        assert Path(fake_db.contract["file_path"]).read_bytes() != b"%PDF fake"
        assert fake_db.chunks
        assert all(from_bytes(chunk["embedding"]) for chunk in fake_db.chunks)
    finally:
        shutil.rmtree(upload_dir.parent, ignore_errors=True)


def test_download_contract_decrypts_owner_file(monkeypatch: pytest.MonkeyPatch) -> None:
    upload_dir = Path.cwd() / ".test-uploads" / str(uuid4())
    fake_db = UploadDb()
    monkeypatch.setattr(contract_service.settings, "upload_dir", str(upload_dir))
    monkeypatch.setattr(contract_service.settings, "file_encryption_key", "test-file-key")
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)
    monkeypatch.setattr(contract_service, "extract_text", lambda _target, _content_type: "Contract text")

    try:
        contract_service.upload_contract(
            "NDA - ACME",
            FakeUploadFile("nda.pdf", b"plain contract bytes", "application/pdf"),
            TEST_USER,
        )

        assert fake_db.contract is not None
        download = contract_service.download_contract(fake_db.contract["id"], TEST_USER)

        assert download["content"] == b"plain contract bytes"
        assert download["filename"] == "nda.pdf"
        assert download["content_type"] == "application/pdf"
    finally:
        shutil.rmtree(upload_dir.parent, ignore_errors=True)


def test_submit_for_review_records_workflow_history(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = StatusDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)

    response = contract_service.submit_for_review(
        fake_db.contract["id"],
        TEST_USER,
    )

    assert response["status"] == ContractStatus.UNDER_REVIEW
    assert len(fake_db.history) == 1
    _, contract_id, previous_status, new_status, changed_by, comment, _changed_at = fake_db.history[0]
    assert contract_id == fake_db.contract["id"]
    assert previous_status == ContractStatus.UPLOADED
    assert new_status == ContractStatus.UNDER_REVIEW
    assert changed_by == TEST_USER["email"]
    assert comment == "Submitted for admin review"


def test_admin_review_approves_under_review_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = StatusDb()
    fake_db.contract["status"] = ContractStatus.UNDER_REVIEW
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)

    response = contract_service.review_contract(
        fake_db.contract["id"],
        ReviewDecisionRequest(status=ContractStatus.APPROVED, comment="Looks good"),
        ADMIN_USER,
    )

    assert response["status"] == ContractStatus.APPROVED
    _, _contract_id, previous_status, new_status, changed_by, comment, _changed_at = fake_db.history[0]
    assert previous_status == ContractStatus.UNDER_REVIEW
    assert new_status == ContractStatus.APPROVED
    assert changed_by == ADMIN_USER["email"]
    assert comment == "Looks good"


def test_admin_review_requires_comment_for_rejection(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = StatusDb()
    fake_db.contract["status"] = ContractStatus.UNDER_REVIEW
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)

    with pytest.raises(HTTPException) as error:
        contract_service.review_contract(
            fake_db.contract["id"],
            ReviewDecisionRequest(status=ContractStatus.REJECTED),
            ADMIN_USER,
        )

    assert error.value.status_code == 400
    assert "Comment is required" in error.value.detail
    assert fake_db.history == []


def test_user_cannot_make_admin_review_decision(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = StatusDb()
    fake_db.contract["status"] = ContractStatus.UNDER_REVIEW
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)

    with pytest.raises(HTTPException) as error:
        contract_service.review_contract(
            fake_db.contract["id"],
            ReviewDecisionRequest(status=ContractStatus.APPROVED),
            TEST_USER,
        )

    assert error.value.status_code == 403


def test_update_status_rejects_invalid_transition(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = StatusDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)

    with pytest.raises(HTTPException) as error:
        contract_service.update_status(
            fake_db.contract["id"],
            StatusUpdate(status=ContractStatus.APPROVED),
            ADMIN_USER,
        )

    assert error.value.status_code == 400
    assert "Invalid status transition" in error.value.detail
    assert fake_db.history == []


def test_user_cannot_access_another_users_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = StatusDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)
    other_user = TEST_USER | {"id": UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")}

    with pytest.raises(HTTPException) as error:
        contract_service.contract_detail(fake_db.contract["id"], other_user)

    assert error.value.status_code == 404


def test_admin_can_access_any_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = StatusDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)

    response = contract_service.contract_detail(fake_db.contract["id"], ADMIN_USER)

    assert response["id"] == str(fake_db.contract["id"])
    assert response["ownerId"] == str(OWNER_ID)


def test_admin_cannot_upload_contract() -> None:
    with pytest.raises(HTTPException) as error:
        contract_service.upload_contract(
            "Admin Contract",
            FakeUploadFile("nda.pdf", b"%PDF fake", "application/pdf"),
            ADMIN_USER,
        )
    assert error.value.status_code == 403
    assert "Admins cannot upload documents" in error.value.detail


def test_user_cannot_update_status_directly(monkeypatch: pytest.MonkeyPatch) -> None:
    fake_db = StatusDb()
    monkeypatch.setattr(contract_service, "db", lambda: fake_db)

    with pytest.raises(HTTPException) as error:
        contract_service.update_status(
            fake_db.contract["id"],
            StatusUpdate(status=ContractStatus.UNDER_REVIEW),
            TEST_USER,
        )
    assert error.value.status_code == 403
    assert "Admin role required" in error.value.detail
