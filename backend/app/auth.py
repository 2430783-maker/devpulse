import os
import hmac
import hashlib
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status
from pwdlib import PasswordHash


password_hasher = PasswordHash.recommended()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15


def get_secret_key():
    secret_key = os.getenv("JWT_SECRET_KEY")

    if not secret_key:
        raise RuntimeError(
            "JWT_SECRET_KEY environment variable is not configured"
        )

    if len(secret_key) < 32:
        raise RuntimeError(
            "JWT_SECRET_KEY must be at least 32 characters long"
        )

    return secret_key


def get_password_pepper():
    pepper = os.getenv("PASSWORD_PEPPER")

    if not pepper:
        raise RuntimeError(
            "PASSWORD_PEPPER environment variable is not configured"
        )

    return pepper


def prepare_password(password: str) -> str:
    pepper = get_password_pepper()

    return hmac.new(
        pepper.encode("utf-8"),
        password.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def hash_password(password: str) -> str:
    prepared_password = prepare_password(password)
    return password_hasher.hash(prepared_password)


def verify_password(password: str, hashed_password: str) -> bool:
    prepared_password = prepare_password(password)

    return password_hasher.verify(
        prepared_password,
        hashed_password,
    )


def create_access_token(user_id: int, role: str) -> str:
    now = datetime.now(timezone.utc)

    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        ),
    }

    return jwt.encode(
        payload,
        get_secret_key(),
        algorithm=ALGORITHM,
    )


def verify_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            get_secret_key(),
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "access":
            raise jwt.InvalidTokenError("Invalid token type")

        user_id = payload.get("sub")

        if not isinstance(user_id, str) or not user_id.isdigit():
            raise jwt.InvalidTokenError("Invalid user ID")

        return payload

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
