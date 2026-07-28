"""
Edova dedicated backend — identity + real app data, per
instructions/dedicated-backend-plan.md. Owns the db/ Postgres schema
(classrooms, students, enrollments, ...); ncert_rag/api and ncert_rag/clerk
keep their own concerns (RAG/OKF media, syllabus/resources) untouched.

Run with: uvicorn main:app --reload --port 8003
"""

import uuid
from typing import List, Optional

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException
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


# Read-only for now, no auth gate -- matches the rest of this app today (no
# login exists anywhere yet). Real teacher auth is a later, separate phase
# per instructions/dedicated-backend-plan.md; these routes move behind it
# then rather than being re-secured piecemeal.
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
