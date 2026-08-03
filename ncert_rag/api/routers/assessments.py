"""Saved assessments — Assessment Builder > "Save Assessment" (edova-web).

Persists the teacher's assessment bank so it survives reload (migration
0028). sections is stored verbatim (the AssessmentSection[] wire shape) —
the API is a straight passthrough, same posture as lesson_plans.py.
Authless like the rest of this API today; teacher scoping waits on auth.
"""
import json

import psycopg2.extras
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.repositories import _connect

router = APIRouter()

_COLS = """id, title, class_id, subject, term, academic_year, objective,
           topic_label, total_points, sections,
           to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
           to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at"""


class SavedAssessmentIn(BaseModel):
    title: str
    class_id: str | None = None
    subject: str = ""
    term: str = ""
    academic_year: str = ""
    objective: str = ""
    topic_label: str = ""
    total_points: int = 0
    sections: list = []


@router.get("/api/saved-assessments")
def list_saved_assessments():
    """Newest first, full section content included so a saved assessment can
    be re-opened without a second round-trip."""
    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"SELECT {_COLS} FROM saved_assessments WHERE deleted_at IS NULL ORDER BY created_at DESC"
        )
        return [dict(r) for r in cur.fetchall()]


@router.post("/api/saved-assessments", status_code=201)
def create_saved_assessment(body: SavedAssessmentIn):
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="title is required")
    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"""INSERT INTO saved_assessments
                    (title, class_id, subject, term, academic_year, objective,
                     topic_label, total_points, sections)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING {_COLS}""",
            (body.title, body.class_id, body.subject, body.term, body.academic_year,
             body.objective, body.topic_label, body.total_points, json.dumps(body.sections)),
        )
        return dict(cur.fetchone())


@router.put("/api/saved-assessments/{assessment_id}")
def update_saved_assessment(assessment_id: str, body: SavedAssessmentIn):
    """Update-in-place (View/Edit → "Update Assessment") — same id, no copy."""
    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            f"""UPDATE saved_assessments SET
                    title = %s, class_id = %s, subject = %s, term = %s,
                    academic_year = %s, objective = %s, topic_label = %s,
                    total_points = %s, sections = %s
                WHERE id = %s AND deleted_at IS NULL
                RETURNING {_COLS}""",
            (body.title, body.class_id, body.subject, body.term, body.academic_year,
             body.objective, body.topic_label, body.total_points, json.dumps(body.sections),
             assessment_id),
        )
        row = cur.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="assessment not found")
        return dict(row)
