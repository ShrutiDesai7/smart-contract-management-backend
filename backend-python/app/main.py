from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.db_init import init_db
from app.routers.auth import router as auth_router
from app.routers.contracts import router as contracts_router
from app.routers.reports import router as reports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Contract Management API", version="1.0.0", lifespan=lifespan)
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(contracts_router, prefix="/api/contracts", tags=["contracts"])
app.include_router(reports_router, prefix="/api/contracts", tags=["reports"])
app.include_router(contracts_router, prefix="/contracts", tags=["contracts-legacy"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
