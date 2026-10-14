from __future__ import annotations

import base64
import hashlib
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException

from app.config import settings


def encrypt_file(source: Path, target: Path) -> None:
    target.write_bytes(_fernet().encrypt(source.read_bytes()))


def decrypt_file(path: Path) -> bytes:
    try:
        return _fernet().decrypt(path.read_bytes())
    except InvalidToken as error:
        raise HTTPException(status_code=500, detail="Failed to decrypt contract file") from error


def _fernet() -> Fernet:
    key = settings.file_encryption_key.strip()
    try:
        return Fernet(key.encode("utf-8"))
    except ValueError:
        digest = hashlib.sha256(key.encode("utf-8")).digest()
        return Fernet(base64.urlsafe_b64encode(digest))
