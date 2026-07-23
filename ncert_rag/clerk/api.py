"""
The Clerk — edova's system-of-record API on port 8001.

Implements exactly the contract edova-web expects from VITE_API_URL:

  Curriculum / master data (Curriculum.tsx, MasterData.tsx, LessonPlanner.tsx)
    GET    /api/academic-years
    GET    /api/curriculums/classes?year=&board=          (distinct classes with a curriculum)
    GET    /api/curriculums?year=&board=&class=          (get-or-create)
    POST   /api/curriculums/{cur_id}/subjects
    DELETE /api/curriculums/{cur_id}/subjects/{subject_id}
    GET    /api/curriculum-subjects/{subject_id}/syllabus
    PUT    /api/curriculum-subjects/{subject_id}/syllabus (atomic tree replace)
    GET    /api/curriculum-subjects/{subject_id}/resources (manifest resources, matched to real chapters)

  Lesson-plan library (LessonPlanner.tsx)
    GET    /api/lesson-plans
    POST   /api/lesson-plans

  Section syllabus progress (LessonPlanner "This Week" / Syllabus Map / Settings.tsx Syllabus tab)
    GET    /api/class-sections/sections?year=&board=&class=  (distinct sections for a class)
    GET    /api/class-sections?year=&board=&class=&subject=&section=  (get-or-create)
    GET    /api/class-sections/{section_id}/progress
    PUT    /api/class-sections/{section_id}/topics/{topic_id}

  Teacher uploads (lib/upload.ts): presign -> browser PUT to S3 -> complete
    POST   /uploads/presign
    POST   /uploads/complete

Storage: SQLite (clerk.db, created next to this file, seeded on first run with
the 2026–27 CBSE Class 10 Mathematics + Science curriculum matching the OKF
bundle chapters). S3: bucket/prefix mirror edova-third-brain/config.yaml.

Run:  AWS_PROFILE=admin python -m uvicorn api:app --port 8001   (from clerk/)
"""

import json
import os
import re
import sqlite3
import sys
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

HERE = Path(__file__).resolve().parent
DB_PATH = HERE / "clerk.db"

# Third-brain pipeline as a library: every app upload is catalogued straight
# into the OKF bundle and the consumer manifest refreshed, so an upload is
# instantly listed and knowable — no manual ingest / s3_push runs.
THIRD_BRAIN = HERE.parent.parent / "edova-third-brain"
sys.path.insert(0, str(THIRD_BRAIN / "tools"))
import ingest as okf_ingest  # noqa: E402
import s3_push as okf_shelf  # noqa: E402
import okf_dashboard  # noqa: E402

OKF_BUNDLE = str(THIRD_BRAIN / "okf-bundle")

S3_BUCKET = "innuxai-edova-coteacher"
S3_REGION = "ap-south-1"
S3_PREFIX = "Class-10/Semester-01"
STAGING_PREFIX = "staging"

app = FastAPI(title="Edova Clerk", version="0.1.0")

# Vite dev server hops ports (5173, 5174, …) — allow any localhost port.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ---------- storage ----------

@contextmanager
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


SCHEMA = """
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY, s_no INTEGER, year_label TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS curriculums (
  id TEXT PRIMARY KEY, year_label TEXT, board TEXT, class_label TEXT,
  updated_at TEXT, UNIQUE(year_label, board, class_label)
);
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY, curriculum_id TEXT REFERENCES curriculums(id) ON DELETE CASCADE,
  s_no INTEGER, subject_code TEXT, subject_name TEXT, subject_type TEXT,
  credits INTEGER, total_marks INTEGER, total_chapters INTEGER, syllabus_json TEXT
);
CREATE TABLE IF NOT EXISTS syllabus_units (
  id TEXT PRIMARY KEY, subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  s_no INTEGER, number INTEGER, name TEXT, marks INTEGER
);
CREATE TABLE IF NOT EXISTS syllabus_chapters (
  id TEXT PRIMARY KEY, unit_id TEXT REFERENCES syllabus_units(id) ON DELETE CASCADE,
  s_no INTEGER, number INTEGER, name TEXT
);
CREATE TABLE IF NOT EXISTS syllabus_topics (
  id TEXT PRIMARY KEY, chapter_id TEXT REFERENCES syllabus_chapters(id) ON DELETE CASCADE,
  s_no INTEGER, title TEXT
);
CREATE TABLE IF NOT EXISTS lesson_plans (
  id TEXT PRIMARY KEY, topic TEXT, class_label TEXT, section TEXT, subject TEXT,
  curriculum_subject_id TEXT, duration_minutes INTEGER, standards TEXT,
  objective TEXT, materials TEXT, warmup TEXT, instruction TEXT, activity TEXT,
  assessment TEXT, homework TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS class_sections (
  id TEXT PRIMARY KEY, subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
  section TEXT, teacher TEXT, created_at TEXT, UNIQUE(subject_id, section)
);
CREATE TABLE IF NOT EXISTS section_topic_progress (
  id TEXT PRIMARY KEY, section_id TEXT REFERENCES class_sections(id) ON DELETE CASCADE,
  topic_id TEXT REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  taught_on TEXT, UNIQUE(section_id, topic_id)
);
"""

