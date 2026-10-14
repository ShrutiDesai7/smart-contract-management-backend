from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi.testclient import TestClient

from app.main import app
from app.security import hash_password
from app.services import auth as auth_service
import app.security as security


client = TestClient(app)


class FakeResult:
    def __init__(self, one: Any = None) -> None:
        self.one = one

    def fetchone(self) -> Any:
        return self.one


class AuthDb:
    def __init__(self) -> None:
        self.users_by_email: dict[str, dict[str, Any]] = {}
        self.users_by_id: dict[str, dict[str, Any]] = {}

    def __enter__(self) -> "AuthDb":
        return self

    def __exit__(self, *_args) -> None:
        return None

    def execute(self, sql: str, params: Any = None) -> FakeResult:
        normalized = " ".join(sql.split()).lower()
        if normalized.startswith("select id from users where email"):
            return FakeResult(one=self.users_by_email.get(params[0]))
        if normalized.startswith("select count(*) as count from users"):
            return FakeResult(one={"count": len(self.users_by_email)})
        if normalized.startswith("insert into users"):
            user_id, name, email, password_hash, role, created_at = params
            user = {
                "id": user_id,
                "name": name,
                "email": email,
                "password_hash": password_hash,
                "role": role,
                "created_at": created_at,
            }
            self.users_by_email[email] = user
            self.users_by_id[str(user_id)] = user
            return FakeResult(one=_public_user(user))
        if normalized.startswith("select id, name, email, password_hash"):
            return FakeResult(one=self.users_by_email.get(params[0]))
        if normalized.startswith("select id, name, email, role"):
            return FakeResult(one=_public_user(self.users_by_id.get(str(params[0]))))
        raise AssertionError(f"Unexpected SQL: {sql}")


def test_register_bootstraps_first_user_as_admin_and_next_user_as_user(monkeypatch) -> None:
    fake_db = AuthDb()
    monkeypatch.setattr(auth_service, "db", lambda: fake_db)

    first = client.post(
        "/api/auth/register",
        json={"name": "Admin One", "email": "admin@example.com", "password": "password123"},
    )
    second = client.post(
        "/api/auth/register",
        json={"name": "User One", "email": "user@example.com", "password": "password123"},
    )

    assert first.status_code == 200
    assert first.json()["user"]["role"] == "ADMIN"
    assert first.json()["accessToken"]
    assert second.status_code == 200
    assert second.json()["user"]["role"] == "USER"


def test_register_rejects_duplicate_email(monkeypatch) -> None:
    fake_db = AuthDb()
    monkeypatch.setattr(auth_service, "db", lambda: fake_db)

    client.post(
        "/api/auth/register",
        json={"name": "Admin One", "email": "admin@example.com", "password": "password123"},
    )
    duplicate = client.post(
        "/api/auth/register",
        json={"name": "Admin Two", "email": "ADMIN@example.com", "password": "password123"},
    )

    assert duplicate.status_code == 409


def test_login_returns_token_for_valid_credentials(monkeypatch) -> None:
    fake_db = AuthDb()
    user_id = UUID("33333333-3333-3333-3333-333333333333")
    user = {
        "id": user_id,
        "name": "Priya",
        "email": "priya@example.com",
        "password_hash": hash_password("password123"),
        "role": "USER",
        "created_at": datetime.now(timezone.utc),
    }
    fake_db.users_by_email[user["email"]] = user
    fake_db.users_by_id[str(user_id)] = user
    monkeypatch.setattr(auth_service, "db", lambda: fake_db)

    response = client.post(
        "/api/auth/login",
        json={"email": "priya@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["tokenType"] == "bearer"
    assert body["accessToken"]
    assert body["user"]["email"] == "priya@example.com"


def test_login_rejects_invalid_credentials(monkeypatch) -> None:
    fake_db = AuthDb()
    monkeypatch.setattr(auth_service, "db", lambda: fake_db)

    response = client.post(
        "/api/auth/login",
        json={"email": "missing@example.com", "password": "wrong-password"},
    )

    assert response.status_code == 401


def test_me_returns_current_user_for_bearer_token(monkeypatch) -> None:
    fake_db = AuthDb()
    monkeypatch.setattr(auth_service, "db", lambda: fake_db)
    monkeypatch.setattr(security, "db", lambda: fake_db)

    created = client.post(
        "/api/auth/register",
        json={"name": "Admin One", "email": "admin@example.com", "password": "password123"},
    ).json()

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {created['accessToken']}"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "admin@example.com"
    assert response.json()["role"] == "ADMIN"


def test_me_rejects_missing_token() -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401


def test_register_with_explicit_role(monkeypatch) -> None:
    fake_db = AuthDb()
    monkeypatch.setattr(auth_service, "db", lambda: fake_db)

    res_user = client.post(
        "/api/auth/register",
        json={"name": "Alice User", "email": "alice@example.com", "password": "password123", "role": "USER"},
    )
    assert res_user.status_code == 200
    assert res_user.json()["user"]["role"] == "USER"

    res_admin = client.post(
        "/api/auth/register",
        json={"name": "Bob Admin", "email": "bob@example.com", "password": "password123", "role": "ADMIN"},
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["user"]["role"] == "ADMIN"


def _public_user(user: dict[str, Any] | None) -> dict[str, Any] | None:
    if user is None:
        return None
    return {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "created_at": user["created_at"],
    }
