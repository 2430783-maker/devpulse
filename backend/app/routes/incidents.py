
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


# Group permission helper

def require_group_permission(conn, group_id: int, user, permission: str):
    if permission not in {
        "can_view",
        "can_create",
        "can_edit",
        "can_delete",
    }:
        raise ValueError("Invalid permission")

    group = conn.execute(
        f"""
        SELECT
            g.owner_id,
            gm.can_view,
            gm.can_create,
            gm.can_edit,
            gm.can_delete
        FROM groups g
        LEFT JOIN group_members gm
            ON gm.group_id = g.id
            AND gm.user_id = %s
        WHERE g.id = %s
          AND (g.owner_id = %s OR gm.user_id = %s)
        """,
        (user["id"], group_id, user["id"], user["id"]),
    ).fetchone()

    if group is None:
        raise HTTPException(
            status_code=404,
            detail="Group not found",
        )

    # Group owners automatically have all permissions.
    if group["owner_id"] == user["id"]:
        return group

    if not group[permission]:
        raise HTTPException(
            status_code=403,
            detail=f"You do not have {permission} permission",
        )

    return group


# Create an incident

@router.post("", response_model=IncidentResponse, status_code=201)
def create_incident(
    incident: IncidentCreate,
    user=Depends(get_current_user),
):
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        if incident.group_id is not None:
            require_group_permission(
                conn,
                incident.group_id,
                user,
                "can_create",
            )

        row = conn.execute(
            """
            INSERT INTO incidents
            (
                title,
                description,
                severity,
                status,
                created_at,
                updated_at,
                user_id,
                group_id
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
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
                incident.group_id,
            ),
        ).fetchone()

    return dict(row)


# List personal incidents and visible group incidents

@router.get("", response_model=list[IncidentResponse])
def get_incidents(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT i.*
            FROM incidents i
            WHERE
                (
                    i.group_id IS NULL
                    AND i.user_id = %s
                )
                OR
                (
                    i.group_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1
                        FROM groups g
                        LEFT JOIN group_members gm
                            ON gm.group_id = g.id
                            AND gm.user_id = %s
                        WHERE g.id = i.group_id
                          AND (
                              g.owner_id = %s
                              OR (
                                  gm.user_id = %s
                                  AND gm.can_view = TRUE
                              )
                          )
                    )
                )
            ORDER BY i.id DESC
            """,
            (
                user["id"],
                user["id"],
                user["id"],
                user["id"],
            ),
        ).fetchall()

    return [dict(row) for row in rows]


# View one incident

@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: int,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        row = conn.execute(
            """
            SELECT * FROM incidents
            WHERE id = %s
            """,
            (incident_id,),
        ).fetchone()

        if row is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        if row["group_id"] is None:
            if row["user_id"] != user["id"]:
                raise HTTPException(
                    status_code=404,
                    detail="Incident not found",
                )
        else:
            require_group_permission(
                conn,
                row["group_id"],
                user,
                "can_view",
            )

    return dict(row)


# Update an incident

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
    values = list(updates.values())

    with get_db() as conn:
        existing = conn.execute(
            """
            SELECT user_id, group_id
            FROM incidents
            WHERE id = %s
            """,
            (incident_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        if existing["group_id"] is None:
            if existing["user_id"] != user["id"]:
                raise HTTPException(
                    status_code=404,
                    detail="Incident not found",
                )
        else:
            require_group_permission(
                conn,
                existing["group_id"],
                user,
                "can_edit",
            )

        row = conn.execute(
            f"""
            UPDATE incidents
            SET {fields}
            WHERE id = %s
            RETURNING *
            """,
            values + [incident_id],
        ).fetchone()

    return dict(row)


# Delete an incident

@router.delete("/{incident_id}", status_code=204)
def delete_incident(
    incident_id: int,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        existing = conn.execute(
            """
            SELECT user_id, group_id
            FROM incidents
            WHERE id = %s
            """,
            (incident_id,),
        ).fetchone()

        if existing is None:
            raise HTTPException(
                status_code=404,
                detail="Incident not found",
            )

        if existing["group_id"] is None:
            if existing["user_id"] != user["id"]:
                raise HTTPException(
                    status_code=404,
                    detail="Incident not found",
                )
        else:
            require_group_permission(
                conn,
                existing["group_id"],
                user,
                "can_delete",
            )

        conn.execute(
            "DELETE FROM incidents WHERE id = %s",
            (incident_id,),
        )

    return Response(status_code=204)