# Seed: 2026–27 CBSE Class 10 with the two subjects whose textbook chapters
# live in the OKF bundle, so the LessonPlanner dropdowns work on first boot.
SEED_SYLLABUS = {
    ("041", "Mathematics", 100): [
        ("Number Systems", 6, [(1, "Real Numbers", ["Euclid's Division Lemma", "Fundamental Theorem of Arithmetic", "Irrational Numbers"])]),
        ("Algebra", 20, [
            (2, "Polynomials", ["Zeros of a Polynomial", "Relationship between Zeros and Coefficients"]),
            (3, "Pair of Linear Equations in Two Variables", ["Graphical Solution", "Substitution Method", "Elimination Method"]),
            (4, "Quadratic Equations", ["Solution by Factorisation", "Quadratic Formula", "Nature of Roots"]),
            (5, "Arithmetic Progressions", ["nth Term of an AP", "Sum of First n Terms"]),
        ]),
        ("Coordinate Geometry", 6, [(7, "Coordinate Geometry", ["Distance Formula", "Section Formula"])]),
        ("Geometry", 15, [(6, "Triangles", ["Similar Triangles", "Basic Proportionality Theorem", "Pythagoras Theorem"])]),
    ],
    ("086", "Science", 100): [
        ("Chemical Substances — Nature and Behaviour", 25, [
            (1, "Chemical Reactions and Equations", ["Balancing Chemical Equations", "Types of Reactions", "Oxidation and Reduction"]),
            (2, "Acids, Bases and Salts", ["Properties of Acids and Bases", "pH Scale", "Common Salts"]),
            (3, "Metals and Non-metals", ["Physical Properties", "Reactivity Series", "Corrosion"]),
            (4, "Carbon and its Compounds", ["Covalent Bonding", "Homologous Series", "Ethanol and Ethanoic Acid"]),
        ]),
        ("World of Living", 25, [
            (5, "Life Processes", ["Nutrition", "Respiration", "Transportation", "Excretion"]),
            (6, "Control and Coordination", ["Nervous System", "Hormones in Animals", "Coordination in Plants"]),
            (7, "How do Organisms Reproduce", ["Modes of Reproduction", "Sexual Reproduction in Plants", "Reproductive Health"]),
            (8, "Heredity", ["Mendel's Laws", "Sex Determination"]),
        ]),
        ("Natural Phenomena", 12, [
            (9, "Light — Reflection and Refraction", ["Laws of Reflection", "Spherical Mirrors", "Refraction and Lenses"]),
            (10, "The Human Eye and the Colourful World", ["Defects of Vision", "Dispersion of Light", "Atmospheric Refraction"]),
        ]),
        ("Effects of Current", 13, [
            (11, "Electricity", ["Ohm's Law", "Series and Parallel Circuits", "Heating Effect of Current"]),
        ]),
    ],
}


def seed(conn: sqlite3.Connection):
    if conn.execute("SELECT COUNT(*) FROM academic_years").fetchone()[0]:
        return
    conn.execute("INSERT INTO academic_years (id, s_no, year_label) VALUES (?, 1, ?)",
                 (new_id("ay"), "2026–27"))
    cur_id = new_id("cur")
    conn.execute(
        "INSERT INTO curriculums (id, year_label, board, class_label, updated_at) VALUES (?,?,?,?,?)",
        (cur_id, "2026–27", "CBSE", "Class 10", now_iso()))
    for s_no, ((code, name, marks), units) in enumerate(SEED_SYLLABUS.items(), start=1):
        subj_id = new_id("sub")
        conn.execute(
            "INSERT INTO subjects (id, curriculum_id, s_no, subject_code, subject_name, subject_type,"
            " credits, total_marks, total_chapters, syllabus_json) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (subj_id, cur_id, s_no, code, name, "Core", 0, marks,
             sum(len(chs) for _, _, chs in units),
             json.dumps({uname: umarks for uname, umarks, _ in units})))
        for u_no, (uname, umarks, chapters) in enumerate(units, start=1):
            unit_id = new_id("unit")
            conn.execute(
                "INSERT INTO syllabus_units (id, subject_id, s_no, number, name, marks) VALUES (?,?,?,?,?,?)",
                (unit_id, subj_id, u_no, u_no, uname, umarks))
            for c_no, (number, cname, topics) in enumerate(chapters, start=1):
                ch_id = new_id("ch")
                conn.execute(
                    "INSERT INTO syllabus_chapters (id, unit_id, s_no, number, name) VALUES (?,?,?,?,?)",
                    (ch_id, unit_id, c_no, number, cname))
                for t_no, title in enumerate(topics, start=1):
                    conn.execute(
                        "INSERT INTO syllabus_topics (id, chapter_id, s_no, title) VALUES (?,?,?,?)",
                        (new_id("top"), ch_id, t_no, title))


