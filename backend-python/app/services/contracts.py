from __future__ import annotations

import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import HTTPException, UploadFile

from app.config import settings
from app.database import db
from app.rag.index import index_contract
from app.rag.qa import answer_question_from_chunks
from app.schemas import (
    ContractCreate,
    ContractStatus,
    ReviewDecisionRequest,
    StatusUpdate,
    UserRole,
    VALID_CONTRACT_STATUSES,
)
from app.utils.datetime import iso
from app.utils.documents import extract_text
from app.utils.crypto import decrypt_file, encrypt_file
from app.utils.storage import safe_filename


def contract_response(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "ownerId": str(row["owner_id"]) if row.get("owner_id") else None,
        "title": row.get("title"),
        "description": row.get("description"),
        "status": row.get("status") or ContractStatus.DRAFT,
        "ownerName": row.get("owner_name"),
        "createdAt": iso(row.get("created_at")),
        "updatedAt": iso(row.get("updated_at")),
        "contractName": row.get("contract_name"),
        "originalFileName": row.get("original_file_name"),
        "storedFileName": row.get("stored_file_name"),
        "contentType": row.get("content_type"),
        "fileSizeBytes": row.get("file_size_bytes"),
        "uploadedAt": iso(row.get("uploaded_at")),
    }


def upload_response(row: dict[str, Any]) -> dict[str, Any]:
    response = contract_response(row)
    return {
        key: response.get(key)
        for key in (
            "id",
            "contractName",
            "status",
            "originalFileName",
            "storedFileName",
            "contentType",
            "fileSizeBytes",
            "uploadedAt",
        )
    }


