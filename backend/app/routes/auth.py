
import re

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

from app.auth import (
    create_access_token,
    hash_password,
    verify_access_token,
    verify_password,
)
from app.database import get_db


router = APIRouter()
security = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=150)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        value = value.strip().lower()

        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
            raise ValueError("Enter a valid email address")

        return value

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Full name cannot be empty")

        return value


class LoginRequest(BaseModel):
    email: str
    password: str


def public_user(user):
    return {
        "id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "role": user["role"],
    }


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest):
    try:
        with get_db() as conn:
            user = conn.execute(
                """
                INSERT INTO users (email, password_hash, full_name)
                VALUES (%s, %s, %s)
                RETURNING id, email, full_name, role
                """,
                (
                    data.email,
                    hash_password(data.password),
                    data.full_name,
                ),
            ).fetchone()

        return {
            "message": "Account created successfully",
            "user": public_user(user),
        }

    except psycopg.errors.UniqueViolation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )


@router.post("/login")
def login(data: LoginRequest):
    email = data.email.strip().lower()

    with get_db() as conn:
        user = conn.execute(
            """
            SELECT id, email, password_hash, full_name, role, is_banned
            FROM users
            WHERE email = %s
            """,
            (email,),
        ).fetchone()

    if not user or not verify_password(
        data.password, user["password_hash"]
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user["is_banned"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended",
        )

    token = create_access_token(user["id"], user["role"])

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": public_user(user),
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_access_token(credentials.credentials)

    with get_db() as conn:
        user = conn.execute(
            """
            SELECT id, email, full_name, role, is_banned
            FROM users
            WHERE id = %s
            """,
            (int(payload["sub"]),),
        ).fetchone()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    if user["is_banned"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended",
        )

    return user


@router.get("/me")
def get_my_profile(user=Depends(get_current_user)):
    return public_user(user)
