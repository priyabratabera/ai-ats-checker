from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class IdentifyUserRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr


class UserOut(BaseModel):
    id: UUID
    name: str | None
    email: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
