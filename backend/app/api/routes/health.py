from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import AppSettings, DbSession

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health")
async def health(db: DbSession, settings: AppSettings) -> dict:
    db_ok = True
    try:
        await db.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 - a health check must never itself fail
        db_ok = False

    return {
        "status": "ok" if db_ok else "degraded",
        "database": "ok" if db_ok else "unreachable",
        "ai_provider": settings.ai_provider,
    }