def _ensure_column(conn: sqlite3.Connection, table: str, col: str, coltype: str):
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if col not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {coltype}")


with db() as _conn:
    _conn.executescript(SCHEMA)
    _ensure_column(_conn, "syllabus_units", "number", "INTEGER")
    seed(_conn)


# ---------- serializers ----------

def subject_row(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"], "s_no": r["s_no"], "subject_code": r["subject_code"],
        "subject_name": r["subject_name"], "subject_type": r["subject_type"],
        "credits": r["credits"], "total_marks": r["total_marks"],
        "total_chapters": r["total_chapters"],
        "syllabus_json": json.loads(r["syllabus_json"] or "{}"),
    }


def curriculum_response(conn: sqlite3.Connection, cur: sqlite3.Row) -> dict:
    subs = conn.execute(
        "SELECT * FROM subjects WHERE curriculum_id = ? ORDER BY s_no", (cur["id"],)).fetchall()
    return {
        "id": cur["id"], "year_label": cur["year_label"], "board": cur["board"],
        "class_label": cur["class_label"], "updated_at": cur["updated_at"],
        "subjects": [subject_row(s) for s in subs],
    }


def syllabus_response(conn: sqlite3.Connection, subject: sqlite3.Row) -> dict:
    units = []
    for u in conn.execute("SELECT * FROM syllabus_units WHERE subject_id = ? ORDER BY s_no",
                          (subject["id"],)).fetchall():
        chapters = []
        for c in conn.execute("SELECT * FROM syllabus_chapters WHERE unit_id = ? ORDER BY s_no",
                              (u["id"],)).fetchall():
            topics = [{"id": t["id"], "s_no": t["s_no"], "title": t["title"]}
                      for t in conn.execute(
                          "SELECT * FROM syllabus_topics WHERE chapter_id = ? ORDER BY s_no",
                          (c["id"],)).fetchall()]
            chapters.append({"id": c["id"], "s_no": c["s_no"], "number": c["number"],
                             "name": c["name"], "topics": topics})
        units.append({"id": u["id"], "s_no": u["s_no"], "number": u["number"], "name": u["name"],
                      "marks": u["marks"], "chapters": chapters})
    return {"subject_id": subject["id"], "subject_name": subject["subject_name"], "units": units}


def plan_row(r: sqlite3.Row) -> dict:
    return {
        "id": r["id"], "topic": r["topic"], "class_label": r["class_label"],
        "section": r["section"], "subject": r["subject"],
        "curriculum_subject_id": r["curriculum_subject_id"],
        "duration_minutes": r["duration_minutes"],
        "standards": json.loads(r["standards"] or "[]"),
        "objective": r["objective"], "materials": json.loads(r["materials"] or "[]"),
        "warmup": r["warmup"], "instruction": r["instruction"], "activity": r["activity"],
        "assessment": r["assessment"], "homework": r["homework"], "created_at": r["created_at"],
    }


# ---------- curriculum / master data ----------

@app.get("/api/academic-years")
def academic_years():
    with db() as conn:
        rows = conn.execute("SELECT * FROM academic_years ORDER BY s_no").fetchall()
        return [{"id": r["id"], "s_no": r["s_no"], "year_label": r["year_label"]} for r in rows]


@app.get("/api/curriculums/classes")
def list_curriculum_classes(year: str, board: str = "CBSE"):
    """Distinct classes that have a curriculum row for this year/board — feeds
    the Settings > Syllabus tab's Class filter from real Master Data instead
    of a static option list."""
    with db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT class_label FROM curriculums WHERE year_label=? AND board=?",
            (year, board)).fetchall()
        labels = [r["class_label"] for r in rows]

        def sort_key(label: str):
            m = re.match(r"Class (\d+)", label)
            return (1, int(m.group(1))) if m else (0, label)

        return sorted(labels, key=sort_key)


@app.get("/api/curriculums")
def get_curriculum(year: str, board: str = "CBSE",
                   class_label: str = Query(alias="class")):
    if not year or not class_label:
        raise HTTPException(status_code=422, detail="year and class are required")
    with db() as conn:
        cur = conn.execute(
            "SELECT * FROM curriculums WHERE year_label=? AND board=? AND class_label=?",
            (year, board, class_label)).fetchone()
        if not cur:  # get-or-create so every year/board/class combo has a card
            cur_id = new_id("cur")
            conn.execute(
                "INSERT INTO curriculums (id, year_label, board, class_label, updated_at)"
                " VALUES (?,?,?,?,?)", (cur_id, year, board, class_label, now_iso()))
            cur = conn.execute("SELECT * FROM curriculums WHERE id=?", (cur_id,)).fetchone()
        return curriculum_response(conn, cur)


