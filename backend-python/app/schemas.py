from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ContractStatus(str):
    UPLOADED = "UPLOADED"
    UNDER_REVIEW = "UNDER_REVIEW"
    NEEDS_CHANGES = "NEEDS_CHANGES"
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


VALID_CONTRACT_STATUSES = (
    ContractStatus.UPLOADED,
    ContractStatus.UNDER_REVIEW,
    ContractStatus.NEEDS_CHANGES,
    ContractStatus.DRAFT,
    ContractStatus.REVIEW,
    ContractStatus.APPROVED,
    ContractStatus.REJECTED,
)


class ContractCreate(BaseModel):
    title: str | None = None
    description: str | None = None
    contract_name: str | None = Field(default=None, alias="contractName")
    owner_name: str | None = Field(default=None, alias="ownerName")
    model_config = ConfigDict(populate_by_name=True)


class StatusUpdate(BaseModel):
    status: str
    comment: str | None = Field(default=None, max_length=2000)


class ReviewDecisionRequest(BaseModel):
    status: str
    comment: str | None = Field(default=None, max_length=2000)


class ContractReportResponse(BaseModel):
    id: str
    contractId: str
    summary: str
    keyTerms: list[str]
    riskLevel: str
    riskPoints: list[str]
    importantDates: list[str]
    obligations: list[str]
    generatedBy: str
    generatedAt: str | None


class AskRequest(BaseModel):
    question: str


class UserRole(str):
    USER = "USER"
    ADMIN = "ADMIN"


VALID_USER_ROLES = (UserRole.USER, UserRole.ADMIN)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: str | None = Field(default=None)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Invalid email address")
        return normalized

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip().upper()
        if normalized not in VALID_USER_ROLES:
            raise ValueError("Role must be either 'USER' or 'ADMIN'")
        return normalized


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Invalid email address")
        return normalized


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    createdAt: str | None


class AuthResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    user: UserResponse
