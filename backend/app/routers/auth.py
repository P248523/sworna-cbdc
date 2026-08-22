"""Authentication endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_session
from ..deps import get_current_user
from ..models import User
from ..schemas import LoginRequest, LoginResponse
from ..security import create_token, verify_password

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.scalar(select(User).where(User.username == body.username))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "invalid username or password")
    token = create_token(user.username, user.role, user.bank_code, user.account_number)
    return LoginResponse(
        token=token,
        role=user.role,
        username=user.username,
        bank_code=user.bank_code,
        account_number=user.account_number,
    )


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "username": user.username,
        "role": user.role,
        "bank_code": user.bank_code,
        "account_number": user.account_number,
    }