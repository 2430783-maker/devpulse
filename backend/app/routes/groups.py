
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator

from app.database import get_db
from app.routes.auth import get_current_user

router = APIRouter()


# Request schemas

class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class GroupRename(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class MemberAdd(BaseModel):
    user_id: int | None = Field(default=None, gt=0)
    email: str | None = None

    @model_validator(mode="after")
    def validate_member(self):
        if self.user_id is None and not self.email:
            raise ValueError("Provide either user_id or email")
        return self


class MemberPermissions(BaseModel):
    can_view: bool = True
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False


# Shared authorization helpers

def get_group_access(conn, group_id: int, user_id: int):
    return conn.execute(
        """
        SELECT
            g.*,
            gm.can_view,
            gm.can_create,
            gm.can_edit,
            gm.can_delete,
            CASE
                WHEN g.owner_id = %s THEN 'owner'
                ELSE 'member'
            END AS membership_role
        FROM groups g
        LEFT JOIN group_members gm
            ON gm.group_id = g.id
            AND gm.user_id = %s
        WHERE g.id = %s
          AND (g.owner_id = %s OR gm.user_id = %s)
        """,
        (user_id, user_id, group_id, user_id, user_id),
    ).fetchone()


def require_group_access(conn, group_id: int, user):
    group = get_group_access(conn, group_id, user["id"])

    if group is None:
        raise HTTPException(
            status_code=404,
            detail="Group not found",
        )

    if group["membership_role"] != "owner" and not group["can_view"]:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this group",
        )

    return group


def require_group_owner(conn, group_id: int, user):
    group = conn.execute(
        """
        SELECT id, owner_id
        FROM groups
        WHERE id = %s AND owner_id = %s
        """,
        (group_id, user["id"]),
    ).fetchone()

    if group is None:
        raise HTTPException(
            status_code=403,
            detail="Only the group owner can perform this action",
        )

    return group


def serialize_group(group):
    result = dict(group)

    if result["membership_role"] == "owner":
        result.update({
            "can_view": True,
            "can_create": True,
            "can_edit": True,
            "can_delete": True,
        })

    return result


# Create a group

@router.post("", status_code=status.HTTP_201_CREATED)
def create_group(
    data: GroupCreate,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        group = conn.execute(
            """
            INSERT INTO groups (name, owner_id)
            VALUES (%s, %s)
            RETURNING *
            """,
            (data.name.strip(), user["id"]),
        ).fetchone()

    return {
        "message": "Group created successfully",
        "group": dict(group),
    }


# List groups the current user owns or belongs to

@router.get("")
def list_groups(user=Depends(get_current_user)):
    with get_db() as conn:
        groups = conn.execute(
            """
            SELECT
                g.*,
                CASE
                    WHEN g.owner_id = %s THEN 'owner'
                    ELSE 'member'
                END AS membership_role
            FROM groups g
            LEFT JOIN group_members gm
                ON gm.group_id = g.id
                AND gm.user_id = %s
            WHERE g.owner_id = %s
               OR (gm.user_id = %s AND gm.can_view = TRUE)
            ORDER BY g.created_at DESC
            """,
            (user["id"], user["id"], user["id"], user["id"]),
        ).fetchall()

    return {"groups": [dict(group) for group in groups]}


# View a group

@router.get("/{group_id}")
def get_group(
    group_id: int,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        group = require_group_access(conn, group_id, user)

    return serialize_group(group)


# List group members and their permissions

@router.get("/{group_id}/members")
def list_group_members(
    group_id: int,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        require_group_access(conn, group_id, user)

        members = conn.execute(
            """
            SELECT
                u.id,
                u.email,
                u.full_name,
                'owner' AS membership_role,
                TRUE AS can_view,
                TRUE AS can_create,
                TRUE AS can_edit,
                TRUE AS can_delete
            FROM groups g
            JOIN users u ON u.id = g.owner_id
            WHERE g.id = %s

            UNION ALL

            SELECT
                u.id,
                u.email,
                u.full_name,
                'member' AS membership_role,
                gm.can_view,
                gm.can_create,
                gm.can_edit,
                gm.can_delete
            FROM group_members gm
            JOIN users u ON u.id = gm.user_id
            WHERE gm.group_id = %s

            ORDER BY membership_role, full_name
            """,
            (group_id, group_id),
        ).fetchall()

    return {"members": [dict(member) for member in members]}


# Rename a group (owner only)

@router.patch("/{group_id}")
def rename_group(
    group_id: int,
    data: GroupRename,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        require_group_owner(conn, group_id, user)

        group = conn.execute(
            """
            UPDATE groups
            SET name = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING *
            """,
            (data.name.strip(), group_id),
        ).fetchone()

    return {
        "message": "Group renamed successfully",
        "group": dict(group),
    }


# Delete a group (owner only)

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(
    group_id: int,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        require_group_owner(conn, group_id, user)

        conn.execute(
            "DELETE FROM groups WHERE id = %s",
            (group_id,),
        )


# Add a member (owner only)

@router.post(
    "/{group_id}/members",
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    group_id: int,
    data: MemberAdd,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        require_group_owner(conn, group_id, user)

        

        if data.email:
            target = conn.execute(
                "SELECT id FROM users WHERE LOWER(email) = LOWER(%s)",
                (data.email.strip(),),
            ).fetchone()
        else:
            target = conn.execute(
                "SELECT id FROM users WHERE id = %s",
                (data.user_id,),
            ).fetchone()

        if target is None:
            raise HTTPException(
                status_code=404,
                detail="User not found",
            )

        target_user_id = target["id"]

        if target_user_id == user["id"]:
            raise HTTPException(
                status_code=400,
                detail="The group owner is already a group member",
            )

        existing = conn.execute(
            """
            SELECT id FROM group_members
            WHERE group_id = %s AND user_id = %s
            """,
            (group_id, target_user_id),
        ).fetchone()

        if existing:
            raise HTTPException(
                status_code=409,
                detail="User is already a group member",
            )

        member = conn.execute(
            """
            INSERT INTO group_members (group_id, user_id)
            VALUES (%s, %s)
            RETURNING *
            """,
            (group_id, target_user_id),
        ).fetchone()

    return {
        "message": "Member added successfully",
        "member": dict(member),
    }


# Change a member's permissions (owner only)

@router.patch("/{group_id}/members/{member_user_id}")
def update_member_permissions(
    group_id: int,
    member_user_id: int,
    data: MemberPermissions,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        require_group_owner(conn, group_id, user)

        member = conn.execute(
            """
            UPDATE group_members
            SET can_view = %s,
                can_create = %s,
                can_edit = %s,
                can_delete = %s
            WHERE group_id = %s AND user_id = %s
            RETURNING *
            """,
            (
                data.can_view,
                data.can_create,
                data.can_edit,
                data.can_delete,
                group_id,
                member_user_id,
            ),
        ).fetchone()

        if member is None:
            raise HTTPException(
                status_code=404,
                detail="Group member not found",
            )

    return {
        "message": "Member permissions updated",
        "member": dict(member),
    }


# Remove a member (owner only)

@router.delete(
    "/{group_id}/members/{member_user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_member(
    group_id: int,
    member_user_id: int,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        require_group_owner(conn, group_id, user)

        result = conn.execute(
            """
            DELETE FROM group_members
            WHERE group_id = %s AND user_id = %s
            """,
            (group_id, member_user_id),
        )

        if result.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Group member not found",
            )
