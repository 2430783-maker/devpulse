from typing import Literal
from pydantic import BaseModel, Field

Severity = Literal["Low", "Medium", "High", "Critical"]
Status = Literal["Open", "In Progress", "Resolved"]


class IncidentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1)
    severity: Severity = "Medium"
    status: Status = "Open"


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, min_length=1)
    severity: Severity | None = None
    status: Status | None = None


class IncidentResponse(IncidentCreate):
    id: int
    created_at: str
    updated_at: str
