from fastapi import Depends, HTTPException, status


def require_role(user_dependency, *allowed_roles):
    """
    Creates a reusable dependency that checks
    whether the authenticated user has an allowed role.
    """

    if not allowed_roles:
        raise ValueError("At least one allowed role is required")

    def role_checker(user=Depends(user_dependency)):
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )

        return user

    return role_checker
