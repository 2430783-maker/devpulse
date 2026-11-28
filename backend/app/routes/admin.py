
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from psycopg.types.json import Jsonb

from app.database import get_db
from app.routes.auth import get_current_user
from app.rbac import require_role


router = APIRouter()


class RoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]


class BanUpdateRequest(BaseModel):
    is_banned: bool


@router.get("/users")
def list_users(
    q: str | None = Query(default=None, max_length=255),
    role: Literal["user", "admin"] | None = None,
    is_banned: bool | None = None,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    admin=Depends(require_role(get_current_user, "admin")),
):
    conditions = []
    params = []

    if q:
        conditions.append("(email ILIKE %s OR full_name ILIKE %s)")
        search_term = f"%{q}%"
        params.extend([search_term, search_term])

    if role:
        conditions.append("role = %s")
        params.append(role)

    if is_banned is not None:
        conditions.append("is_banned = %s")
        params.append(is_banned)

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) AS total FROM users {where_clause}",
            params,
        ).fetchone()["total"]

        users = conn.execute(
            f"""
            SELECT id, email, full_name, role, is_banned,
                   created_at, updated_at
            FROM users
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            params + [limit, offset],
        ).fetchall()

    return {"total": total, "limit": limit, "offset": offset, "users": users}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    request: RoleUpdateRequest,
    admin=Depends(require_role(get_current_user, "admin")),
):
    if user_id == admin["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot change your own role",
        )

    with get_db() as conn:
        target = conn.execute(
            "SELECT id, role FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()

        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        old_role = target["role"]

        updated_user = conn.execute(
            """
            UPDATE users
            SET role = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, email, full_name, role, is_banned,
                      created_at, updated_at
            """,
            (request.role, user_id),
        ).fetchone()

        if old_role != request.role:
            conn.execute(
                """
                INSERT INTO audit_logs
                    (actor_user_id, target_user_id, action, details)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    admin["id"],
                    user_id,
                    "user.role_changed",
                    Jsonb({
                        "old_role": old_role,
                        "new_role": request.role,
                    }),
                ),
            )

    return {
        "message": "User role updated successfully",
        "user": updated_user,
    }


@router.patch("/users/{user_id}/ban")
def update_user_ban_status(
    user_id: int,
    request: BanUpdateRequest,
    admin=Depends(require_role(get_current_user, "admin")),
):
    if user_id == admin["id"] and request.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot ban your own account",
        )

    with get_db() as conn:
        target = conn.execute(
            "SELECT id, role, is_banned FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()

        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

        if request.is_banned and target["role"] == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot ban another administrator",
            )

        old_status = target["is_banned"]

        updated_user = conn.execute(
            """
            UPDATE users
            SET is_banned = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING id, email, full_name, role, is_banned,
                      created_at, updated_at
            """,
            (request.is_banned, user_id),
        ).fetchone()

        if old_status != request.is_banned:
            action = "user.banned" if request.is_banned else "user.unbanned"

            conn.execute(
                """
                INSERT INTO audit_logs
                    (actor_user_id, target_user_id, action, details)
                VALUES (%s, %s, %s, %s)
                """,
                (
                    admin["id"],
                    user_id,
                    action,
                    Jsonb({
                        "previous_is_banned": old_status,
                        "new_is_banned": request.is_banned,
                    }),
                ),
            )

    action_text = "banned" if request.is_banned else "unbanned"

    return {
        "message": f"User {action_text} successfully",
        "user": updated_user,
    }


@router.get("/audit-logs")
def list_audit_logs(
    action: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    admin=Depends(require_role(get_current_user, "admin")),
):
    conditions = []
    params = []

    if action:
        conditions.append("a.action = %s")
        params.append(action)

    where_clause = (
        "WHERE " + " AND ".join(conditions)
        if conditions else ""
    )

    with get_db() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) AS total FROM audit_logs a {where_clause}",
            params,
        ).fetchone()["total"]

        logs = conn.execute(
            f"""
            SELECT
                a.id,
                a.action,
                a.details,
                a.created_at,
                a.actor_user_id,
                actor.email AS actor_email,
                a.target_user_id,
                target.email AS target_email
            FROM audit_logs a
            LEFT JOIN users actor ON actor.id = a.actor_user_id
            LEFT JOIN users target ON target.id = a.target_user_id
            {where_clause}
            ORDER BY a.created_at DESC, a.id DESC
            LIMIT %s OFFSET %s
            """,
            params + [limit, offset],
        ).fetchall()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "logs": logs,
    }
