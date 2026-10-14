from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.security import current_user
from app.services import contracts as contract_service


client = TestClient(app)
TEST_USER = {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Test User",
    "email": "user@example.com",
    "role": "ADMIN",
}


def test_health_returns_ok() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_contract_routes_support_api_and_legacy_prefixes(monkeypatch) -> None:
    payload = {
        "content": [],
        "page": 0,
        "size": 10,
        "totalElements": 0,
        "totalPages": 0,
        "first": True,
        "last": True,
    }

    def fake_list_contracts(page, size, search, status, user):
        assert user == TEST_USER
        return payload | {"page": page, "size": size}

    monkeypatch.setattr(contract_service, "list_contracts", fake_list_contracts)
    app.dependency_overrides[current_user] = lambda: TEST_USER

    try:
        api_response = client.get("/api/contracts?page=0&size=10")
        legacy_response = client.get("/contracts?page=0&size=10")
    finally:
        app.dependency_overrides.clear()

    assert api_response.status_code == 200
    assert api_response.json() == payload
    assert legacy_response.status_code == 200
    assert legacy_response.json() == payload


def test_reindex_route_is_not_shadowed_by_contract_id_route(monkeypatch) -> None:
    monkeypatch.setattr(
        contract_service,
        "reindex_contracts",
        lambda user: {"contractsReindexed": 0},
    )
    app.dependency_overrides[current_user] = lambda: TEST_USER

    try:
        response = client.post("/api/contracts/reindex")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"contractsReindexed": 0}


def test_submit_review_route_forwards_authenticated_user(monkeypatch) -> None:
    contract_id = "22222222-2222-2222-2222-222222222222"
    payload = {"id": contract_id, "status": "UNDER_REVIEW"}

    def fake_submit_for_review(received_contract_id, user):
        assert str(received_contract_id) == contract_id
        assert user == TEST_USER
        return payload

    monkeypatch.setattr(contract_service, "submit_for_review", fake_submit_for_review)
    app.dependency_overrides[current_user] = lambda: TEST_USER

    try:
        response = client.post(f"/api/contracts/{contract_id}/submit-review")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == payload


def test_review_route_accepts_decision_payload(monkeypatch) -> None:
    contract_id = "33333333-3333-3333-3333-333333333333"
    payload = {"id": contract_id, "status": "APPROVED"}

    def fake_review_contract(received_contract_id, request, user):
        assert str(received_contract_id) == contract_id
        assert request.status == "APPROVED"
        assert request.comment == "Approved for signature"
        assert user == TEST_USER
        return payload

    monkeypatch.setattr(contract_service, "review_contract", fake_review_contract)
    app.dependency_overrides[current_user] = lambda: TEST_USER

    try:
        response = client.post(
            f"/api/contracts/{contract_id}/review",
            json={"status": "APPROVED", "comment": "Approved for signature"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == payload


def test_contract_routes_require_authentication() -> None:
    response = client.get("/api/contracts")

    assert response.status_code == 401
