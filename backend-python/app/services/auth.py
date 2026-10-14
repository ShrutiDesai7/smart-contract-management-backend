from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from app.database import db
from app.schemas import LoginRequest, RegisterRequest, UserRole
from app.security import create_access_token, hash_password, user_response, verify_password


def register_user(request: RegisterRequest) -> dict[str, Any]:
    email = request.email.lower()
    name = request.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    now = datetime.now(timezone.utc)
    with db() as connection:
        existing = connection.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered")

        user_count = connection.execute(
            "SELECT COUNT(*) AS count FROM users",
        ).fetchone()["count"]
        if request.role and request.role.upper() in (UserRole.ADMIN, UserRole.USER):
            role = request.role.upper()
        else:
            role = UserRole.ADMIN if user_count == 0 else UserRole.USER
        user = connection.execute(
            """INSERT INTO users (id, name, email, password_hash, role, created_at)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id, name, email, role, created_at""",
            (uuid.uuid4(), name, email, hash_password(request.password), role, now),
        ).fetchone()

    return _auth_response(user)


def login_user(request: LoginRequest) -> dict[str, Any]:
    email = request.email.lower()
    with db() as connection:
        user = connection.execute(
            "SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = %s",
            (email,),
        ).fetchone()

    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return _auth_response(user)


def _auth_response(user: dict[str, Any]) -> dict[str, Any]:
    public_user = user_response(user)
    return {
        "accessToken": create_access_token(user),
        "tokenType": "bearer",
        "user": public_user,
    }
