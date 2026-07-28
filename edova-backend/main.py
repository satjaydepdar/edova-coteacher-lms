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


# Read-only, no auth gate -- classroom/roster reads stay open; assignment
# writes below are the first endpoint that actually requires a session.
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


class AssignmentIn(BaseModel):
    title: str
    description: str = ""
    due_date: Optional[str] = None  # ISO 8601
    points_possible: float = 100
    # The frontend's submission-method concept (written/pdf/mcq/media/coding)
    # -- a distinct idea from assignments.type's category enum
    # (homework/quiz/exam/...), so it's kept in `settings` JSONB rather than
    # force-fit into that column.
    submission_type: str = "written"
    attachments: List[dict] = []


class AssignmentOut(BaseModel):
    id: str
    title: str
    description: str
    due_date: Optional[str]
    points_possible: float
    submission_type: str
    attachments: List[dict]
    created_at: str


def _assignment_out(row) -> AssignmentOut:
    return AssignmentOut(
        id=row["id"],
        title=row["title"],
        description=row["description"] or "",
        due_date=row["due_date"].isoformat() if row["due_date"] else None,
        points_possible=float(row["points_possible"]),
        submission_type=(row["settings"] or {}).get("submission_type", "written"),
        attachments=row["attachments"] or [],
        created_at=row["created_at"].isoformat(),
    )


def _require_classroom(cur, classroom_id: str) -> None:
    try:
        uuid.UUID(classroom_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="classroom not found")
    cur.execute("SELECT 1 FROM classrooms WHERE id = %s AND deleted_at IS NULL", (classroom_id,))
    if cur.fetchone() is None:
        raise HTTPException(status_code=404, detail="classroom not found")


@app.post("/api/classrooms/{classroom_id}/assignments", response_model=AssignmentOut, status_code=201)
def create_assignment(classroom_id: str, body: AssignmentIn, authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            _require_classroom(cur, classroom_id)
            new_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO assignments
                    (id, classroom_id, created_by, title, description, type,
                     points_possible, due_date, attachments, settings, status)
                VALUES (%s, %s, %s, %s, %s, 'homework', %s, %s, %s, %s, 'published')
                RETURNING id, title, description, due_date, points_possible, attachments, settings, created_at
                """,
                (
                    new_id, classroom_id, user["id"], body.title, body.description,
                    body.points_possible, body.due_date,
                    psycopg2.extras.Json(body.attachments),
                    psycopg2.extras.Json({"submission_type": body.submission_type}),
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _assignment_out(row)
    finally:
        conn.close()


@app.get("/api/classrooms/{classroom_id}/assignments", response_model=List[AssignmentOut])
def list_assignments(classroom_id: str):
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            _require_classroom(cur, classroom_id)
            cur.execute(
                """
                SELECT id, title, description, due_date, points_possible, attachments, settings, created_at
                FROM assignments
                WHERE classroom_id = %s AND deleted_at IS NULL
                ORDER BY created_at DESC
                """,
                (classroom_id,),
            )
            return [_assignment_out(r) for r in cur.fetchall()]
    finally:
        conn.close()


class CalendarEventIn(BaseModel):
    title: str
    event_type: str  # meeting/holiday/exam/event (assignment due dates come from real assignments, not this)
    start_at: str  # ISO 8601
    end_at: Optional[str] = None
    is_all_day: bool = False
    visibility: str = "school"  # or "private"
    classroom_id: Optional[str] = None


class CalendarEventOut(BaseModel):
    id: str
    title: str
    event_type: str
    start_at: str
    end_at: Optional[str]
    is_all_day: bool
    visibility: str
    classroom_id: Optional[str]


def _calendar_event_out(row) -> CalendarEventOut:
    return CalendarEventOut(
        id=row["id"],
        title=row["title"],
        event_type=row["event_type"],
        start_at=row["start_at"].isoformat(),
        end_at=row["end_at"].isoformat() if row["end_at"] else None,
        is_all_day=row["is_all_day"],
        visibility=row["visibility"],
        classroom_id=row["classroom_id"],
    )


# Personal/school-scoped, unlike the fully-public classroom/roster reads --
# both GET and POST require a valid session (the first authenticated read
# endpoint; assignment writes were the first authenticated write).
@app.post("/api/calendar-events", response_model=CalendarEventOut, status_code=201)
def create_calendar_event(body: CalendarEventIn, authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            new_id = str(uuid.uuid4())
            cur.execute(
                """
                INSERT INTO calendar_events
                    (id, classroom_id, created_by, title, event_type, start_at, end_at, is_all_day, visibility)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, title, event_type, start_at, end_at, is_all_day, visibility, classroom_id
                """,
                (
                    new_id, body.classroom_id, user["id"], body.title, body.event_type,
                    body.start_at, body.end_at, body.is_all_day, body.visibility,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return _calendar_event_out(row)
    finally:
        conn.close()


@app.get("/api/calendar-events", response_model=List[CalendarEventOut])
def list_calendar_events(authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, event_type, start_at, end_at, is_all_day, visibility, classroom_id
                FROM calendar_events
                WHERE deleted_at IS NULL AND (created_by = %s OR visibility = 'school')
                ORDER BY start_at
                """,
                (user["id"],),
            )
            return [_calendar_event_out(r) for r in cur.fetchall()]
    finally:
        conn.close()
