"""Behavioral memory layer — rule-based v1 (migration 0027).

Events are dual-written by the frontend (fire-and-forget alongside clerk
calls). Recommendations are generated lazily on read from the event log and
upserted by dedupe_key, so a dismissed card never comes back. No LLM in the
loop: the rules below are deterministic and auditable, per the architecture
review — mastery/struggle is derived from recorded behavior, never stored as
a mutable profile blob.

Rules (thresholds as module constants):
  student  struggle_remedial      — >= MISTAKE_THRESHOLD quiz_mistake events
                                    in one chapter within STRUGGLE_WINDOW_DAYS
  teacher  class_struggle_digest  — >= CLASS_STUDENT_THRESHOLD distinct
                                    students each struggling (same test) in
                                    one chapter
"""
import json

import psycopg2.extras
from fastapi import APIRouter

from api.repositories import _connect
from api.schemas import MemoryEventIn, MemoryEventOut, RecommendationOut

router = APIRouter()

MISTAKE_THRESHOLD = 2        # mistakes in one chapter before "struggling"
STRUGGLE_WINDOW_DAYS = 30    # rolling window for the mistake count
CLASS_STUDENT_THRESHOLD = 2  # distinct struggling students before a class digest

# Chapters a student struggles in get a remedial card pointing at the
# Learning Hub, where that chapter's video/PDF/mindmap already live.
_STUDENT_CARD = {
    "title": "Keep going — {chapter} needs a revisit",
    "body": "You were struggling with {chapter}. There's a learning resource for you — learn more!",
    "cta_label": "Learn more",
    "cta_url": "/learning",
}
_TEACHER_CARD = {
    "title": "{count} students are struggling with {chapter}",
    "body": "{count} students in your class are struggling with {chapter}. Consider a remedial quiz or a quick recap.",
    "cta_label": "Build remedial quiz",
    "cta_url": "/assessment-builder",
}


@router.post("/api/memory/events", response_model=MemoryEventOut, status_code=201)
def record_event(body: MemoryEventIn):
    if body.role not in ("student", "teacher"):
        from fastapi import HTTPException
        raise HTTPException(status_code=422, detail="role must be 'student' or 'teacher'")
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO memory_events (user_id, role, event_type, chapter, topic_id, subject, payload)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id""",
            (body.user_id, body.role, body.event_type, body.chapter,
             body.topic_id, body.subject, json.dumps(body.payload)),
        )
        return {"id": str(cur.fetchone()[0])}


def _generate_student_recs(cur, user_id: str):
    """Upsert one struggle card per chapter over the mistake threshold.
    ON CONFLICT DO NOTHING keeps prior seen/dismissed state intact."""
    cur.execute(
        """SELECT chapter, COUNT(*) AS n
           FROM memory_events
           WHERE user_id = %s AND role = 'student' AND event_type = 'quiz_mistake'
             AND chapter IS NOT NULL
             AND created_at > NOW() - INTERVAL '%s days'
           GROUP BY chapter
           HAVING COUNT(*) >= %s""",
        (user_id, STRUGGLE_WINDOW_DAYS, MISTAKE_THRESHOLD),
    )
    for chapter, _n in cur.fetchall():
        cur.execute(
            """INSERT INTO recommendations
                   (user_id, role, kind, title, body, cta_label, cta_url, chapter, dedupe_key)
               VALUES (%s, 'student', 'struggle_remedial', %s, %s, %s, %s, %s, %s)
               ON CONFLICT (dedupe_key) DO NOTHING""",
            (
                user_id,
                _STUDENT_CARD["title"].format(chapter=chapter),
                _STUDENT_CARD["body"].format(chapter=chapter),
                _STUDENT_CARD["cta_label"],
                _STUDENT_CARD["cta_url"],
                chapter,
                f"{user_id}:struggle_remedial:{chapter}",
            ),
        )


def _generate_teacher_recs(cur, user_id: str):
    """One digest card per chapter where enough distinct students struggle."""
    cur.execute(
        """SELECT chapter, COUNT(DISTINCT user_id) AS students
           FROM (
               SELECT user_id, chapter
               FROM memory_events
               WHERE role = 'student' AND event_type = 'quiz_mistake'
                 AND chapter IS NOT NULL
                 AND created_at > NOW() - INTERVAL '%s days'
               GROUP BY user_id, chapter
               HAVING COUNT(*) >= %s
           ) struggling
           GROUP BY chapter
           HAVING COUNT(DISTINCT user_id) >= %s""",
        (STRUGGLE_WINDOW_DAYS, MISTAKE_THRESHOLD, CLASS_STUDENT_THRESHOLD),
    )
    for chapter, count in cur.fetchall():
        cur.execute(
            """INSERT INTO recommendations
                   (user_id, role, kind, title, body, cta_label, cta_url, chapter, dedupe_key)
               VALUES (%s, 'teacher', 'class_struggle_digest', %s, %s, %s, %s, %s, %s)
               ON CONFLICT (dedupe_key) DO NOTHING""",
            (
                user_id,
                _TEACHER_CARD["title"].format(count=count, chapter=chapter),
                _TEACHER_CARD["body"].format(count=count, chapter=chapter),
                _TEACHER_CARD["cta_label"],
                _TEACHER_CARD["cta_url"],
                chapter,
                f"{user_id}:class_struggle_digest:{chapter}",
            ),
        )


@router.get("/api/memory/recommendations", response_model=list[RecommendationOut])
def get_recommendations(user_id: str, role: str):
    """Generate-on-read: refresh this user's cards from the event log, then
    return everything not dismissed, newest first."""
    with _connect() as conn:
        # Generation must use a plain tuple cursor — unpacking RealDictCursor
        # rows would iterate dict keys, not values.
        with conn.cursor() as gen:
            if role == "student":
                _generate_student_recs(gen, user_id)
            elif role == "teacher":
                _generate_teacher_recs(gen, user_id)
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """SELECT id, kind, title, body, cta_label, cta_url, chapter, status,
                          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
                   FROM recommendations
                   WHERE user_id = %s AND role = %s AND status != 'dismissed'
                   ORDER BY created_at DESC""",
                (user_id, role),
            )
            return [dict(r) for r in cur.fetchall()]


@router.get("/api/memory/common-mistakes")
def common_mistakes(chapter: str, limit: int = 5):
    """Most frequent real wrong answers for a chapter — feeds the quiz
    blueprint's distractor guidance (Skill 1, Phase 3)."""
    with _connect() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT payload->>'q' AS question, payload->>'yourAns' AS wrong, COUNT(*) AS n
               FROM memory_events
               WHERE event_type = 'quiz_mistake' AND chapter = %s
                 AND payload ? 'yourAns' AND payload->>'yourAns' <> ''
               GROUP BY 1, 2
               ORDER BY n DESC, MAX(created_at) DESC
               LIMIT %s""",
            (chapter, min(limit, 20)),
        )
        return [dict(r) for r in cur.fetchall()]


def _set_status(rec_id: str, status: str):
    from fastapi import HTTPException
    col = "seen_at" if status == "seen" else "dismissed_at"
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(
            f"UPDATE recommendations SET status = %s, {col} = NOW() WHERE id = %s RETURNING id",
            (status, rec_id),
        )
        if cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="recommendation not found")
    return {"status": status}


@router.post("/api/memory/recommendations/{rec_id}/seen")
def mark_seen(rec_id: str):
    return _set_status(rec_id, "seen")


@router.post("/api/memory/recommendations/{rec_id}/dismiss")
def dismiss(rec_id: str):
    return _set_status(rec_id, "dismissed")