class SubjectIn(BaseModel):
    subject_code: str
    subject_name: str
    subject_type: str = "Core"
    credits: int = 0
    total_marks: Optional[int] = None
    total_chapters: Optional[int] = None
    syllabus_json: dict = {}


@app.post("/api/curriculums/{cur_id}/subjects")
def add_subject(cur_id: str, body: SubjectIn):
    if not body.subject_code.strip() or not body.subject_name.strip():
        raise HTTPException(status_code=422, detail="subject_code and subject_name are required")
    with db() as conn:
        cur = conn.execute("SELECT * FROM curriculums WHERE id=?", (cur_id,)).fetchone()
        if not cur:
            raise HTTPException(status_code=404, detail="curriculum not found")
        dup = conn.execute(
            "SELECT 1 FROM subjects WHERE curriculum_id=? AND (subject_code=? OR subject_name=?)",
            (cur_id, body.subject_code.strip(), body.subject_name.strip())).fetchone()
        if dup:
            raise HTTPException(status_code=409,
                                detail="A subject with this code or name already exists")
        s_no = (conn.execute("SELECT MAX(s_no) FROM subjects WHERE curriculum_id=?",
                             (cur_id,)).fetchone()[0] or 0) + 1
        subj_id = new_id("sub")
        conn.execute(
            "INSERT INTO subjects (id, curriculum_id, s_no, subject_code, subject_name,"
            " subject_type, credits, total_marks, total_chapters, syllabus_json)"
            " VALUES (?,?,?,?,?,?,?,?,?,?)",
            (subj_id, cur_id, s_no, body.subject_code.strip(), body.subject_name.strip(),
             body.subject_type, body.credits, body.total_marks, body.total_chapters,
             json.dumps(body.syllabus_json)))
        conn.execute("UPDATE curriculums SET updated_at=? WHERE id=?", (now_iso(), cur_id))
        return subject_row(conn.execute("SELECT * FROM subjects WHERE id=?", (subj_id,)).fetchone())


@app.delete("/api/curriculums/{cur_id}/subjects/{subject_id}")
def delete_subject(cur_id: str, subject_id: str):
    with db() as conn:
        n = conn.execute("DELETE FROM subjects WHERE id=? AND curriculum_id=?",
                         (subject_id, cur_id)).rowcount
        if not n:
            raise HTTPException(status_code=404, detail="subject not found")
        conn.execute("UPDATE curriculums SET updated_at=? WHERE id=?", (now_iso(), cur_id))
        return {"status": "deleted"}


@app.get("/api/curriculum-subjects/{subject_id}/syllabus")
def get_syllabus(subject_id: str):
    with db() as conn:
        subj = conn.execute("SELECT * FROM subjects WHERE id=?", (subject_id,)).fetchone()
        if not subj:
            raise HTTPException(status_code=404, detail="subject not found")
        return syllabus_response(conn, subj)


# ---------- learning-resources catalog (Settings > Resource Library / Teaching > Learning Resources) ----------
#
# The third-brain pipeline (and the app's own /uploads/complete -> _okf_catalog
# above) already fully automates cataloguing: every ingested/uploaded file
# lands in okf-bundle/nodes/, gets shelved to S3, and manifest.json is
# rewritten immediately. What's been missing is a way to read that manifest
# back out matched to REAL Master Data chapters, instead of the app
# maintaining its own separate, hand-typed Class/Unit/Chapter/Subtopic copy.
#
# The manifest only carries a subject slug ("math"/"science") + a
# domain-qualified chapter_id ("math-ch5", "biology-ch1", "physics-ch3") —
# never a numeric chapter number, and math/science line up differently:
# math-chN == syllabus_chapters.number N directly, but science's chapter_id
# is domain-local (biology/chemistry/physics each restart at ch1) while
# syllabus_chapters.number is the NCERT book's global 1-11 numbering.
# generate_metadata.py's own docstring flags this exact mismatch
# ("physics-ch3 is book chapter 11"). Confirmed against the seeded syllabus
# (ncert_rag/clerk/api.py SEED_SYLLABUS): chemistry 1-4 already match,
# biology is +4, physics is +8 — a fixed per-domain offset, not a fuzzy
# lookup, so a small explicit table is the safe, verifiable choice here
# (this is CBSE Class 10 2026-27 specific; revisit if that syllabus changes).
#
# New uploads made through THIS app (_okf_catalog below) never produce a
# domain-qualified id, though — _okf_subject() maps any science-ish subject
# string straight to the bare "science" slug, so ingest.py's
# qualify_chapter_id gives "science-ch9", already carrying the GLOBAL chapter
# number (the teacher picks the chapter from the real syllabus UI, which only
# knows global numbers) — not a domain-local one. Both id shapes have to be
# accepted here.
_SCIENCE_DOMAIN_OFFSET = {"chemistry": 0, "biology": 4, "physics": 8}
_GLOBAL_SUBJECT_SLUG = {"math": "Mathematics", "science": "Science"}


