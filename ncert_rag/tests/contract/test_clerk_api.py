"""Contract tests for ncert_rag/clerk/api.py — post Phase-1 dedup: the course
CRUD surface moved to the Postgres rag app (:8000); clerk keeps gamification,
wiki, quiz, uploads. These tests pin BOTH halves of that: the retired
endpoints are gone, and the kept surface behaves as before.

Runs against clerk's own SQLite (created/seeded at import). Read-only plus
validation-error endpoints only.
"""
from fastapi.testclient import TestClient

from clerk.api import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


# ---- retired course CRUD: moved to the rag app (Postgres owner) -----------

def test_course_crud_surface_is_retired():
    for method, path in [
        ("GET", "/api/academic-years"),
        ("GET", "/api/curriculums/classes?year=2026%E2%80%9327"),
        ("GET", "/api/curriculums?year=2026%E2%80%9327&class=Class%2010"),
        ("GET", "/api/curriculum-subjects/sub_x/syllabus"),
        ("PUT", "/api/curriculum-subjects/sub_x/syllabus"),
        ("GET", "/api/curriculum-subjects/sub_x/resources"),
        ("GET", "/api/lesson-plans"),
        ("POST", "/api/lesson-plans"),
        ("GET", "/api/class-sections/sections?year=2026%E2%80%9327&class=Class%2010"),
        ("GET", "/api/class-sections?year=2026%E2%80%9327&subject=Mathematics&class=Class%2010"),
        ("GET", "/api/class-sections/sec_x/progress"),
        ("PUT", "/api/class-sections/sec_x/topics/top_x"),
    ]:
        r = client.request(method, path)
        assert r.status_code in (404, 405), f"{method} {path} -> {r.status_code} (course CRUD must be gone from clerk)"


# ---- kept surface ----------------------------------------------------------

def test_quiz_unknown_topic_returns_empty_questions():
    r = client.get("/api/learning/quiz", params={"topic_id": "no-such-topic"})
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, dict) and body.get("questions") == []


def test_gamification_unknown_student_is_404():
    # Pinned observed behavior: anonymous gamification read on an unknown
    # student id currently 404s (get-or-create needs ?name=). Preserve it.
    r = client.get("/api/students/contract-test-student/gamification")
    assert r.status_code == 404
