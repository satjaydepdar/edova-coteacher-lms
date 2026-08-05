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
    settings: Optional[dict] = None


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
        submission_type=_detect_sub_type(row["title"], row["description"] or "", row["settings"]),
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
            settings_dict = dict(body.settings) if body.settings else {}
            if "submission_type" not in settings_dict or not settings_dict["submission_type"]:
                settings_dict["submission_type"] = body.submission_type
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
                    psycopg2.extras.Json(settings_dict),
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


@app.delete("/api/classrooms/{classroom_id}/assignments/{assignment_id}", status_code=204)
def delete_assignment(classroom_id: str, assignment_id: str):
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            _require_classroom(cur, classroom_id)
            cur.execute(
                """
                UPDATE assignments
                SET deleted_at = NOW()
                WHERE id = %s AND classroom_id = %s
                """,
                (assignment_id, classroom_id),
            )
            conn.commit()
    finally:
        conn.close()


def _student_id_for_user(cur, user_id: str) -> str:
    """The roster identity (students.id) behind a logged-in student account
    -- distinct from users.id, which is what the JWT/session carries. Every
    seeded student login has a matching students.user_id row; a 404 here
    means the account isn't actually a student profile."""
    cur.execute("SELECT id FROM students WHERE user_id = %s AND deleted_at IS NULL", (user_id,))
    row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="not a student profile")
    return row["id"]


class MyAssignmentOut(BaseModel):
    id: str
    title: str
    description: str
    due_date: Optional[str]
    points_possible: float
    submission_type: str
    classroom_name: str
    submission_status: str  # not_started | submitted | late | graded
    submitted_at: Optional[str]
    text_response: Optional[str]
    points_earned: Optional[float]
    feedback: Optional[str]


import json
import re


def _detect_sub_type(title: str, description: Optional[str], settings: Optional[dict]) -> str:
    st = (settings or {}).get("submission_type")
    # If settings explicitly says mcq/coding, trust it
    if st and st != "written":
        return st
    # If settings has an answer_key, it's definitely MCQ
    if (settings or {}).get("answer_key"):
        return "mcq"
    # Check description for embedded answer key
    if description and "__ANSWER_KEY__:" in description:
        return "mcq"
    # Fall back to title/description keyword detection
    t_low = (title or "").lower()
    d_low = (description or "").lower()
    if "mcq" in t_low or "quiz" in t_low or "assessment" in t_low or "test" in t_low or "online" in t_low:
        return "mcq"
    if "mcq" in d_low or "option" in d_low or "1.1)" in d_low or "a)" in d_low or "[a]" in d_low or "correct answer" in d_low:
        return "mcq"
    return st or "written"


def _evaluate_quiz_score(description: Optional[str], text_response: str, points_possible: float, settings: Optional[dict] = None) -> float:
    try:
        answers = json.loads(text_response)
        if not isinstance(answers, dict) or not answers:
            return points_possible

        # 1. Try to get answer key from settings (stored when teacher published the MCQ)
        answer_key: dict = {}
        if settings and isinstance(settings.get("answer_key"), dict):
            answer_key = settings["answer_key"]

        # 2. Fall back: try to parse __ANSWER_KEY__ block embedded in description
        if not answer_key and description:
            match = re.search(r'__ANSWER_KEY__:\s*(\{.*?\})', description)
            if match:
                try:
                    answer_key = json.loads(match.group(1))
                except Exception:
                    pass

        if not answer_key:
            # No answer key found — cannot grade, return full marks
            return points_possible

        correct_count = 0
        total_questions = max(len(answers), 1)

        for q_key, student_val in answers.items():
            student_str = str(student_val).strip().lower()
            # Try exact key match (e.g. "1.1", "q1", etc.)
            correct_answer = answer_key.get(q_key, "")
            if not correct_answer:
                # Try numeric extraction: "q1" -> "1.1", "2" -> "1.2"
                nums = re.findall(r'\d+', q_key)
                if nums:
                    alt_key = f"1.{nums[-1]}"
                    correct_answer = answer_key.get(alt_key, "")
            if correct_answer and correct_answer.strip().lower() in student_str:
                correct_count += 1

        score = round((correct_count / total_questions) * points_possible, 1)
        return max(score, 0.0)
    except Exception:
        pass
    return points_possible


