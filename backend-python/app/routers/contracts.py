from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile

from app.schemas import AskRequest, ContractCreate, ReviewDecisionRequest, StatusUpdate
from app.security import current_user
from app.services import contracts as contract_service


router = APIRouter()


@router.get("")
def list_contracts(
    page: int = Query(0, ge=0),
    size: int = Query(10, ge=1, le=100),
    search: str | None = None,
    status: str | None = None,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return contract_service.list_contracts(page, size, search, status, user)


@router.post("")
def create_contract(
    request: ContractCreate,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return contract_service.create_contract(request, user)


@router.post("/upload")
def upload_contract(
    contractName: str = Form(...),
    file: UploadFile = File(...),
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return contract_service.upload_contract(contractName, file, user)


@router.post("/reindex")
def reindex_contracts(user: dict[str, Any] = Depends(current_user)) -> dict[str, int]:
    return contract_service.reindex_contracts(user)


@router.get("/{contract_id}")
def contract_detail(
    contract_id: uuid.UUID,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return contract_service.contract_detail(contract_id, user)


@router.get("/{contract_id}/history")
def contract_history(
    contract_id: uuid.UUID,
    user: dict[str, Any] = Depends(current_user),
) -> list[dict[str, Any]]:
    return contract_service.contract_history(contract_id, user)


@router.get("/{contract_id}/download")
def download_contract(
    contract_id: uuid.UUID,
    user: dict[str, Any] = Depends(current_user),
) -> Response:
    download = contract_service.download_contract(contract_id, user)
    return Response(
        content=download["content"],
        media_type=download["content_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{download["filename"]}"',
        },
    )


@router.put("/{contract_id}/status")
def update_status(
    contract_id: uuid.UUID,
    request: StatusUpdate,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return contract_service.update_status(contract_id, request, user)


@router.post("/{contract_id}/submit-review")
def submit_for_review(
    contract_id: uuid.UUID,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return contract_service.submit_for_review(contract_id, user)


@router.post("/{contract_id}/review")
def review_contract(
    contract_id: uuid.UUID,
    request: ReviewDecisionRequest,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return contract_service.review_contract(contract_id, request, user)


@router.post("/{contract_id}/ask")
def ask_contract(
    contract_id: uuid.UUID,
    request: AskRequest,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return contract_service.ask_contract(contract_id, request.question, user)
