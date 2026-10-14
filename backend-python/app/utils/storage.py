from __future__ import annotations

import re
from pathlib import Path


def safe_filename(name: str | None) -> str:
    cleaned = Path(name or "uploaded-file").name
    cleaned = re.sub(r"[^a-zA-Z0-9._-]", "_", cleaned)
    return cleaned or "uploaded-file"