def _global_chapter_ref(chapter_id: str) -> Optional[tuple[str, int]]:
    """'math-ch5' -> ('Mathematics', 5); 'science-ch9' -> ('Science', 9)
    (already-global, from an app upload); 'biology-ch1' -> ('Science', 5);
    'physics-ch3' -> ('Science', 11) (domain-local, from the pipeline seed).
    None if chapter_id doesn't match any known shape."""
    m = re.match(r"^(math|science|biology|chemistry|physics)-ch(\d+)$", chapter_id or "")
    if not m:
        return None
    domain, local = m.group(1), int(m.group(2))
    if domain in _GLOBAL_SUBJECT_SLUG:
        return _GLOBAL_SUBJECT_SLUG[domain], local
    return "Science", _SCIENCE_DOMAIN_OFFSET[domain] + local


def _read_manifest() -> list[dict]:
    manifest_path = THIRD_BRAIN / "okf-bundle" / "manifest" / "manifest.json"
    if not manifest_path.exists():
        return []
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8")).get("resources", [])
    except (json.JSONDecodeError, OSError):
        return []


@app.get("/api/curriculum-subjects/{subject_id}/resources")
def get_subject_resources(subject_id: str):
    """Catalogued files (third-brain pipeline + teacher uploads, same
    manifest) for this subject, each annotated with the real global chapter
    number so the frontend can group them under its already-loaded Master
    Data chapter tree — no separate resource taxonomy needed."""
    with db() as conn:
        subj = conn.execute("SELECT * FROM subjects WHERE id=?", (subject_id,)).fetchone()
        if not subj:
            raise HTTPException(status_code=404, detail="subject not found")
        subject_name = subj["subject_name"]
    out = []
    for r in _read_manifest():
        ref = _global_chapter_ref(r.get("chapter_id", ""))
        if not ref or ref[0] != subject_name:
            continue
        out.append({
            "id": r["id"], "title": r["title"], "type": r["type"],
            "doc_type": r.get("doc_type"), "chapter_number": ref[1],
            "s3_key": r.get("s3_key"), "preview_s3_key": r.get("previewS3Key"),
            "status": r.get("status", "ready"),
        })
    return out


class ChapterIn(BaseModel):
    number: Optional[int] = None
    name: str
    topics: list[str] = []


class UnitIn(BaseModel):
    number: Optional[int] = None
    name: str
    marks: Optional[int] = None
    chapters: list[ChapterIn] = []


class SyllabusIn(BaseModel):
    units: list[UnitIn] = []


@app.put("/api/curriculum-subjects/{subject_id}/syllabus")
def put_syllabus(subject_id: str, body: SyllabusIn):
    with db() as conn:
        subj = conn.execute("SELECT * FROM subjects WHERE id=?", (subject_id,)).fetchone()
        if not subj:
            raise HTTPException(status_code=404, detail="subject not found")
        # Atomic replace: drop the old tree, write the new one.
        conn.execute(
            "DELETE FROM syllabus_topics WHERE chapter_id IN (SELECT c.id FROM syllabus_chapters c"
            " JOIN syllabus_units u ON c.unit_id=u.id WHERE u.subject_id=?)", (subject_id,))
        conn.execute(
            "DELETE FROM syllabus_chapters WHERE unit_id IN"
            " (SELECT id FROM syllabus_units WHERE subject_id=?)", (subject_id,))
        conn.execute("DELETE FROM syllabus_units WHERE subject_id=?", (subject_id,))
        for u_no, u in enumerate(body.units, start=1):
            unit_id = new_id("unit")
            conn.execute(
                "INSERT INTO syllabus_units (id, subject_id, s_no, number, name, marks) VALUES (?,?,?,?,?,?)",
                (unit_id, subject_id, u_no, u.number, u.name, u.marks))
            for c_no, c in enumerate(u.chapters, start=1):
                ch_id = new_id("ch")
                conn.execute(
                    "INSERT INTO syllabus_chapters (id, unit_id, s_no, number, name)"
                    " VALUES (?,?,?,?,?)", (ch_id, unit_id, c_no, c.number, c.name))
                for t_no, title in enumerate(c.topics, start=1):
                    conn.execute(
                        "INSERT INTO syllabus_topics (id, chapter_id, s_no, title) VALUES (?,?,?,?)",
                        (new_id("top"), ch_id, t_no, title))
        # Recompute the Curriculum tab's summary from the saved tree.
        summary = {u.name: (u.marks or 0) for u in body.units}
        total_chapters = sum(len(u.chapters) for u in body.units)
        conn.execute("UPDATE subjects SET syllabus_json=?, total_chapters=? WHERE id=?",
                     (json.dumps(summary), total_chapters, subject_id))
        conn.execute("UPDATE curriculums SET updated_at=? WHERE id=?",
                     (now_iso(), subj["curriculum_id"]))
        return syllabus_response(conn, subj)


