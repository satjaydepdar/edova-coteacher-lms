"""
The Clerk — edova's student-engagement + uploads API on port 8001.

Course CRUD (curriculum, master syllabus, lesson plans, class sections,
resources catalog) MOVED to the Postgres rag app (ncert_rag/api, :8000) —
same paths, same wire shapes, data migrated by
scripts/migrate_clerk_to_postgres.py. The SQLite syllabus/curriculum tables
below remain only as the seed reference for quiz topic resolution; nothing
serves them over HTTP anymore.

What stays here:

  Student gamification + quiz (LearningHub.tsx)
    GET    /api/students/{student_id}/gamification   (xp/streak + mistake notebook)
    POST   /api/students/{student_id}/xp             (streak rollover on daily activity)
    POST   /api/students/{student_id}/mistakes
    POST   /api/students/{student_id}/flags
    GET    /api/learning/quiz?topic_id=              (empty questions when unseeded, never 404)

  Student personal wiki (PdfViewerWithNotes.tsx, WikiPage.tsx)
    GET    /api/students/{student_id}/wiki            (lazy-create-or-fetch)
    POST   /api/students/{student_id}/wiki/notes      (append a chapter note block)

  Teacher uploads (lib/upload.ts): presign -> browser PUT to S3 -> complete
    POST   /uploads/presign
    POST   /uploads/complete
    POST   /api/resources/{doc_id}/verify   (mark a resource teacher_reviewed)

Storage: SQLite (clerk.db, created next to this file). S3: bucket/prefix
mirror edova-third-brain/config.yaml.

Run:  AWS_PROFILE=admin python -m uvicorn api:app --port 8001   (from clerk/)
"""

import json
import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor
import sys
import uuid
from config.settings import settings
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

HERE = Path(__file__).resolve().parent

# Third-brain pipeline as a library: every app upload is catalogued straight
# into the OKF bundle and the consumer manifest refreshed, so an upload is
# instantly listed and knowable — no manual ingest / s3_push runs.
THIRD_BRAIN = HERE.parent.parent / "edova-third-brain"
sys.path.insert(0, str(THIRD_BRAIN / "tools"))
# okf_search.py (and any future clerk-local helpers) live beside this file;
# make them importable whether we're run as `uvicorn api:app` from clerk/
# or imported as `clerk.api` (pytest from the ncert_rag root). Appended, not
# prepended — prepending lets this api.py shadow the ncert_rag/api package.
sys.path.append(str(HERE))
import ingest as okf_ingest  # noqa: E402
import s3_push as okf_shelf  # noqa: E402
import okf_dashboard  # noqa: E402
import okf_search  # noqa: E402
import s3conn  # noqa: E402

OKF_BUNDLE = str(THIRD_BRAIN / "okf-bundle")

# Bucket settings come from edova-third-brain/config.yaml's s3: block via
# s3conn (single source of truth) — not hardcoded here.
_S3 = s3conn.s3_settings()
S3_BUCKET = _S3["bucket"]
S3_REGION = _S3["region"]
S3_PREFIX = _S3["prefix"]
STAGING_PREFIX = _S3["staging_prefix"]

app = FastAPI(title="Edova Clerk", version="0.1.0")


@app.on_event("startup")
def _check_aws_credentials():
    # Uploads are the only feature needing AWS; warn loudly at boot instead
    # of failing mysteriously on the teacher's first upload.
    s3conn.warn_if_credentials_missing()

# Vite dev server hops ports (5173, 5174, …) — allow any localhost port.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# ---------- storage ----------

class PgWrapper:
    def __init__(self, conn):
        self.conn = conn
    def execute(self, sql, params=()):
        cur = self.conn.cursor(cursor_factory=RealDictCursor)
        # Simple string replace works because we don't use ? inside literals in these queries
        sql = sql.replace('?', '%s')
        cur.execute(sql, params)
        return cur
    def commit(self):
        self.conn.commit()
    def close(self):
        self.conn.close()

