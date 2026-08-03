"""Contract tests for ncert_rag/api/app.py — pin the clerk-compatible
course-CRUD contract now served from Postgres (ncert_rag/clerk/api.py is the
semantic reference), plus the RAG surface.

Live local Postgres only; LLM-backed endpoints (/query, /chat, /ingest) are
excluded by design. CRUD round-trips run against a probe curriculum
('Class 99' of probe year '2099-00') so re-runs are idempotent against the
live DB: every create here goes through a get-or-create or tolerates a 409.
"""
from fastapi.testclient import TestClient

from api.app import app

client = TestClient(app)

PROBE_YEAR = "2099-00"
PROBE_BOARD = "CBSE"
PROBE_CLASS = "Class 99"
PROBE_SUBJECT = "Contract Probe"
PROBE_SECTION = "Section Z"


def _probe_curriculum() -> dict:
    """Get-or-create the probe curriculum (idempotent)."""
    r = client.get("/api/curriculums",
                   params={"year": PROBE_YEAR, "board": PROBE_BOARD, "class": PROBE_CLASS})
    assert r.status_code == 200
    return r.json()


def _probe_subject_id() -> str:
    """Ensure the probe subject exists on the probe curriculum; return its id."""
    cur = _probe_curriculum()
    for s in cur["subjects"]:
        if s["subject_name"] == PROBE_SUBJECT:
            return s["id"]
    r = client.post(f"/api/curriculums/{cur['id']}/subjects",
                    json={"subject_code": "999", "subject_name": PROBE_SUBJECT})
    assert r.status_code == 200
    return r.json()["id"]


# ---- academic years / curriculum ------------------------------------------

def test_academic_years_shape():
    r = client.get("/api/academic-years")
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    if body:
        assert {"id", "s_no", "year_label"} <= set(body[0])
        assert isinstance(body[0]["s_no"], int)


def test_curriculum_get_or_create_is_idempotent():
    first = _probe_curriculum()
    assert first["year_label"] == PROBE_YEAR
    assert first["board"] == PROBE_BOARD
    assert first["class_label"] == PROBE_CLASS
    assert {"id", "year_label", "board", "class_label", "updated_at", "subjects"} \
        <= set(first)
    assert isinstance(first["subjects"], list)
    # Second call returns the same row — get-or-create never duplicates.
    assert _probe_curriculum()["id"] == first["id"]


def test_curriculum_classes_lists_probe():
    _probe_curriculum()
    r = client.get("/api/curriculums/classes",
                   params={"year": PROBE_YEAR, "board": PROBE_BOARD})
    assert r.status_code == 200
    assert PROBE_CLASS in r.json()


def test_curriculum_requires_year_and_class():
    r = client.get("/api/curriculums",
                   params={"year": "", "board": PROBE_BOARD, "class": PROBE_CLASS})
    assert r.status_code == 422
    assert r.json()["detail"] == "year and class are required"


# ---- subjects ---------------------------------------------------------------

def test_add_subject_blank_fields_422():
    cur = _probe_curriculum()
    r = client.post(f"/api/curriculums/{cur['id']}/subjects",
                    json={"subject_code": "  ", "subject_name": "X"})
    assert r.status_code == 422
    assert r.json()["detail"] == "subject_code and subject_name are required"


def test_subject_add_dup_delete_roundtrip():
    cur = _probe_curriculum()
    payload = {"subject_code": "998", "subject_name": "Contract Probe Delete",
               "subject_type": "Core", "credits": 0, "total_marks": 50,
               "syllabus_json": {"Unit A": 50}}
    r = client.post(f"/api/curriculums/{cur['id']}/subjects", json=payload)
    if r.status_code == 409:  # left over from a previous run — fetch its id
        subj = next(s for s in _probe_curriculum()["subjects"]
                    if s["subject_name"] == payload["subject_name"])
    else:
        assert r.status_code == 200
        subj = r.json()
        assert {"id", "s_no", "subject_code", "subject_name", "subject_type",
                "credits", "total_marks", "total_chapters", "syllabus_json"} \
            <= set(subj)
        assert subj["syllabus_json"] == {"Unit A": 50}
        # Duplicate code OR name -> 409 with the clerk's detail message.
        dup = client.post(f"/api/curriculums/{cur['id']}/subjects", json=payload)
        assert dup.status_code == 409
        assert dup.json()["detail"] == "A subject with this code or name already exists"
    d = client.delete(f"/api/curriculums/{cur['id']}/subjects/{subj['id']}")
    assert d.status_code == 200
    assert d.json() == {"status": "deleted"}
    # Second delete -> 404 (clerk detail message).
    d2 = client.delete(f"/api/curriculums/{cur['id']}/subjects/{subj['id']}")
    assert d2.status_code == 404
    assert d2.json()["detail"] == "subject not found"