# ---------- lesson-plan library ----------

class LessonPlanIn(BaseModel):
    topic: str
    class_label: str
    section: Optional[str] = None
    subject: str
    curriculum_subject_id: Optional[str] = None
    duration_minutes: int = 45
    standards: list[str] = []
    objective: str = ""
    materials: list[str] = []
    warmup: str = ""
    instruction: str = ""
    activity: str = ""
    assessment: str = ""
    homework: str = ""


@app.get("/api/lesson-plans")
def list_lesson_plans():
    with db() as conn:
        rows = conn.execute("SELECT * FROM lesson_plans ORDER BY created_at DESC").fetchall()
        return [plan_row(r) for r in rows]


@app.post("/api/lesson-plans")
def create_lesson_plan(body: LessonPlanIn):
    if not body.topic.strip():
        raise HTTPException(status_code=422, detail="topic is required")
    with db() as conn:
        pid = new_id("lp")
        conn.execute(
            "INSERT INTO lesson_plans (id, topic, class_label, section, subject,"
            " curriculum_subject_id, duration_minutes, standards, objective, materials,"
            " warmup, instruction, activity, assessment, homework, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (pid, body.topic.strip(), body.class_label, body.section, body.subject,
             body.curriculum_subject_id, body.duration_minutes, json.dumps(body.standards),
             body.objective, json.dumps(body.materials), body.warmup, body.instruction,
             body.activity, body.assessment, body.homework, now_iso()))
        return plan_row(conn.execute("SELECT * FROM lesson_plans WHERE id=?", (pid,)).fetchone())


# ---------- section syllabus progress (This Week / Syllabus Map) ----------
#
# A class_sections row is one section studying one subject ("Class 10 —
# Section A · Mathematics"). It tracks its own taught-topic ticks against the
# shared master syllabus tree; Actual % for a unit = taught / total topics.
# Mirrors db/migrations/20260101000019 (Postgres) on the clerk's SQLite store.

@app.get("/api/class-sections/sections")
def list_class_sections(year: str, board: str = "CBSE",
                        class_label: str = Query(alias="class")):
    """Distinct sections for a class across all its subjects — feeds the
    Settings > Syllabus tab's Section filter from the real class_sections
    table (a section spans every subject it studies, so this ignores
    subject_id rather than requiring one)."""
    with db() as conn:
        rows = conn.execute(
            "SELECT DISTINCT cs.section FROM class_sections cs"
            " JOIN subjects s ON cs.subject_id = s.id"
            " JOIN curriculums c ON s.curriculum_id = c.id"
            " WHERE c.year_label=? AND c.board=? AND c.class_label=?"
            " ORDER BY cs.section",
            (year, board, class_label)).fetchall()
        return [r["section"] for r in rows]


@app.get("/api/class-sections")
def get_class_section(year: str, subject: str, board: str = "CBSE",
                      class_label: str = Query(alias="class"),
                      section: str = "Section A"):
    """Get-or-create the section for year/board/class/subject."""
    with db() as conn:
        subj = conn.execute(
            "SELECT s.* FROM subjects s JOIN curriculums c ON s.curriculum_id = c.id"
            " WHERE c.year_label=? AND c.board=? AND c.class_label=? AND s.subject_name=?",
            (year, board, class_label, subject)).fetchone()
        if not subj:
            raise HTTPException(status_code=404,
                                detail=f"no {subject} curriculum for {class_label} {year}")
        row = conn.execute(
            "SELECT * FROM class_sections WHERE subject_id=? AND section=?",
            (subj["id"], section)).fetchone()
        if not row:
            sec_id = new_id("sec")
            conn.execute(
                "INSERT INTO class_sections (id, subject_id, section, teacher, created_at)"
                " VALUES (?,?,?,?,?)", (sec_id, subj["id"], section, None, now_iso()))
            row = conn.execute("SELECT * FROM class_sections WHERE id=?", (sec_id,)).fetchone()
        return {"id": row["id"], "section": row["section"], "subject_id": subj["id"],
                "subject_name": subj["subject_name"], "class_label": class_label,
                "year_label": year}


