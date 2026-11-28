
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import get_db
from app.routes.auth import get_current_user
from app.rbac import require_role


router = APIRouter()


# Request models
class RoleUpdateRequest(BaseModel):
    role: Literal["user", "admin"]


class BanUpdateRequest(BaseModel):
    is_banned: bool


# Every endpoint in this file requires admin access.
def require_admin():
    return Depends(require_role(get_current_user, "admin"))


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

    where_clause = (
        "WHERE " + " AND ".join(conditions)
        if conditions else ""
    )

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

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "users": users,
    }


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
            "SELECT id FROM users WHERE id = %s",
            (user_id,),
        ).fetchone()

        if not target:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )

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
            "SELECT id, role FROM users WHERE id = %s",
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

    action = "banned" if request.is_banned else "unbanned"

    return {
        "message": f"User {action} successfully",
        "user": updated_user,
    }