def _auto_grade_assignment(cur, assignment_id: str, student_id: str, points_earned: float, points_possible: float, academic_year: str):
    cur.execute(
        "SELECT id FROM grades WHERE assignment_id = %s AND student_id = %s",
        (assignment_id, student_id),
    )
    existing = cur.fetchone()
    if existing:
        cur.execute(
            """
            UPDATE grades SET points_earned = %s, points_possible = %s, feedback = 'Auto-graded',
                status = 'published', published_at = NOW()
            WHERE id = %s
            """,
            (points_earned, points_possible, existing["id"]),
        )
    else:
        cur.execute(
            """
            INSERT INTO grades
                (id, assignment_id, student_id, points_earned, points_possible,
                 feedback, academic_year, status, published_at)
            VALUES (%s, %s, %s, %s, %s, 'Auto-graded', %s, 'published', NOW())
            """,
            (
                str(uuid.uuid4()), assignment_id, student_id,
                points_earned, points_possible, academic_year,
            ),
        )


@app.get("/api/students/me/assignments", response_model=List[MyAssignmentOut])
def list_my_assignments(authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            student_id = _student_id_for_user(cur, user["id"])
            cur.execute(
                """
                SELECT a.id, a.title, a.description, a.due_date, a.points_possible, a.settings,
                       c.class_level, c.section, s.name AS subject,
                       sub.status AS sub_status, sub.submitted_at, sub.is_late, sub.text_response,
                       g.points_earned, g.feedback
                FROM assignments a
                JOIN classrooms c ON c.id = a.classroom_id
                JOIN subjects s ON s.id = c.subject_id
                JOIN enrollments e ON e.classroom_id = a.classroom_id
                    AND e.student_id = %s AND e.status = 'active'
                LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = %s
                LEFT JOIN grades g ON g.assignment_id = a.id AND g.student_id = %s
                WHERE a.deleted_at IS NULL
                ORDER BY a.due_date NULLS LAST, a.created_at DESC
                """,
                (student_id, student_id, student_id),
            )
            out = []
            for r in cur.fetchall():
                if r["points_earned"] is not None:
                    status = "graded"
                elif r["sub_status"] is not None:
                    status = "late" if r["is_late"] else "submitted"
                else:
                    status = "not_started"
                out.append(MyAssignmentOut(
                    id=r["id"],
                    title=r["title"],
                    description=r["description"] or "",
                    due_date=r["due_date"].isoformat() if r["due_date"] else None,
                    points_possible=float(r["points_possible"]),
                    submission_type=_detect_sub_type(r["title"], r["description"], r["settings"]),
                    classroom_name=f"Class {r['class_level']} — {r['section']} · {r['subject']}",
                    submission_status=status,
                    submitted_at=r["submitted_at"].isoformat() if r["submitted_at"] else None,
                    text_response=r["text_response"],
                    points_earned=float(r["points_earned"]) if r["points_earned"] is not None else None,
                    feedback=r["feedback"],
                ))
            return out
    finally:
        conn.close()


class SubmissionIn(BaseModel):
    text_response: str = ""


class SubmissionOut(BaseModel):
    assignment_id: str
    status: str
    submitted_at: str
    is_late: bool
    text_response: str


@app.put("/api/assignments/{assignment_id}/submissions/me", response_model=SubmissionOut)
def submit_my_assignment(assignment_id: str, body: SubmissionIn, authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            student_id = _student_id_for_user(cur, user["id"])
            cur.execute(
                "SELECT a.title, a.description, a.points_possible, a.settings, a.classroom_id, a.due_date, c.academic_year FROM assignments a"
                " JOIN classrooms c ON c.id = a.classroom_id WHERE a.id = %s AND a.deleted_at IS NULL",
                (assignment_id,),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="assignment not found")
            cur.execute(
                "SELECT 1 FROM enrollments WHERE classroom_id = %s AND student_id = %s AND status = 'active'",
                (row["classroom_id"], student_id),
            )
            if cur.fetchone() is None:
                raise HTTPException(status_code=403, detail="not enrolled in this assignment's class")

            is_late = bool(row["due_date"] and datetime.now(timezone.utc) > row["due_date"])
            cur.execute(
                "SELECT id FROM submissions WHERE assignment_id = %s AND student_id = %s",
                (assignment_id, student_id),
            )
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    """
                    UPDATE submissions SET text_response = %s, submitted_at = NOW(), is_late = %s,
                        status = 'submitted', attempt_number = attempt_number + 1
                    WHERE id = %s
                    RETURNING assignment_id, status, submitted_at, is_late, text_response
                    """,
                    (body.text_response, is_late, existing["id"]),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO submissions
                        (id, assignment_id, student_id, submission_type, text_response,
                         submitted_at, is_late, status, academic_year)
                    VALUES (%s, %s, %s, 'final', %s, NOW(), %s, 'submitted', %s)
                    RETURNING assignment_id, status, submitted_at, is_late, text_response
                    """,
                    (str(uuid.uuid4()), assignment_id, student_id, body.text_response, is_late, row["academic_year"]),
                )
            r = cur.fetchone()

            # Auto-grade MCQ / Quiz / Assessment assignments immediately upon submission
            sub_type = _detect_sub_type(row["title"], row["description"], row["settings"])
            has_answer_key = bool((row["description"] and "__ANSWER_KEY__:" in row["description"]) or (row["settings"] and (row["settings"].get("answer_key") or row["settings"].get("submission_type") == "mcq")))
            if sub_type == "mcq" or has_answer_key:
                score = _evaluate_quiz_score(row["description"], body.text_response, float(row["points_possible"]), row["settings"])
                _auto_grade_assignment(cur, assignment_id, student_id, score, float(row["points_possible"]), row["academic_year"])

            conn.commit()
            return SubmissionOut(
                assignment_id=r["assignment_id"],
                status=r["status"],
                submitted_at=r["submitted_at"].isoformat(),
                is_late=r["is_late"],
                text_response=r["text_response"] or "",
            )
    finally:
        conn.close()


class RosterSubmissionOut(BaseModel):
    student_id: str
    status: str
    submitted_at: Optional[str]
    is_late: bool
    text_response: str


@app.get("/api/assignments/{assignment_id}/submissions", response_model=List[RosterSubmissionOut])
def list_submissions(assignment_id: str):
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT student_id, status, submitted_at, is_late, text_response
                FROM submissions WHERE assignment_id = %s
                """,
                (assignment_id,),
            )
            return [
                RosterSubmissionOut(
                    student_id=r["student_id"],
                    status=r["status"],
                    submitted_at=r["submitted_at"].isoformat() if r["submitted_at"] else None,
                    is_late=r["is_late"],
                    text_response=r["text_response"] or "",
                )
                for r in cur.fetchall()
            ]
    finally:
        conn.close()


class GradeIn(BaseModel):
    points_earned: Optional[float] = None
    feedback: str = ""


class GradeOut(BaseModel):
    assignment_id: str
    student_id: str
    points_earned: Optional[float]
    points_possible: float
    feedback: str
    status: str


def _grade_out(row) -> GradeOut:
    return GradeOut(
        assignment_id=row["assignment_id"],
        student_id=row["student_id"],
        points_earned=float(row["points_earned"]) if row["points_earned"] is not None else None,
        points_possible=float(row["points_possible"]),
        feedback=row["feedback"] or "",
        status=row["status"],
    )


# Grading, independent of any submission row -- there is no real student
# submission flow yet (Student portal, separate roadmap item), so a grade
# here is keyed directly on (assignment_id, student_id) rather than gating
# on a "submitted" status nothing can ever set.
@app.put("/api/assignments/{assignment_id}/grades/{student_id}", response_model=GradeOut)
def upsert_grade(
    assignment_id: str, student_id: str, body: GradeIn, authorization: Optional[str] = Header(None)
):
    user, _ = _authenticated_user(authorization)
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.points_possible, c.academic_year FROM assignments a
                JOIN classrooms c ON c.id = a.classroom_id
                WHERE a.id = %s AND a.deleted_at IS NULL
                """,
                (assignment_id,),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status_code=404, detail="assignment not found")
            points_possible, academic_year = row["points_possible"], row["academic_year"]

            cur.execute(
                "SELECT id FROM grades WHERE assignment_id = %s AND student_id = %s",
                (assignment_id, student_id),
            )
            existing = cur.fetchone()
            if existing:
                cur.execute(
                    """
                    UPDATE grades SET points_earned = %s, points_possible = %s, feedback = %s,
                        grader_id = %s, status = 'published', published_at = NOW()
                    WHERE id = %s
                    RETURNING assignment_id, student_id, points_earned, points_possible, feedback, status
                    """,
                    (body.points_earned, points_possible, body.feedback, user["id"], existing["id"]),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO grades
                        (id, assignment_id, student_id, grader_id, points_earned, points_possible,
                         feedback, academic_year, status, published_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'published', NOW())
                    RETURNING assignment_id, student_id, points_earned, points_possible, feedback, status
                    """,
                    (
                        str(uuid.uuid4()), assignment_id, student_id, user["id"], body.points_earned,
                        points_possible, body.feedback, academic_year,
                    ),
                )
            row = cur.fetchone()
            conn.commit()
            return _grade_out(row)
    finally:
        conn.close()


@app.get("/api/assignments/{assignment_id}/grades", response_model=List[GradeOut])
def list_grades(assignment_id: str):
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT assignment_id, student_id, points_earned, points_possible, feedback, status
                FROM grades WHERE assignment_id = %s
                """,
                (assignment_id,),
            )
            return [_grade_out(r) for r in cur.fetchall()]
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