@app.get("/api/class-sections/{section_id}/progress")
def section_progress(section_id: str):
    """The section's taught-topic ticks: topic ids + when they were taught."""
    with db() as conn:
        sec = conn.execute("SELECT * FROM class_sections WHERE id=?", (section_id,)).fetchone()
        if not sec:
            raise HTTPException(status_code=404, detail="section not found")
        rows = conn.execute(
            "SELECT topic_id, taught_on FROM section_topic_progress WHERE section_id=?",
            (section_id,)).fetchall()
        return {"section_id": section_id, "subject_id": sec["subject_id"],
                "done_topics": [{"topic_id": r["topic_id"], "taught_on": r["taught_on"]}
                                for r in rows]}


class TopicTickIn(BaseModel):
    done: bool
    taught_on: Optional[str] = None


@app.put("/api/class-sections/{section_id}/topics/{topic_id}")
def tick_topic(section_id: str, topic_id: str, body: TopicTickIn):
    """Tick/untick a taught topic. A row present means taught; unticking
    deletes the row (sparse, like section_topic_progress in migration 0019)."""
    with db() as conn:
        sec = conn.execute("SELECT 1 FROM class_sections WHERE id=?", (section_id,)).fetchone()
        if not sec:
            raise HTTPException(status_code=404, detail="section not found")
        top = conn.execute("SELECT 1 FROM syllabus_topics WHERE id=?", (topic_id,)).fetchone()
        if not top:
            raise HTTPException(status_code=404, detail="topic not found")
        if body.done:
            conn.execute(
                "INSERT INTO section_topic_progress (id, section_id, topic_id, taught_on)"
                " VALUES (?,?,?,?)"
                " ON CONFLICT(section_id, topic_id) DO UPDATE SET taught_on=excluded.taught_on",
                (new_id("prog"), section_id, topic_id,
                 body.taught_on or now_iso()[:10]))
        else:
            conn.execute(
                "DELETE FROM section_topic_progress WHERE section_id=? AND topic_id=?",
                (section_id, topic_id))
        return {"section_id": section_id, "topic_id": topic_id, "done": body.done}


# ---------- teacher uploads (presign -> S3 PUT -> complete) ----------

def s3_client():
    import boto3
    return boto3.client("s3", region_name=S3_REGION)


class PresignIn(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"
    size_bytes: int = 0


@app.post("/uploads/presign")
def presign(body: PresignIn):
    safe_name = os.path.basename(body.filename).strip() or "upload.bin"
    staging_key = f"{STAGING_PREFIX}/{uuid.uuid4().hex}/{safe_name}"
    try:
        url = s3_client().generate_presigned_url(
            "put_object",
            Params={"Bucket": S3_BUCKET, "Key": staging_key, "ContentType": body.content_type},
            ExpiresIn=900)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"could not presign upload: {exc}")
    return {"upload_url": url, "staging_key": staging_key, "expires_in": 900}


class CompleteIn(BaseModel):
    staging_key: str
    title: str = ""
    subject: str = "Uncategorized"
    chapter: str = "general"
    doc_type: str = "document"


def _clean_segment(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9 _\-.]", "", s or "").strip()
    return s or "Uncategorized"


def _okf_subject(subject: str) -> str:
    s = (subject or "").lower()
    if "math" in s:
        return "math"
    if any(k in s for k in ("scien", "physic", "chem", "bio")):
        return "science"
    return _clean_segment(s).lower().replace(" ", "-") or "uncategorized"


def _okf_chapter_id(chapter: str) -> str:
    """'sci10-ch05' / 'Chapter 5' / 'ch5' -> bare 'ch5' (ingest qualifies it
    with the subject); anything without a chapter number passes through."""
    m = re.search(r"ch(?:apter)?[\s_\-]*0*(\d+)$", (chapter or "").lower())
    if m:
        return f"ch{int(m.group(1))}"
    return _clean_segment(chapter).lower().replace(" ", "-") or "general"


def _chapter_name(subject_slug: str, chapter_id: str, fallback: str) -> str:
    """Best-effort human name from the clerk's own syllabus tree
    (e.g. science ch5 -> 'Life Processes')."""
    m = re.match(r"ch(\d+)$", chapter_id)
    if not m:
        return fallback
    subject_name = {"math": "Mathematics", "science": "Science"}.get(subject_slug)
    if not subject_name:
        return fallback
    with db() as conn:
        row = conn.execute(
            "SELECT c.name FROM syllabus_chapters c"
            " JOIN syllabus_units u ON c.unit_id = u.id"
            " JOIN subjects s ON u.subject_id = s.id"
            " WHERE s.subject_name = ? AND c.number = ?",
            (subject_name, int(m.group(1)))).fetchone()
    return row["name"] if row else fallback


