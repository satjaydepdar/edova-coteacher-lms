"""Auth dependencies shared by the routers: Bearer-token validation against
the user_sessions table, the UserOut DTO, and the user -> roster-student
mapping."""

from typing import Optional

import jwt
from fastapi import HTTPException
from pydantic import BaseModel

from repositories import UserRepo, get_conn
from settings import settings


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str


def _user_out(row) -> UserOut:
    return UserOut(
        id=row["id"],
        name=row["display_name"] or f"{row['first_name']} {row['last_name']}",
        email=row["email"],
        role=row["role"],
    )


def _authenticated_user(authorization: Optional[str]) -> tuple[dict, str]:
    """Decode + validate a Bearer token, returning (user_row, token_jti).
    Raises 401 on any problem -- missing header, bad/expired token, or a
    session that's been logged out / expired server-side."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="invalid or expired token")

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if not UserRepo.session_is_valid(cur, payload["jti"]):
                raise HTTPException(status_code=401, detail="session no longer valid")
            user = UserRepo.find_by_id(cur, payload["sub"])
            if not user:
                raise HTTPException(status_code=401, detail="user not found")
            return user, payload["jti"]
    finally:
        conn.close()


def _student_id_for_user(cur, user_id: str) -> str:
    """The roster identity (students.id) behind a logged-in student account
    -- distinct from users.id, which is what the JWT/session carries. Every
    seeded student login has a matching students.user_id row; a 404 here
    means the account isn't actually a student profile."""
    student_id = UserRepo.find_student_id(cur, user_id)
    if student_id is None:
        raise HTTPException(status_code=404, detail="not a student profile")
    return student_id
