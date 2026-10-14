from __future__ import annotations

from datetime import datetime, timezone


def iso(value: datetime | None) -> str | None:
    return value.astimezone(timezone.utc).isoformat() if value else None