def _okf_catalog(s3, body: "CompleteIn", filename: str) -> tuple[str, str]:
    """Catalogue an uploaded file into the OKF bundle and shelve it at the
    pipeline's derived key. Returns (doc_id, final_s3_key)."""
    subject_slug = _okf_subject(body.subject)
    chapter_id = _okf_chapter_id(body.chapter)
    chapter_name = _chapter_name(subject_slug, chapter_id, body.chapter or "General")
    doc_type = re.sub(r"[^a-z0-9_]", "", (body.doc_type or "document").lower()) or "document"

    # Pull the staged file into the third-brain tree (ingest needs a local
    # path under its ROOT for hashing, attachments and fulltext).
    local_dir = THIRD_BRAIN / "subjects" / subject_slug / "uploads"
    local_dir.mkdir(parents=True, exist_ok=True)
    local_path = local_dir / filename
    s3.download_file(S3_BUCKET, body.staging_key, str(local_path))

    result = okf_ingest.ingest(subject_slug, chapter_id, chapter_name, doc_type, local_path)
    doc_id = result["doc_id"]

    # Shelve at the SAME key s3_push would derive, so later pipeline runs see
    # this node as CURRENT instead of re-uploading it elsewhere.
    node_path = THIRD_BRAIN / "okf-bundle" / "nodes" / f"{doc_id}.json"
    node = json.loads(node_path.read_text(encoding="utf-8"))
    final_key = okf_shelf.derive_s3_key(node, S3_PREFIX, filename)
    s3.copy_object(Bucket=S3_BUCKET, Key=final_key,
                   CopySource={"Bucket": S3_BUCKET, "Key": body.staging_key})
    s3.delete_object(Bucket=S3_BUCKET, Key=body.staging_key)
    node["s3_key"] = final_key
    node["s3_uploaded_at"] = now_iso()
    node_path.write_text(json.dumps(node, indent=2), encoding="utf-8")

    # Refresh the consumer manifest (local + S3) so the app lists it at once.
    config = okf_ingest.load_config()
    manifest = okf_shelf.build_manifest(okf_shelf.collect_plan(config), config)
    manifest_path = THIRD_BRAIN / "okf-bundle" / "manifest" / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    s3.put_object(Bucket=S3_BUCKET, Key=f"{S3_PREFIX}/manifest.json",
                  Body=json.dumps(manifest, indent=2).encode("utf-8"),
                  ContentType="application/json")

    # Refresh the shareable standalone health map too (the live /okf/dashboard
    # endpoint always regenerates, but this keeps the on-disk file current).
    try:
        dash = okf_dashboard.render(okf_dashboard.collect(OKF_BUNDLE), fragment=False)
        (Path(OKF_BUNDLE) / "okf_dashboard.html").write_text(dash, encoding="utf-8")
    except Exception as exc:
        print(f"[complete] dashboard refresh skipped: {exc}", file=sys.stderr)
    return doc_id, final_key


@app.post("/uploads/complete")
def complete(body: CompleteIn):
    if not body.staging_key.startswith(f"{STAGING_PREFIX}/"):
        raise HTTPException(status_code=422, detail="invalid staging_key")
    filename = body.staging_key.rsplit("/", 1)[-1]
    s3 = s3_client()
    try:
        # Full automation: catalogue into OKF + shelve + refresh manifest.
        doc_id, final_key = _okf_catalog(s3, body, filename)
    except Exception as exc:
        # The upload must not be lost because cataloguing hiccuped — fall back
        # to plain shelving (pre-OKF behaviour) and surface the reason.
        print(f"[complete] OKF cataloguing failed, plain shelving: {exc}", file=sys.stderr)
        subject = _clean_segment(body.subject).capitalize()
        chapter = _clean_segment(body.chapter)
        final_key = f"{S3_PREFIX}/{subject}/{chapter}/{filename}"
        doc_id = new_id("doc")
        try:
            s3.copy_object(Bucket=S3_BUCKET, Key=final_key,
                           CopySource={"Bucket": S3_BUCKET, "Key": body.staging_key})
            s3.delete_object(Bucket=S3_BUCKET, Key=body.staging_key)
        except Exception as exc2:
            raise HTTPException(status_code=502, detail=f"could not shelve upload: {exc2}")
    # edova-web getAssetUrl convention: spaces as '+' in the preview key.
    preview_key = "/".join(seg.replace(" ", "+") for seg in final_key.split("/"))
    return {"doc_id": doc_id, "s3_key": final_key, "preview_s3_key": preview_key}


@app.get("/okf/dashboard", response_class=HTMLResponse)
def okf_dashboard_view():
    """Live OKF bundle health map — regenerated from the bundle on every view,
    so it always reflects the latest uploads (no manual refresh). Embedded by
    edova-web's Administration → Knowledge Graph tab."""
    try:
        data = okf_dashboard.collect(OKF_BUNDLE)
        return HTMLResponse(okf_dashboard.render(data, fragment=False))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"could not build dashboard: {exc}")


@app.get("/health")
def health():
    return {"status": "ok"}
