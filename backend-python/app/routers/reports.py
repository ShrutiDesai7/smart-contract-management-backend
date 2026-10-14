from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends

from app.schemas import ContractReportResponse
from app.security import current_user
from app.services import reports as report_service


router = APIRouter()


@router.get("/{contract_id}/report", response_model=ContractReportResponse)
def get_report(
    contract_id: uuid.UUID,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return report_service.get_report(contract_id, user)


@router.post("/{contract_id}/report/regenerate", response_model=ContractReportResponse)
def regenerate_report(
    contract_id: uuid.UUID,
    user: dict[str, Any] = Depends(current_user),
) -> dict[str, Any]:
    return report_service.generate_report(contract_id, user)
