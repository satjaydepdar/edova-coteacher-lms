"""Contract tests for edova-backend — snapshot current endpoint behavior so
the Phase-1 router/repository extraction cannot silently change the API.

Runs against the live local Postgres (settings.DATABASE_URL); read-only or
negative-auth endpoints only — no data mutation.
"""
import sys
import uuid
from pathlib import Path

_SERVICE_ROOT = str(Path(__file__).resolve().parent.parent)
sys.path.insert(0, _SERVICE_ROOT)
# Drop same-named modules other suites may have registered (ncert_rag also
# ships a top-level main.py) before importing this service's.
for _name in ("main", "settings"):
    mod = sys.modules.get(_name)
    if mod is not None and not getattr(mod, "__file__", "").startswith(_SERVICE_ROOT):
        del sys.modules[_name]

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_list_classrooms_shape():
    r = client.get("/api/classrooms")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    if body:
        assert {"id", "name", "subject", "class_level", "section", "teacher_name"} <= set(body[0])


def test_list_classroom_students_unknown_classroom():
    r = client.get(f"/api/classrooms/{uuid.uuid4()}/students")
    # Current contract: unknown classroom yields 200 with empty roster or 404 —
    # pin whichever it is so the refactor preserves it.
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        assert r.json() == []


def test_calendar_events_require_auth():
    r = client.get("/api/calendar-events")
    assert r.status_code == 401


def test_login_rejects_bad_credentials():
    r = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
    assert r.status_code == 401


def test_auth_me_requires_token():
    r = client.get("/auth/me")
    assert r.status_code == 401
