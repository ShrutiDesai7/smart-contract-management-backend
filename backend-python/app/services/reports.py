from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg.types.json import Jsonb

from app.database import db
from app.llm.reports import generate_contract_report
from app.services.contracts import get_accessible_contract
from app.utils.datetime import iso


def get_report(contract_id: uuid.UUID, user: dict[str, Any]) -> dict[str, Any]:
    get_accessible_contract(contract_id, user)
    with db() as connection:
        row = connection.execute(
            "SELECT * FROM contract_reports WHERE contract_id = %s",
            (contract_id,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Contract report not found")
    return report_response(row)


def generate_report(contract_id: uuid.UUID, user: dict[str, Any]) -> dict[str, Any]:
    contract = get_accessible_contract(contract_id, user)
    report = generate_contract_report(contract)
    now = datetime.now(timezone.utc)
    with db() as connection:
        row = connection.execute(
            """INSERT INTO contract_reports
               (id, contract_id, summary, key_terms, risk_level, risk_points, important_dates, obligations, generated_by, generated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (contract_id) DO UPDATE SET
                   summary = EXCLUDED.summary,
                   key_terms = EXCLUDED.key_terms,
                   risk_level = EXCLUDED.risk_level,
                   risk_points = EXCLUDED.risk_points,
                   important_dates = EXCLUDED.important_dates,
                   obligations = EXCLUDED.obligations,
                   generated_by = EXCLUDED.generated_by,
                   generated_at = EXCLUDED.generated_at
               RETURNING *""",
            (
                uuid.uuid4(),
                contract_id,
                report["summary"],
                Jsonb(report["key_terms"]),
                report["risk_level"],
                Jsonb(report["risk_points"]),
                Jsonb(report["important_dates"]),
                Jsonb(report["obligations"]),
                report["generated_by"],
                now,
            ),
        ).fetchone()
    return report_response(row)


def report_response(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "contractId": str(row["contract_id"]),
        "summary": row["summary"],
        "keyTerms": _json_list(row["key_terms"]),
        "riskLevel": row["risk_level"],
        "riskPoints": _json_list(row["risk_points"]),
        "importantDates": _json_list(row["important_dates"]),
        "obligations": _json_list(row["obligations"]),
        "generatedBy": row["generated_by"],
        "generatedAt": iso(row["generated_at"]),
    }


def _json_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        loaded = json.loads(value)
        return [str(item) for item in loaded] if isinstance(loaded, list) else []
    return []
