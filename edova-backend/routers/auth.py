"""Auth endpoints: login / me / logout."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from deps import UserOut, _authenticated_user, _user_out
from repositories import UserRepo, get_conn
from settings import settings

router = APIRouter()


class LoginIn(BaseModel):
    email: str
    password: str


class LoginOut(BaseModel):
    token: str
    user: UserOut


@router.post("/auth/login", response_model=LoginOut)
def login(body: LoginIn):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            user = UserRepo.find_active_by_email(cur, body.email)
            if not user or not user["password_hash"] or not bcrypt.checkpw(
                body.password.encode("utf-8"), user["password_hash"].encode("utf-8")
            ):
                raise HTTPException(status_code=401, detail="invalid email or password")

            token_jti = str(uuid.uuid4())
            expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
            UserRepo.create_session(cur, str(uuid.uuid4()), user["id"], token_jti, expires_at)
            conn.commit()
    finally:
        conn.close()

    token = jwt.encode(
        {"sub": user["id"], "jti": token_jti, "exp": expires_at},
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    return LoginOut(token=token, user=_user_out(user))


@router.get("/auth/me", response_model=UserOut)
def me(authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    return _user_out(user)


@router.post("/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    _, token_jti = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            UserRepo.revoke_session(cur, token_jti)
            conn.commit()
    finally:
        conn.close()
    return {"status": "ok"}
