from __future__ import annotations

import psycopg

from app.config import settings


def db():
    return psycopg.connect(settings.database_url, row_factory=psycopg.rows.dict_row)