def test_add_subject_unknown_curriculum_404():
    r = client.post("/api/curriculums/00000000-0000-0000-0000-000000000000/subjects",
                    json={"subject_code": "1", "subject_name": "Ghost"})
    assert r.status_code == 404
    assert r.json()["detail"] == "curriculum not found"


# ---- syllabus ---------------------------------------------------------------

def _put_probe_syllabus(subject_id: str) -> dict:
    body = {"units": [
        {"number": 1, "name": "Probe Unit", "marks": 10, "chapters": [
            {"number": 1, "name": "Probe Chapter",
             "topics": ["Probe Topic Alpha", "Probe Topic Beta"]},
        ]},
    ]}
    r = client.put(f"/api/curriculum-subjects/{subject_id}/syllabus", json=body)
    assert r.status_code == 200
    return r.json()


def test_syllabus_put_get_roundtrip():
    subject_id = _probe_subject_id()
    out = _put_probe_syllabus(subject_id)
    assert out["subject_id"] == subject_id
    assert out["subject_name"] == PROBE_SUBJECT
    unit = out["units"][0]
    assert unit["number"] == 1
    assert unit["name"] == "Probe Unit"
    assert unit["marks"] == 10
    chapter = unit["chapters"][0]
    assert chapter["number"] == 1
    assert [t["title"] for t in chapter["topics"]] == \
        ["Probe Topic Alpha", "Probe Topic Beta"]
    # GET reads back the same tree, and the summary recompute landed.
    got = client.get(f"/api/curriculum-subjects/{subject_id}/syllabus")
    assert got.status_code == 200
    assert got.json()["units"][0]["chapters"][0]["topics"][0]["title"] == "Probe Topic Alpha"
    subj = next(s for s in _probe_curriculum()["subjects"] if s["id"] == subject_id)
    assert subj["total_chapters"] == 1
    assert subj["syllabus_json"] == {"Probe Unit": 10}


def test_syllabus_unknown_subject_404():
    r = client.get("/api/curriculum-subjects/00000000-0000-0000-0000-000000000000/syllabus")
    assert r.status_code == 404
    assert r.json()["detail"] == "subject not found"


# ---- class sections + topic progress ----------------------------------------

def test_class_section_unknown_subject_404():
    _probe_curriculum()
    r = client.get("/api/class-sections",
                   params={"year": PROBE_YEAR, "board": PROBE_BOARD,
                           "class": PROBE_CLASS, "subject": "No Such Subject"})
    assert r.status_code == 404
    assert r.json()["detail"] == \
        f"no No Such Subject curriculum for {PROBE_CLASS} {PROBE_YEAR}"


def test_class_section_progress_tick_roundtrip():
    subject_id = _probe_subject_id()
    topic_id = _put_probe_syllabus(subject_id)["units"][0]["chapters"][0]["topics"][0]["id"]

    r = client.get("/api/class-sections",
                   params={"year": PROBE_YEAR, "board": PROBE_BOARD,
                           "class": PROBE_CLASS, "subject": PROBE_SUBJECT,
                           "section": PROBE_SECTION})
    assert r.status_code == 200
    sec = r.json()
    assert sec["section"] == PROBE_SECTION
    assert sec["subject_id"] == subject_id
    assert sec["subject_name"] == PROBE_SUBJECT
    assert sec["class_label"] == PROBE_CLASS
    assert sec["year_label"] == PROBE_YEAR
    # Get-or-create is idempotent.
    again = client.get("/api/class-sections",
                       params={"year": PROBE_YEAR, "board": PROBE_BOARD,
                               "class": PROBE_CLASS, "subject": PROBE_SUBJECT,
                               "section": PROBE_SECTION})
    assert again.json()["id"] == sec["id"]

    # The sections filter lists the probe section for the class.
    names = client.get("/api/class-sections/sections",
                       params={"year": PROBE_YEAR, "board": PROBE_BOARD,
                               "class": PROBE_CLASS})
    assert names.status_code == 200
    assert PROBE_SECTION in names.json()

    # Tick -> progress shows the topic; untick -> it's gone.
    tick = client.put(f"/api/class-sections/{sec['id']}/topics/{topic_id}",
                      json={"done": True, "taught_on": "2026-07-29"})
    assert tick.status_code == 200
    assert tick.json() == {"section_id": sec["id"], "topic_id": topic_id, "done": True}
    prog = client.get(f"/api/class-sections/{sec['id']}/progress")
    assert prog.status_code == 200
    assert prog.json()["section_id"] == sec["id"]
    assert prog.json()["subject_id"] == subject_id
    assert {"topic_id": topic_id, "taught_on": "2026-07-29"} in prog.json()["done_topics"]

    untick = client.put(f"/api/class-sections/{sec['id']}/topics/{topic_id}",
                        json={"done": False})
    assert untick.status_code == 200
    assert untick.json()["done"] is False
    prog2 = client.get(f"/api/class-sections/{sec['id']}/progress").json()
    assert topic_id not in [t["topic_id"] for t in prog2["done_topics"]]


