from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.schemas import AuthResponse, LoginRequest, RegisterRequest, UserResponse
from app.security import current_user, user_response
from app.services import auth as auth_service


router = APIRouter()


@router.post("/register", response_model=AuthResponse)
def register(request: RegisterRequest) -> dict[str, Any]:
    return auth_service.register_user(request)


@router.post("/login", response_model=AuthResponse)
def login(request: LoginRequest) -> dict[str, Any]:
    return auth_service.login_user(request)


@router.get("/me", response_model=UserResponse)
def me(user: dict[str, Any] = Depends(current_user)) -> dict[str, Any]:
    return user_response(user)
