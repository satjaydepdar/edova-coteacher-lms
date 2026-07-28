"""
Edova dedicated backend — identity + real app data, per
instructions/dedicated-backend-plan.md. Owns the db/ Postgres schema
(classrooms, students, enrollments, ...); ncert_rag/api and ncert_rag/clerk
keep their own concerns (RAG/OKF media, syllabus/resources) untouched.

Run with: uvicorn main:app --reload --port 8003
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import bcrypt
import jwt
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from settings import settings

app = FastAPI(title="Edova Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.API_CORS_ORIGINS.split(",")],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


def _get_conn():
    return psycopg2.connect(settings.DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


class ClassroomOut(BaseModel):
    id: str
    name: str
    section: Optional[str]
    class_level: int
    academic_year: str
    subject: str
    teacher_name: str


class StudentOut(BaseModel):
    id: str
    student_number: str
    first_name: str
    last_name: str
    class_level: Optional[int]


@app.get("/health")
def health():
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"database unreachable: {e}")
    return {"status": "ok"}


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str


class LoginOut(BaseModel):
    token: str
    user: UserOut


def _user_out(row) -> UserOut:
    return UserOut(
        id=row["id"],
        name=row["display_name"] or f"{row['first_name']} {row['last_name']}",
        email=row["email"],
        role=row["role"],
    )


@app.post("/auth/login", response_model=LoginOut)
def login(body: LoginIn):
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM users WHERE email = %s AND deleted_at IS NULL AND status = 'active'",
                (body.email,),
            )
            user = cur.fetchone()
            if not user or not user["password_hash"] or not bcrypt.checkpw(
                body.password.encode("utf-8"), user["password_hash"].encode("utf-8")
            ):
                raise HTTPException(status_code=401, detail="invalid email or password")

            token_jti = str(uuid.uuid4())
            expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRY_HOURS)
            cur.execute(
                "INSERT INTO user_sessions (id, user_id, token_jti, expires_at) VALUES (%s, %s, %s, %s)",
                (str(uuid.uuid4()), user["id"], token_jti, expires_at),
            )
            conn.commit()
    finally:
        conn.close()

    token = jwt.encode(
        {"sub": user["id"], "jti": token_jti, "exp": expires_at},
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    return LoginOut(token=token, user=_user_out(user))


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

    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM user_sessions WHERE token_jti = %s AND revoked_at IS NULL"
                " AND expires_at > NOW()",
                (payload["jti"],),
            )
            if cur.fetchone() is None:
                raise HTTPException(status_code=401, detail="session no longer valid")
            cur.execute("SELECT * FROM users WHERE id = %s AND deleted_at IS NULL", (payload["sub"],))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=401, detail="user not found")
            return user, payload["jti"]
    finally:
        conn.close()


@app.get("/auth/me", response_model=UserOut)
def me(authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    return _user_out(user)


@app.post("/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    _, token_jti = _authenticated_user(authorization)
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE user_sessions SET revoked_at = NOW() WHERE token_jti = %s", (token_jti,))
            conn.commit()
    finally:
        conn.close()
    return {"status": "ok"}


# Read-only for now, no auth gate -- matches the rest of this app today (no
# login exists anywhere yet). Real teacher auth now exists (/auth/*, above)
# but hasn't been wired in front of these yet -- that lands with the next
# roadmap item (assignment persistence), not this one.
@app.get("/api/classrooms", response_model=List[ClassroomOut])
def list_classrooms():
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT c.id, c.name, c.section, c.class_level, c.academic_year,
                       s.name AS subject, u.display_name AS teacher_name
                FROM classrooms c
                JOIN subjects s ON s.id = c.subject_id
                JOIN co_teaching_assignments cta
                    ON cta.classroom_id = c.id AND cta.is_primary AND cta.status = 'active'
                JOIN users u ON u.id = cta.teacher_id
                WHERE c.deleted_at IS NULL
                ORDER BY c.class_level, c.section
                """
            )
            return cur.fetchall()
    finally:
        conn.close()


@app.get("/api/classrooms/{classroom_id}/students", response_model=List[StudentOut])
def list_classroom_students(classroom_id: str):
    try:
        uuid.UUID(classroom_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="classroom not found")
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM classrooms WHERE id = %s AND deleted_at IS NULL", (classroom_id,))
            if cur.fetchone() is None:
                raise HTTPException(status_code=404, detail="classroom not found")
            cur.execute(
                """
                SELECT st.id, st.student_number, st.first_name, st.last_name, st.class_level
                FROM enrollments e
                JOIN students st ON st.id = e.student_id
                WHERE e.classroom_id = %s AND e.status = 'active' AND st.deleted_at IS NULL
                ORDER BY st.student_number
                """,
                (classroom_id,),
            )
            return cur.fetchall()
    finally:
        conn.close()