@contextmanager
def db():
    conn = psycopg2.connect(settings.DATABASE_URL)
    wrapper = PgWrapper(conn)
    try:
        yield wrapper
        wrapper.commit()
    finally:
        wrapper.close()


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
CREATE TABLE IF NOT EXISTS clerk_students (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0, last_activity TEXT  -- ISO date YYYY-MM-DD
);
CREATE TABLE IF NOT EXISTS clerk_student_mistakes (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES clerk_students(id) ON DELETE CASCADE,
  topic_id TEXT, chapter TEXT NOT NULL, question TEXT NOT NULL,
  your_answer TEXT NOT NULL, correct_answer TEXT NOT NULL,
  solution TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clerk_student_flags (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES clerk_students(id) ON DELETE CASCADE,
  context TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clerk_quizzes (
  id TEXT PRIMARY KEY, topic_id TEXT NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  questions TEXT NOT NULL  -- JSON array [{q, opts:[str], ans:int, exp:str}]
);
CREATE TABLE IF NOT EXISTS clerk_student_wiki_pages (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL UNIQUE, slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL, content_markdown TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clerk_student_chapter_notes (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL,
  chapter_number INTEGER, chapter_name TEXT NOT NULL,
  note_text TEXT NOT NULL, created_at TEXT NOT NULL
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


def seed(conn: PgWrapper):
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


# Gamification seed is separate from the one-shot syllabus seed() above:
# clerk.db already exists in the wild, so seed()'s academic_years count guard
# skips — this runs on every boot, idempotently (INSERT OR IGNORE, fixed ids).
SEED_QUIZ_QUESTIONS = [
    {"q": "What is the law of reflection?", "opts": ["i = r", "i > r", "i < r"], "ans": 0,
     "exp": "Angle of incidence equals angle of reflection"},
    {"q": "Type of reflection on smooth surface?", "opts": ["Diffuse", "Regular", "Scattered"],
     "ans": 1, "exp": "Smooth surface gives regular reflection"},
    {"q": "Incident ray 45°, reflected?", "opts": ["30°", "45°", "90°"], "ans": 1,
     "exp": "i = r so 45°"},
]


def seed_gamification(conn: PgWrapper):
    conn.execute(
        "INSERT INTO clerk_students (id, name, xp, streak, last_activity)"
        " VALUES ('stu_demo', 'Aarav Sharma', 1240, 7, NULL)")
    conn.execute(
        "INSERT OR IGNORE INTO student_mistakes"
        " (id, student_id, topic_id, chapter, question, your_answer, correct_answer, solution, created_at)"
        " VALUES ('mis_seed_reflection', 'stu_demo', NULL, ?, ?, ?, ?, ?, '2026-07-24') ON CONFLICT (id) DO NOTHING",
        ("Light — Reflection and Refraction", "Angle of incidence = ?", "30°", "45°",
         "Use law: i = r. Mirror angle was 45°"))
    # Resolve the quiz topic at seed time: 'Laws of Reflection' under the
    # Science chapter numbered 9 ('Light — Reflection and Refraction').
    topic = conn.execute(
        "SELECT t.id FROM syllabus_topics t"
        " JOIN syllabus_chapters c ON t.chapter_id = c.id"
        " JOIN syllabus_units u ON c.unit_id = u.id"
        " JOIN subjects s ON u.subject_id = s.id"
        " WHERE t.title = 'Laws of Reflection' AND c.number = 9"
        " AND c.name = 'Light — Reflection and Refraction' AND s.subject_name = 'Science'"
    ).fetchone()
    if topic:
        conn.execute(
            "INSERT INTO clerk_quizzes (id, topic_id, questions) VALUES ('quiz_seed_reflection', ?, ?) ON CONFLICT (id) DO NOTHING",
            (topic["id"], json.dumps(SEED_QUIZ_QUESTIONS)))


def _ensure_column(conn: PgWrapper, table: str, col: str, coltype: str):
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if col not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {coltype}")


with db() as _conn:
    _conn.executescript(SCHEMA)
    _ensure_column(_conn, "syllabus_units", "number", "INTEGER")
    seed(_conn)
    seed_gamification(_conn)


# ---------- serializers ----------

def mistake_row(r: dict) -> dict:
    return {
        "id": r["id"], "q": r["question"], "yourAns": r["your_answer"],
        "correct": r["correct_answer"], "chapter": r["chapter"],
        "date": r["created_at"], "solution": r["solution"],
    }


# ---------- student gamification + quiz (Learning Hub) ----------

# A real logged-in student (edova-backend UUID) has no row here yet -- this
# table only ever had the one seeded demo student. Lazy-create on first GET
# (same idiom as _get_or_create_wiki below) instead of 404ing every real
# student out of their own Learning Hub. `name` comes from the real session,
# so a caller that doesn't have one (an id typed by hand, say) still 404s on
# an unknown id rather than silently minting blank students.
def _get_or_create_student(conn: PgWrapper, student_id: str, name: Optional[str]) -> dict:
    stu = conn.execute("SELECT * FROM clerk_students WHERE id=?", (student_id,)).fetchone()
    if stu:
        return stu
    if name is None:
        raise HTTPException(status_code=404, detail="student not found")
    conn.execute(
        "INSERT INTO clerk_students (id, name, xp, streak, last_activity) VALUES (?, ?, 0, 0, NULL) ON CONFLICT (id) DO NOTHING",
        (student_id, name),
    )
    return conn.execute("SELECT * FROM clerk_students WHERE id=?", (student_id,)).fetchone()


@app.get("/api/students/{student_id}/gamification")
def get_gamification(student_id: str, name: Optional[str] = None):
    with db() as conn:
        stu = _get_or_create_student(conn, student_id, name)
        rows = conn.execute(
            "SELECT * FROM clerk_student_mistakes WHERE student_id=?"
            " ORDER BY created_at DESC, id DESC", (student_id,)).fetchall()
        return {"student_id": stu["id"], "xp": stu["xp"], "streak": stu["streak"],
                "mistakes": [mistake_row(r) for r in rows]}


class XpIn(BaseModel):
    delta: int


@app.post("/api/students/{student_id}/xp")
def add_xp(student_id: str, body: XpIn):
    """Add XP and roll the daily streak: same day -> unchanged, yesterday ->
    +1, anything else (gap or first activity) -> reset to 1."""
    with db() as conn:
        stu = conn.execute("SELECT * FROM clerk_students WHERE id=?", (student_id,)).fetchone()
        if not stu:
            raise HTTPException(status_code=404, detail="student not found")
        today = date.today().isoformat()
        if stu["last_activity"] == today:
            streak = stu["streak"]
        elif stu["last_activity"] == (date.today() - timedelta(days=1)).isoformat():
            streak = stu["streak"] + 1
        else:
            streak = 1
        xp = stu["xp"] + body.delta
        conn.execute("UPDATE clerk_students SET xp=?, streak=?, last_activity=? WHERE id=?",
                     (xp, streak, today, student_id))
        return {"xp": xp, "streak": streak}


class MistakeIn(BaseModel):
    topic_id: Optional[str] = None
    q: str
    yourAns: str
    correct: str
    chapter: str
    solution: str


@app.post("/api/students/{student_id}/mistakes")
def add_mistake(student_id: str, body: MistakeIn):
    with db() as conn:
        stu = conn.execute("SELECT 1 FROM clerk_students WHERE id=?", (student_id,)).fetchone()
        if not stu:
            raise HTTPException(status_code=404, detail="student not found")
        mid = new_id("mis")
        conn.execute(
            "INSERT INTO student_mistakes"
            " (id, student_id, topic_id, chapter, question, your_answer, correct_answer, solution, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?)",
            (mid, student_id, body.topic_id, body.chapter, body.q, body.yourAns,
             body.correct, body.solution, date.today().isoformat()))
        return mistake_row(
            conn.execute("SELECT * FROM clerk_student_mistakes WHERE id=?", (mid,)).fetchone())


class FlagIn(BaseModel):
    context: str


@app.post("/api/students/{student_id}/flags")
def add_flag(student_id: str, body: FlagIn):
    with db() as conn:
        stu = conn.execute("SELECT 1 FROM clerk_students WHERE id=?", (student_id,)).fetchone()
        if not stu:
            raise HTTPException(status_code=404, detail="student not found")
        conn.execute(
            "INSERT INTO clerk_student_flags (id, student_id, context, created_at) VALUES (?,?,?,?)",
            (new_id("flg"), student_id, body.context, now_iso()))
        return {"status": "ok"}


@app.get("/api/learning/quiz")
def get_quiz(topic_id: str):
    """Quiz questions for a topic; empty list (not 404) when no quiz is
    seeded — the frontend hides the quiz on empty."""
    with db() as conn:
        row = conn.execute("SELECT * FROM clerk_quizzes WHERE topic_id=?", (topic_id,)).fetchone()
        return {"topic_id": topic_id,
                "questions": json.loads(row["questions"]) if row else []}


# ---------- student personal wiki (My Notes -> Saved to Wiki) ----------
#
# One wiki page per student, lazy-created on first GET. content_markdown is
# append-only: each save adds one "### [DD-MM-YYYY] Ch-N Chapter Name" block
# followed by the note text, never rewritten or edited in place — nothing
# else in the app edits markdown, so there is no update/delete path here.

MAX_NOTE_CHARS = 1000
# CBSE/India-only app — the note heading date is stamped in IST, not server
# UTC, so a save made between 00:00-05:30 IST doesn't land under yesterday.
IST = timezone(timedelta(hours=5, minutes=30))


def wiki_row(r: dict, truncated: Optional[bool] = None) -> dict:
    out = {"slug": r["slug"], "title": r["title"],
           "content_markdown": r["content_markdown"], "updated_at": r["updated_at"]}
    # Only meaningful right after a save — omitted (not just False) on every
    # other read so callers can tell "this response reports a save" apart
    # from "this wiki page happens to have no truncated notes".
    if truncated is not None:
        out["truncated"] = truncated
    return out


def _get_or_create_wiki(conn: PgWrapper, student_id: str, student_name: str) -> dict:
    row = conn.execute(
        "SELECT * FROM clerk_student_wiki_pages WHERE student_id=?", (student_id,)).fetchone()
    if row:
        return row
    ts = now_iso()
    conn.execute(
        "INSERT INTO student_wiki_pages"
        " (id, student_id, slug, title, content_markdown, created_at, updated_at)"
        " VALUES (?,?,?,?,?,?,?)"
        " ON CONFLICT (student_id) DO NOTHING",
        (new_id("wiki"), student_id, f"student-{student_id}",
         f"{student_name}'s Learning Wiki", "", ts, ts))
    return conn.execute(
        "SELECT * FROM clerk_student_wiki_pages WHERE student_id=?", (student_id,)).fetchone()


@app.get("/api/students/{student_id}/wiki")
def get_wiki(student_id: str, name: Optional[str] = None):
    with db() as conn:
        stu = _get_or_create_student(conn, student_id, name)
        return wiki_row(_get_or_create_wiki(conn, student_id, stu["name"]))


class WikiNoteIn(BaseModel):
    chapter_number: Optional[int] = None
    chapter_name: str
    note_text: str


@app.post("/api/students/{student_id}/wiki/notes")
def add_wiki_note(student_id: str, body: WikiNoteIn):
    text = body.note_text.strip()
    if not text:
        raise HTTPException(status_code=422, detail="note_text is required")
    truncated = len(text) > MAX_NOTE_CHARS
    text = text[:MAX_NOTE_CHARS]
    with db() as conn:
        stu = conn.execute("SELECT * FROM clerk_students WHERE id=?", (student_id,)).fetchone()
        if not stu:
            raise HTTPException(status_code=404, detail="student not found")
        _get_or_create_wiki(conn, student_id, stu["name"])
        nid = new_id("note")
        created = now_iso()
        conn.execute(
            "INSERT INTO student_chapter_notes"
            " (id, student_id, chapter_number, chapter_name, note_text, created_at)"
            " VALUES (?,?,?,?,?,?)",
            (nid, student_id, body.chapter_number, body.chapter_name, text, created))
        chapter_label = (f"Ch-{body.chapter_number} {body.chapter_name}"
                         if body.chapter_number is not None else body.chapter_name)
        block = (f"\n\n### [{datetime.now(IST).strftime('%d-%m-%Y')}] {chapter_label}\n"
                 f"{text}\n")
        conn.execute(
            "UPDATE clerk_student_wiki_pages SET content_markdown = content_markdown || ?,"
            " updated_at = ? WHERE student_id = ?",
            (block, created, student_id))
        row = conn.execute(
            "SELECT * FROM clerk_student_wiki_pages WHERE student_id=?", (student_id,)).fetchone()
        return wiki_row(row, truncated=truncated)


# ---------- teacher uploads (presign -> S3 PUT -> complete) ----------

def s3_client():
    return s3conn.get_client()


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
    topic_id: str = ""


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


def _refresh_manifest(s3) -> None:
    """Rebuild manifest.json from the current node files and push it to
    local disk + S3. Shared by anything that changes a node — a new upload,
    or a trust update from /verify — so the app's resource list reflects it
    immediately."""
    config = okf_ingest.load_config()
    manifest = okf_shelf.build_manifest(okf_shelf.collect_plan(config), config)
    manifest_path = THIRD_BRAIN / "okf-bundle" / "manifest" / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    s3.put_object(Bucket=S3_BUCKET, Key=f"{S3_PREFIX}/manifest.json",
                  Body=json.dumps(manifest, indent=2).encode("utf-8"),
                  ContentType="application/json")


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

    # A teacher chose subject/chapter/type themselves via the upload form
    # (no AI classifier involved here — that only runs in the separate
    # auto_ingest.py pipeline) so this starts already teacher_reviewed.
    result = okf_ingest.ingest(subject_slug, chapter_id, chapter_name, doc_type, local_path,
                               trust={"status": "teacher_reviewed", "reviewed_at": now_iso()},
                               topic_id=body.topic_id or None)
    doc_id = result["doc_id"]

    # Shelve at the SAME key s3_push would derive, so later pipeline runs see
    # this node as CURRENT instead of re-uploading it elsewhere.
    node_path = THIRD_BRAIN / "okf-bundle" / "nodes" / f"{doc_id}.md"
    node = okf_ingest.read_node(node_path)
    final_key = okf_shelf.derive_s3_key(node, S3_PREFIX, filename)
    s3.copy_object(Bucket=S3_BUCKET, Key=final_key,
                   CopySource={"Bucket": S3_BUCKET, "Key": body.staging_key})
    s3.delete_object(Bucket=S3_BUCKET, Key=body.staging_key)
    node["s3_key"] = final_key
    node["s3_uploaded_at"] = now_iso()
    okf_ingest.write_node(node_path, node)

    _refresh_manifest(s3)
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
    # getAssetUrl() percent-encodes the key itself; preview_s3_key must be
    # the literal object key (see s3_push.py's build_manifest for why).
    return {"doc_id": doc_id, "s3_key": final_key, "preview_s3_key": final_key}


@app.post("/api/resources/{doc_id}/verify")
def verify_resource(doc_id: str):
    """Teacher marks a resource as reviewed — the only way a resource
    reaches the top trust tier. Works for any resource regardless of how it
    was catalogued (teacher upload, already teacher_reviewed; or the
    auto_ingest.py pipeline's auto_classified guess)."""
    node_path = THIRD_BRAIN / "okf-bundle" / "nodes" / f"{doc_id}.md"
    if not node_path.exists():
        raise HTTPException(status_code=404, detail="resource not found")
    node = okf_ingest.read_node(node_path)
    node["trust"] = {"status": "teacher_reviewed", "reviewed_at": now_iso()}
    okf_ingest.write_node(node_path, node)
    _refresh_manifest(s3_client())
    return {"doc_id": doc_id, "trust": node["trust"]}


@app.get("/okf/graph")
def okf_graph():
    """Live OKF knowledge graph as JSON — subjects, chapters, documents with
    per-document shelf/index/list status, plus the syllabus topic tree joined
    to OKF chapters. Regenerated from the bundle on every call so it always
    reflects the latest uploads. Consumed natively by edova-web's
    Administration → Knowledge Graph page."""
    try:
        data = okf_dashboard.collect(OKF_BUNDLE)
        chapters = {(d["subject"], d["chapter_id"]): d["chapter_name"] for d in data["nodes"]}
        data["topics"] = okf_search.syllabus_topics(chapters)
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"could not build graph: {exc}")


@app.get("/okf/search")
def okf_search_view(q: str, limit: int = 12):
    """BM25 search across subjects, chapters, syllabus topics, and documents —
    one ranked list for the Knowledge Graph page's non-cascading search box.
    Short or empty queries return no matches, never an error."""
    try:
        return {"query": q, "matches": okf_search.search(OKF_BUNDLE, q, limit)}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"search failed: {exc}")


@app.get("/health")
def health():
    return {"status": "ok"}
