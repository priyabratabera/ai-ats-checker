from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models import User

DbSession = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]


async def ensure_user_exists(user_id: UUID | None, db: AsyncSession) -> None:
    """Raises 404 for a client-supplied user_id that doesn't exist, instead
    of letting a bad id fall through to a raw FK-violation 500 at commit
    time. A no-op when user_id is None (anonymous)."""
    if user_id is None:
        return
    if await db.get(User, user_id) is None:
        raise HTTPException(status_code=404, detail="user_id does not match any known user.")