def test_progress_unknown_section_404():
    r = client.get("/api/class-sections/00000000-0000-0000-0000-000000000000/progress")
    assert r.status_code == 404
    assert r.json()["detail"] == "section not found"


def test_tick_unknown_topic_404():
    subject_id = _probe_subject_id()
    client.get("/api/class-sections",
               params={"year": PROBE_YEAR, "board": PROBE_BOARD,
                       "class": PROBE_CLASS, "subject": PROBE_SUBJECT,
                       "section": PROBE_SECTION})
    sec = client.get("/api/class-sections",
                     params={"year": PROBE_YEAR, "board": PROBE_BOARD,
                             "class": PROBE_CLASS, "subject": PROBE_SUBJECT,
                             "section": PROBE_SECTION}).json()
    r = client.put(f"/api/class-sections/{sec['id']}/topics/00000000-0000-0000-0000-000000000000",
                   json={"done": True})
    assert r.status_code == 404
    assert r.json()["detail"] == "topic not found"


# ---- lesson plans -------------------------------------------------------------

def test_lesson_plan_create_list_delete_roundtrip():
    payload = {"topic": "Contract probe plan", "class_label": PROBE_CLASS,
               "subject": "Probe", "standards": ["S1"], "materials": ["M1"]}
    r = client.post("/api/lesson-plans", json=payload)
    assert r.status_code == 200
    plan = r.json()
    assert {"id", "topic", "class_label", "section", "subject",
            "curriculum_subject_id", "duration_minutes", "standards", "objective",
            "materials", "warmup", "instruction", "activity", "assessment",
            "homework", "created_at"} <= set(plan)
    assert plan["standards"] == ["S1"]  # parsed array, not a JSON string
    assert plan["materials"] == ["M1"]
    assert plan["duration_minutes"] == 45  # clerk default
    ids = [p["id"] for p in client.get("/api/lesson-plans").json()]
    assert plan["id"] in ids
    d = client.delete(f"/api/lesson-plans/{plan['id']}")
    assert d.status_code == 204
    ids_after = [p["id"] for p in client.get("/api/lesson-plans").json()]
    assert plan["id"] not in ids_after
    # Second delete -> 404 (soft-deleted already).
    assert client.delete(f"/api/lesson-plans/{plan['id']}").status_code == 404


def test_save_lesson_plan_validation():
    # Missing required fields -> 422 from pydantic.
    r = client.post("/api/lesson-plans", json={})
    assert r.status_code == 422
    # Blank topic -> 422 with the clerk's detail message.
    r2 = client.post("/api/lesson-plans",
                     json={"topic": "   ", "class_label": "X", "subject": "Y"})
    assert r2.status_code == 422
    assert r2.json()["detail"] == "topic is required"


# ---- RAG surface ----------------------------------------------------------

def test_stats():
    r = client.get("/stats")
    assert r.status_code == 200
    assert "total_chunks" in r.json()


def test_clear_collection_requires_confirm():
    r = client.delete("/collection")
    assert r.status_code == 400


def test_presign_without_token_is_rejected():
    # Pinned observed behavior: 422 (UPLOAD_TOKEN unset -> token gate passes,
    # then request validation/mapping rejects). If UPLOAD_TOKEN gets configured
    # this flips to 401 — update the pin with the env change.
    r = client.post("/uploads/presign", json={"filename": "x.pdf", "subject": "math", "chapter": "ch1"})
    assert r.status_code in (401, 422)


# ---- probe data cleanup -------------------------------------------------------
# The probe curriculum/year above lives in the shared dev database — a UI
# year dropdown fed by /api/academic-years would otherwise offer '2099-00' to
# real users. Purge it after the module runs (curriculum delete cascades to
# subjects/units/chapters/topics/sections/progress per migrations 0016-0019).

import pytest


@pytest.fixture(scope="module", autouse=True)
def _purge_probe_data():
    yield
    import psycopg2
    from config.settings import settings
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                "DELETE FROM curriculums WHERE academic_year_id IN"
                " (SELECT id FROM academic_years WHERE year_label = %s)",
                (PROBE_YEAR,))
            cur.execute("DELETE FROM academic_years WHERE year_label = %s", (PROBE_YEAR,))
    finally:
        conn.close()