def get_contract(contract_id: uuid.UUID) -> dict[str, Any]:
    with db() as connection:
        row = connection.execute(
            "SELECT * FROM contracts WHERE id = %s", (contract_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Contract not found: {contract_id}")
    return row


def get_accessible_contract(contract_id: uuid.UUID, user: dict[str, Any]) -> dict[str, Any]:
    contract = get_contract(contract_id)
    if _can_access_contract(contract, user):
        return contract
    raise HTTPException(status_code=404, detail=f"Contract not found: {contract_id}")


def list_contracts(
    page: int,
    size: int,
    search: str | None,
    status: str | None,
    user: dict[str, Any],
) -> dict[str, Any]:
    filters: list[str] = []
    parameters: list[Any] = []
    if search and search.strip():
        filters.append(
            "(LOWER(title) LIKE %s OR LOWER(owner_name) LIKE %s OR LOWER(contract_name) LIKE %s)"
        )
        value = f"%{search.strip().lower()}%"
        parameters.extend([value, value, value])
    if status:
        if status not in VALID_CONTRACT_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        filters.append("status = %s")
        parameters.append(status)
    if user.get("role") != UserRole.ADMIN:
        filters.append("owner_id = %s")
        parameters.append(user["id"])

    where = f"WHERE {' AND '.join(filters)}" if filters else ""
    with db() as connection:
        total = connection.execute(
            f"SELECT COUNT(*) AS count FROM contracts {where}", parameters
        ).fetchone()["count"]
        rows = connection.execute(
            f"SELECT * FROM contracts {where} ORDER BY created_at DESC NULLS LAST, id DESC LIMIT %s OFFSET %s",
            [*parameters, size, page * size],
        ).fetchall()

    total_pages = (total + size - 1) // size if total else 0
    return {
        "content": [contract_response(row) for row in rows],
        "page": page,
        "size": size,
        "totalElements": total,
        "totalPages": total_pages,
        "first": page == 0,
        "last": page >= max(total_pages - 1, 0),
    }


def contract_detail(contract_id: uuid.UUID, user: dict[str, Any]) -> dict[str, Any]:
    return contract_response(get_accessible_contract(contract_id, user))


def contract_history(contract_id: uuid.UUID, user: dict[str, Any]) -> list[dict[str, Any]]:
    get_accessible_contract(contract_id, user)
    with db() as connection:
        rows = connection.execute(
            "SELECT * FROM workflow_history WHERE contract_id = %s ORDER BY changed_at DESC",
            (contract_id,),
        ).fetchall()
    return [
        {
            "id": str(row["id"]),
            "contractId": str(row["contract_id"]),
            "previousStatus": row["previous_status"],
            "newStatus": row["new_status"],
            "changedBy": row["changed_by"],
            "comment": row.get("comment"),
            "changedAt": iso(row["changed_at"]),
        }
        for row in rows
    ]


def create_contract(request: ContractCreate, user: dict[str, Any]) -> dict[str, Any]:
    if user.get("role") == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admins cannot create contracts. Creating contracts is reserved for standard users.",
        )
    now = datetime.now(timezone.utc)
    contract_name = request.contract_name or request.title
    with db() as connection:
        row = connection.execute(
            """INSERT INTO contracts (id, owner_id, title, description, status, owner_name, created_at, updated_at, contract_name, uploaded_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (
                uuid.uuid4(),
                user["id"],
                request.title or contract_name,
                request.description,
                ContractStatus.UPLOADED,
                request.owner_name or user.get("name"),
                now,
                now,
                contract_name,
                now,
            ),
        ).fetchone()
    return contract_response(row)


def upload_contract(contract_name: str, file: UploadFile, user: dict[str, Any]) -> dict[str, Any]:
    if user.get("role") == UserRole.ADMIN:
        raise HTTPException(
            status_code=403,
            detail="Admins cannot upload documents. Uploading contracts is reserved for standard users.",
        )
    if not contract_name.strip() or not file.filename:
        raise HTTPException(status_code=400, detail="contractName and file are required")

    original = safe_filename(file.filename)
    if Path(original).suffix.lower() not in (".pdf", ".docx"):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")

    upload_root = Path(settings.upload_dir).resolve()
    upload_root.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid.uuid4()}-{original}.enc"
    plain_target = upload_root / f".tmp-{uuid.uuid4()}-{original}"
    encrypted_target = upload_root / stored_name
    with plain_target.open("wb") as output:
        shutil.copyfileobj(file.file, output)

    try:
        text = extract_text(plain_target, file.content_type)
        encrypt_file(plain_target, encrypted_target)
    except Exception as error:
        plain_target.unlink(missing_ok=True)
        encrypted_target.unlink(missing_ok=True)
        if isinstance(error, HTTPException):
            raise
        raise HTTPException(
            status_code=400, detail="Failed to extract text from document"
        ) from error
    finally:
        plain_target.unlink(missing_ok=True)

    now = datetime.now(timezone.utc)
    contract_id = uuid.uuid4()
    with db() as connection:
        row = connection.execute(
            """INSERT INTO contracts (id, owner_id, title, status, owner_name, contract_name, original_file_name, stored_file_name,
               content_type, file_size_bytes, uploaded_at, created_at, updated_at, file_path, extracted_text)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *""",
            (
                contract_id,
                user["id"],
                contract_name.strip(),
                ContractStatus.UPLOADED,
                user.get("name"),
                contract_name.strip(),
                original,
                stored_name,
                file.content_type,
                encrypted_target.stat().st_size,
                now,
                now,
                now,
                str(encrypted_target),
                text,
            ),
        ).fetchone()
        index_contract(connection, contract_id, text)
    return upload_response(row)


def download_contract(contract_id: uuid.UUID, user: dict[str, Any]) -> dict[str, Any]:
    contract = get_accessible_contract(contract_id, user)
    file_path = contract.get("file_path")
    if not file_path:
        raise HTTPException(status_code=404, detail="Contract file not found")

    path = Path(file_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Contract file not found")

    content = decrypt_file(path) if path.suffix == ".enc" else path.read_bytes()
    return {
        "content": content,
        "filename": contract.get("original_file_name") or contract.get("contract_name") or "contract",
        "content_type": contract.get("content_type") or "application/octet-stream",
    }


def submit_for_review(contract_id: uuid.UUID, user: dict[str, Any]) -> dict[str, Any]:
    contract = get_accessible_contract(contract_id, user)
    return _transition_contract(
        contract,
        ContractStatus.UNDER_REVIEW,
        user,
        "Submitted for admin review",
        require_admin=False,
    )


def review_contract(
    contract_id: uuid.UUID,
    request: ReviewDecisionRequest,
    user: dict[str, Any],
) -> dict[str, Any]:
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required")
    contract = get_accessible_contract(contract_id, user)
    if request.status not in (
        ContractStatus.APPROVED,
        ContractStatus.REJECTED,
        ContractStatus.NEEDS_CHANGES,
    ):
        raise HTTPException(status_code=400, detail="Invalid review decision")
    if request.status in (ContractStatus.REJECTED, ContractStatus.NEEDS_CHANGES) and not (
        request.comment or ""
    ).strip():
        raise HTTPException(status_code=400, detail="Comment is required for this decision")
    return _transition_contract(contract, request.status, user, request.comment, require_admin=True)


def update_status(contract_id: uuid.UUID, request: StatusUpdate, user: dict[str, Any]) -> dict[str, Any]:
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required to update contract status")
    contract = get_accessible_contract(contract_id, user)
    return _transition_contract(contract, request.status, user, request.comment, require_admin=True)


def _transition_contract(
    contract: dict[str, Any],
    new_status: str,
    user: dict[str, Any],
    comment: str | None = None,
    require_admin: bool | None = None,
) -> dict[str, Any]:
    if new_status not in VALID_CONTRACT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    current = contract.get("status") or ContractStatus.DRAFT
    if new_status == current:
        return contract_response(contract)

    if require_admin is True and user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required")

    admin_required = _admin_required_for_transition(current, new_status)
    if require_admin is False:
        admin_required = False
    if admin_required and user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required")

    if not _is_allowed_transition(current, new_status):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition: {current} -> {new_status}",
        )

    now = datetime.now(timezone.utc)
    changed_by = user.get("email") or user.get("name") or str(user.get("id"))
    with db() as connection:
        row = connection.execute(
            "UPDATE contracts SET status = %s, updated_at = %s WHERE id = %s RETURNING *",
            (new_status, now, contract["id"]),
        ).fetchone()
        connection.execute(
            "INSERT INTO workflow_history (id, contract_id, previous_status, new_status, changed_by, comment, changed_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (uuid.uuid4(), contract["id"], current, new_status, changed_by, _clean_comment(comment), now),
        )
    return contract_response(row)


def ask_contract(contract_id: uuid.UUID, question: str, user: dict[str, Any]) -> dict[str, Any]:
    contract = get_accessible_contract(contract_id, user)
    with db() as connection:
        chunk_count = connection.execute(
            "SELECT COUNT(*) AS count FROM contract_chunk WHERE contract_id = %s",
            (contract_id,),
        ).fetchone()["count"]
        if chunk_count == 0 and contract.get("extracted_text"):
            index_contract(connection, contract_id, contract.get("extracted_text"))
        return answer_question_from_chunks(connection, contract_id, question)


def reindex_contracts(user: dict[str, Any]) -> dict[str, int]:
    if user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required")

    with db() as connection:
        rows = connection.execute(
            "SELECT id, extracted_text FROM contracts WHERE extracted_text IS NOT NULL"
        ).fetchall()
        for row in rows:
            index_contract(connection, row["id"], row["extracted_text"])
    return {"contractsReindexed": len(rows)}


def _can_access_contract(contract: dict[str, Any], user: dict[str, Any]) -> bool:
    if user.get("role") == UserRole.ADMIN:
        return True
    return contract.get("owner_id") is not None and str(contract.get("owner_id")) == str(user.get("id"))


def _is_allowed_transition(current: str, new_status: str) -> bool:
    allowed = {
        ContractStatus.DRAFT: {ContractStatus.UNDER_REVIEW, ContractStatus.REVIEW},
        ContractStatus.REVIEW: {ContractStatus.APPROVED, ContractStatus.REJECTED, ContractStatus.NEEDS_CHANGES},
        ContractStatus.UPLOADED: {ContractStatus.UNDER_REVIEW},
        ContractStatus.NEEDS_CHANGES: {ContractStatus.UNDER_REVIEW},
        ContractStatus.UNDER_REVIEW: {
            ContractStatus.APPROVED,
            ContractStatus.REJECTED,
            ContractStatus.NEEDS_CHANGES,
        },
        ContractStatus.APPROVED: set(),
        ContractStatus.REJECTED: {ContractStatus.UNDER_REVIEW},
    }
    return new_status in allowed.get(current, set())


def _admin_required_for_transition(current: str, new_status: str) -> bool:
    if new_status in (ContractStatus.APPROVED, ContractStatus.REJECTED, ContractStatus.NEEDS_CHANGES):
        return True
    if current == ContractStatus.REVIEW and new_status == ContractStatus.APPROVED:
        return True
    return False


def _clean_comment(comment: str | None) -> str | None:
    cleaned = (comment or "").strip()
    return cleaned or None
