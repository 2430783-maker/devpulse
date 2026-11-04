
from pathlib import Path
import sqlite3
from datetime import datetime, timezone
from typing import Literal

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel, Field

app = FastAPI(
    title="DevPulse API",
    description="Incident Management System API",
    version="1.0.0",
)

# Database configuration
DB_PATH = Path(__file__).parent / "devpulse.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)


initialize_database()


# Data validation
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


# Health check
@app.get("/api/health")
def health():
    return {"status": "ok"}


# CREATE incident
@app.post(
    "/api/v1/incidents",
    response_model=IncidentResponse,
    status_code=201,
)
def create_incident(incident: IncidentCreate):
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO incidents
            (title, description, severity, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                incident.title,
                incident.description,
                incident.severity,
                incident.status,
                now,
                now,
            ),
        )

        incident_id = cursor.lastrowid
        row = conn.execute(
            "SELECT * FROM incidents WHERE id = ?",
            (incident_id,),
        ).fetchone()

    return dict(row)


# READ all incidents
@app.get("/api/v1/incidents", response_model=list[IncidentResponse])
def get_incidents():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM incidents ORDER BY id DESC"
        ).fetchall()

    return [dict(row) for row in rows]


# READ one incident
@app.get("/api/v1/incidents/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM incidents WHERE id = ?",
            (incident_id,),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    return dict(row)


# UPDATE incident
@app.patch("/api/v1/incidents/{incident_id}", response_model=IncidentResponse)
def update_incident(incident_id: int, incident: IncidentUpdate):
    updates = incident.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(status_code=400, detail="No update data provided")

    if any(value is None for value in updates.values()):
        raise HTTPException(status_code=422, detail="Fields cannot be null")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        existing = conn.execute(
            "SELECT * FROM incidents WHERE id = ?",
            (incident_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(status_code=404, detail="Incident not found")

        fields = ", ".join(f"{key} = ?" for key in updates)
        values = list(updates.values()) + [incident_id]

        conn.execute(
            f"UPDATE incidents SET {fields} WHERE id = ?",
            values,
        )

        row = conn.execute(
            "SELECT * FROM incidents WHERE id = ?",
            (incident_id,),
        ).fetchone()

    return dict(row)


# DELETE incident
@app.delete("/api/v1/incidents/{incident_id}", status_code=204)
def delete_incident(incident_id: int):
    with get_db() as conn:
        cursor = conn.execute(
            "DELETE FROM incidents WHERE id = ?",
            (incident_id,),
        )

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Incident not found")

    return Response(status_code=204)
