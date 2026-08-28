from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AnalysisResult, AnalysisStatus


async def claim_next_pending_analysis(db: AsyncSession) -> AnalysisResult | None:
    """
    Atomically claims the oldest pending AnalysisResult row and marks it
    "processing", using SELECT ... FOR UPDATE SKIP LOCKED so multiple
    worker instances polling concurrently never claim the same row twice.
    Commits immediately to release the row lock. Returns None if there's
    nothing pending.
    """
    stmt = (
        select(AnalysisResult)
        .where(AnalysisResult.status == AnalysisStatus.pending)
        .order_by(AnalysisResult.created_at.asc())
        .limit(1)
        .with_for_update(skip_locked=True)
    )
    result = await db.scalar(stmt)
    if result is None:
        return None

    result.status = AnalysisStatus.processing
    await db.commit()
    await db.refresh(result)
    return result
