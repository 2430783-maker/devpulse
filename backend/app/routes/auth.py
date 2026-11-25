import re

import psycopg
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

from app.auth import (
    create_access_token,
    create_refresh_token,
    get_refresh_token_expiry,
    hash_password,
    hash_refresh_token,
    verify_access_token,
    verify_password,
)
from app.database import get_db


router = APIRouter()
security = HTTPBearer(auto_error=False)

REFRESH_COOKIE_NAME = "devpulse_refresh_token"
REFRESH_COOKIE_PATH = "/api/v1/auth"
REFRESH_TOKEN_EXPIRE_SECONDS = 7 * 24 * 60 * 60


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


def set_refresh_cookie(response: Response, token: str):
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_SECONDS,
        path=REFRESH_COOKIE_PATH,
    )


def clear_refresh_cookie(response: Response):
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path=REFRESH_COOKIE_PATH,
        httponly=True,
        secure=True,
        samesite="lax",
    )


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
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
):
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

    refresh_token = create_refresh_token()
    refresh_expiry = get_refresh_token_expiry()

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO user_sessions (
                user_id,
                refresh_token_hash,
                expires_at,
                user_agent,
                ip_address
            )
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                user["id"],
                hash_refresh_token(refresh_token),
                refresh_expiry,
                user_agent,
                client_ip,
            ),
        )

    set_refresh_cookie(response, refresh_token)

    access_token = create_access_token(
        user["id"], user["role"]
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": public_user(user),
    }


@router.post("/refresh")
def refresh_access_token(
    request: Request,
    response: Response,
):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    old_token_hash = hash_refresh_token(refresh_token)
    new_refresh_token = create_refresh_token()
    new_token_hash = hash_refresh_token(new_refresh_token)
    new_expiry = get_refresh_token_expiry()

    banned_session = False

    with get_db() as conn:
        session = conn.execute(
            """
            SELECT
                s.id AS session_id,
                s.user_id,
                u.role,
                u.is_banned
            FROM user_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.refresh_token_hash = %s
              AND s.revoked_at IS NULL
              AND s.expires_at > CURRENT_TIMESTAMP
            FOR UPDATE OF s
            """,
            (old_token_hash,),
        ).fetchone()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid, expired, or revoked refresh token",
            )

        if session["is_banned"]:
            conn.execute(
                """
                UPDATE user_sessions
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (session["session_id"],),
            )
            banned_session = True

        else:
            conn.execute(
                """
                UPDATE user_sessions
                SET refresh_token_hash = %s,
                    expires_at = %s,
                    last_used_at = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (
                    new_token_hash,
                    new_expiry,
                    session["session_id"],
                ),
            )

    if banned_session:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been suspended",
        )

    set_refresh_cookie(response, new_refresh_token)

    return {
        "access_token": create_access_token(
            session["user_id"], session["role"]
        ),
        "token_type": "bearer",
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if refresh_token:
        with get_db() as conn:
            conn.execute(
                """
                UPDATE user_sessions
                SET revoked_at = CURRENT_TIMESTAMP
                WHERE refresh_token_hash = %s
                  AND revoked_at IS NULL
                """,
                (hash_refresh_token(refresh_token),),
            )

    clear_refresh_cookie(response)

    return {"message": "Logged out successfully"}


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


@router.get("/sessions")
def get_my_sessions(
    request: Request,
    user=Depends(get_current_user),
):
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    current_token_hash = (
        hash_refresh_token(refresh_token)
        if refresh_token
        else None
    )

    with get_db() as conn:
        sessions = conn.execute(
            """
            SELECT
                id AS session_id,
                created_at,
                expires_at,
                last_used_at,
                user_agent,
                ip_address::TEXT AS ip_address,
                (refresh_token_hash = %s) AS is_current
            FROM user_sessions
            WHERE user_id = %s
              AND revoked_at IS NULL
              AND expires_at > CURRENT_TIMESTAMP
            ORDER BY created_at DESC
            """,
            (current_token_hash, user["id"]),
        ).fetchall()

    return {
        "sessions": sessions,
        "total": len(sessions),
    }


@router.delete("/sessions/{session_id}")
def revoke_my_session(
    session_id: int,
    request: Request,
    response: Response,
    user=Depends(get_current_user),
):
    with get_db() as conn:
        session = conn.execute(
            """
            UPDATE user_sessions
            SET revoked_at = CURRENT_TIMESTAMP
            WHERE id = %s
              AND user_id = %s
              AND revoked_at IS NULL
            RETURNING refresh_token_hash
            """,
            (session_id, user["id"]),
        ).fetchone()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active session not found",
        )

    current_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if (
        current_token
        and hash_refresh_token(current_token)
        == session["refresh_token_hash"]
    ):
        clear_refresh_cookie(response)

    return {
        "message": "Session revoked successfully",
        "session_id": session_id,
    }
