"""Password hashing + JWT auth helpers (stdlib + PyJWT)."""
from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

_JWT_SECRET = os.getenv("SWORNA_JWT_SECRET", "sworna-dev-secret-change-me")
_JWT_ALG = "HS256"
_JWT_TTL_HOURS = int(os.getenv("SWORNA_JWT_TTL_HOURS", "12"))

_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, digest = stored.split("$", 1)
    except ValueError:
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256", password.encode(), bytes.fromhex(salt), _ITERATIONS
    ).hex()
    return hmac.compare_digest(candidate, digest)


def create_token(username: str, role: str, bank_code: str | None, account_number: str | None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "role": role,
        "bank_code": bank_code,
        "account_number": account_number,
        "iat": now,
        "exp": now + timedelta(hours=_JWT_TTL_HOURS),
    }
    return jwt.encode(payload, _JWT_SECRET, algorithm=_JWT_ALG)


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALG])