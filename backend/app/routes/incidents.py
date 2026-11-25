
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response

from app.database import get_db
from app.routes.auth import get_current_user
from app.schemas import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
)

router = APIRouter()


@router.post("", response_model=IncidentResponse, status_code=201)
def create_incident(
    incident: IncidentCreate,
    user=Depends(get_current_user),
):
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        row = conn.execute(
            """
            INSERT INTO incidents
            (title, description, severity, status, created_at, updated_at, user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
            """,
            (
                incident.title,
                incident.description,
                incident.severity,
                incident.status,
                now,
                now,
                user["id"],
            ),
        ).fetchone()

    return dict(row)


@router.get("", response_model=list[IncidentResponse])
def get_incidents(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT * FROM incidents
            WHERE user_id = %s
            ORDER BY id DESC
            """,
            (user["id"],),
        ).fetchall()

    return [dict(row) for row in rows]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT * FROM incidents
            WHERE id = %s AND user_id = %s
            """,
            (incident_id, user["id"]),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    return dict(row)


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    incident: IncidentUpdate,
    user=Depends(get_current_user),
):
    updates = incident.model_dump(exclude_unset=True)

    if not updates:
        raise HTTPException(
            status_code=400,
            detail="No update data provided",
        )

    if any(value is None for value in updates.values()):
        raise HTTPException(
            status_code=422,
            detail="Fields cannot be null",
        )

    allowed_fields = {"title", "description", "severity", "status"}

    if not set(updates).issubset(allowed_fields):
        raise HTTPException(
            status_code=422,
            detail="Invalid update fields",
        )

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    fields = ", ".join(f"{key} = %s" for key in updates)
    values = list(updates.values()) + [incident_id, user["id"]]

    with get_db() as conn:
        row = conn.execute(
            f"""
            UPDATE incidents
            SET {fields}
            WHERE id = %s AND user_id = %s
            RETURNING *
            """,
            values,
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    return dict(row)


@router.delete("/{incident_id}", status_code=204)
def delete_incident(
    incident_id: int,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        cursor = conn.execute(
            """
            DELETE FROM incidents
            WHERE id = %s AND user_id = %s
            """,
            (incident_id, user["id"]),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

    return Response(status_code=204)
