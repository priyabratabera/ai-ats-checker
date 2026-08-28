from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbSession
from app.models import User
from app.schemas.user import IdentifyUserRequest, UserOut

router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.post("", response_model=UserOut, status_code=200)
async def identify_user(body: IdentifyUserRequest, db: DbSession) -> User:
    """
    Get-or-create by email. Not authentication - anyone can claim any email
    by typing it in; this only exists so resumes/analyses can be
    attributed to "whoever said they were this person" for storage
    purposes. Re-identifying with the same email but a new name updates
    the stored name.
    """
    existing = await db.scalar(select(User).where(User.email == body.email))
    if existing is not None:
        if existing.name != body.name:
            existing.name = body.name
            await db.commit()
            await db.refresh(existing)
        return existing

    user = User(name=body.name, email=body.email)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("", response_model=list[UserOut])
async def list_users(db: DbSession, limit: int = 500) -> list[User]:
    """Read-only listing (name, email, created_at) for every identified
    visitor, most recent first. No filtering/editing - just a list."""
    result = await db.scalars(select(User).order_by(User.created_at.desc()).limit(limit))
    return list(result.all())
