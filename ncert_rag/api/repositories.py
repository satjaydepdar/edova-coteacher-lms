"""
Repository layer for the embedded course-CRUD API.

Serves the clerk-compatible contract (ncert_rag/clerk/api.py is the semantic
reference — same paths, same get-or-create behaviors, same error codes and
detail messages, same field-for-field response shapes) from the Postgres
schema owned by db/migrations 0016-0020:

    clerk (SQLite)                    Postgres
    academic_years(s_no)              academic_years (no s_no — synthesized
                                      via ROW_NUMBER() OVER (ORDER BY year_label))
    curriculums(year_label inline)    curriculums.academic_year_id FK
    subjects                          curriculum_subjects
    syllabus_units/-chapters/-topics  syllabus_units/-chapters/-topics
    lesson_plans                      saved_lesson_plans (deleted_at soft-delete)
    class_sections.subject_id         class_sections.curriculum_subject_id
    section_topic_progress.topic_id   section_topic_progress.syllabus_topic_id

One repository class per domain. Every method owns its psycopg2 connection
via the module-level `_connect()` factory (no pooling yet). All raw SQL and
row -> DTO mappers live here; routers only see DTOs in and DTOs out.

The `get_*_repo()` factories are the FastAPI DI seam (`Depends(...)`) —
a later phase swaps them for fakes in tests.
"""

import json
import re
from typing import List, Optional

import psycopg2
from fastapi import HTTPException

from api.schemas import (
    AcademicYearOut,
    ClassSectionOut,
    CurriculumOut,
    DoneTopicOut,
    LessonPlanIn,
    LessonPlanOut,
    SectionProgressOut,
    SubjectIn,
    SubjectOut,
    SyllabusChapterOut,
    SyllabusIn,
    SyllabusOut,
    SyllabusTopicOut,
    SyllabusUnitOut,
    TopicTickOut,
)
from config.settings import settings


def _connect():
    """Single connection factory for the whole CRUD API — one fresh
    connection per repo call, exactly as the pre-extraction handlers did."""
    return psycopg2.connect(settings.DATABASE_URL)


# ============================================================
# CURRICULUM — Settings > Curriculum tab (edova-web)
# ============================================================

def _subject_row(r) -> SubjectOut:
    """Row layout: id, s_no, subject_code, subject_name, subject_type,
    credits, total_marks, total_chapters, syllabus_json."""
    return SubjectOut(
        id=str(r[0]), s_no=r[1], subject_code=r[2], subject_name=r[3],
        subject_type=r[4], credits=r[5], total_marks=r[6],
        total_chapters=r[7], syllabus_json=r[8] or {},
    )


_SUBJECT_COLUMNS = ("id, s_no, subject_code, subject_name, subject_type, "
                    "credits, total_marks, total_chapters, syllabus_json")


class CurriculumRepo:
    """Academic years, curriculum cards (get-or-create per year/board/class)
    and the subjects hanging off a curriculum."""

    def get_subject_name(self, subject_id: str) -> Optional[str]:
        """subject_name for a curriculum_subjects UUID, or None — the
        resources router's 404 check."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT subject_name FROM curriculum_subjects WHERE id = %s",
                    (subject_id,),
                )
                row = cur.fetchone()
                return row[0] if row else None
        finally:
            conn.close()

    def list_academic_years(self) -> List[AcademicYearOut]:
        # Clerk orders by its stored s_no; PG has no s_no column, so the
        # wire s_no is the 1-based position in year_label order.
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, ROW_NUMBER() OVER (ORDER BY year_label) AS s_no, year_label "
                    "FROM academic_years ORDER BY year_label"
                )
                return [AcademicYearOut(id=str(r[0]), s_no=r[1], year_label=r[2])
                        for r in cur.fetchall()]
        finally:
            conn.close()

    def list_curriculum_classes(self, year: str, board: str) -> List[str]:
        """Distinct classes that have a curriculum row for this year/board.
        Clerk's sort: non-'Class N' labels first (alphabetical), then the
        numbered classes numerically."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT DISTINCT c.class_label FROM curriculums c "
                    "JOIN academic_years ay ON ay.id = c.academic_year_id "
                    "WHERE ay.year_label = %s AND c.board = %s",
                    (year, board),
                )
                labels = [r[0] for r in cur.fetchall()]
        finally:
            conn.close()

        def sort_key(label: str):
            m = re.match(r"Class (\d+)", label)
            return (1, int(m.group(1))) if m else (0, label)

        return sorted(labels, key=sort_key)

    def get_or_create_curriculum(self, year: str, board: str, class_label: str) -> CurriculumOut:
        """Get-or-create so every year/board/class combo has a card. The year
        itself is also get-or-created (clerk carries year_label inline on the
        curriculum row, so an unseen label is never an error there)."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO academic_years (year_label) VALUES (%s) "
                    "ON CONFLICT (year_label) DO NOTHING",
                    (year,),
                )
                cur.execute("SELECT id FROM academic_years WHERE year_label = %s", (year,))
                year_id = cur.fetchone()[0]

                cur.execute(
                    """
                    INSERT INTO curriculums (academic_year_id, board, class_label)
                    VALUES (%s, %s, %s)
                    ON CONFLICT ON CONSTRAINT uq_curriculums_year_board_class DO NOTHING
                    RETURNING id, updated_at
                    """,
                    (year_id, board, class_label),
                )
                created = cur.fetchone()
                if created:
                    curriculum_id, updated_at = created
                else:
                    cur.execute(
                        "SELECT id, updated_at FROM curriculums "
                        "WHERE academic_year_id = %s AND board = %s AND class_label = %s",
                        (year_id, board, class_label),
                    )
                    curriculum_id, updated_at = cur.fetchone()

                cur.execute(
                    f"SELECT {_SUBJECT_COLUMNS} FROM curriculum_subjects "
                    "WHERE curriculum_id = %s ORDER BY s_no",
                    (curriculum_id,),
                )
                subjects = [_subject_row(r) for r in cur.fetchall()]
            conn.commit()
            return CurriculumOut(
                id=str(curriculum_id), year_label=year, board=board,
                class_label=class_label, updated_at=updated_at.isoformat(),
                subjects=subjects,
            )
        finally:
            conn.close()

    def add_subject(self, curriculum_id: str, req: SubjectIn) -> SubjectOut:
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM curriculums WHERE id = %s", (curriculum_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="curriculum not found")
                cur.execute(
                    "SELECT 1 FROM curriculum_subjects "
                    "WHERE curriculum_id = %s AND (subject_code = %s OR subject_name = %s)",
                    (curriculum_id, req.subject_code.strip(), req.subject_name.strip()),
                )
                if cur.fetchone():
                    raise HTTPException(
                        status_code=409,
                        detail="A subject with this code or name already exists")
                cur.execute(
                    "SELECT COALESCE(MAX(s_no), 0) + 1 FROM curriculum_subjects "
                    "WHERE curriculum_id = %s",
                    (curriculum_id,),
                )
                s_no = cur.fetchone()[0]
                cur.execute(
                    f"""
                    INSERT INTO curriculum_subjects
                        (curriculum_id, s_no, subject_code, subject_name, subject_type,
                         credits, total_marks, total_chapters, syllabus_json)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING {_SUBJECT_COLUMNS}
                    """,
                    (
                        curriculum_id, s_no, req.subject_code.strip(), req.subject_name.strip(),
                        req.subject_type, req.credits, req.total_marks, req.total_chapters,
                        json.dumps(req.syllabus_json),
                    ),
                )
                row = cur.fetchone()
                cur.execute(
                    "UPDATE curriculums SET updated_at = NOW() WHERE id = %s",
                    (curriculum_id,),
                )
            conn.commit()
            return _subject_row(row)
        finally:
            conn.close()

    def delete_subject(self, curriculum_id: str, subject_id: str) -> None:
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM curriculum_subjects WHERE id = %s AND curriculum_id = %s",
                    (subject_id, curriculum_id),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="subject not found")
                cur.execute(
                    "UPDATE curriculums SET updated_at = NOW() WHERE id = %s",
                    (curriculum_id,),
                )
            conn.commit()
        finally:
            conn.close()


# ============================================================
# SYLLABUS — Settings > Master Data tab (edova-web)
# Per-subject syllabus detail tree: units (marks) → chapters → topics
# (migration 0017 + 0020's unit number). One PUT replaces the whole tree
# atomically — the UI edits client-side and saves — then the flat
# curriculum_subjects summary (syllabus_json, total_chapters) is recomputed
# from the tree and the curriculum's updated_at bumped, so the Curriculum
# tab never drifts from the detail.
# ============================================================

def _load_syllabus_tree(cur, subject_id: str) -> SyllabusOut:
    cur.execute(
        "SELECT subject_name FROM curriculum_subjects WHERE id = %s", (subject_id,)
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="subject not found")
    subject_name = row[0]

    cur.execute(
        "SELECT id, s_no, number, name, marks FROM syllabus_units "
        "WHERE curriculum_subject_id = %s ORDER BY s_no",
        (subject_id,),
    )
    unit_rows = cur.fetchall()
    unit_ids = [str(r[0]) for r in unit_rows]

    chapter_rows = []
    if unit_ids:
        cur.execute(
            "SELECT id, unit_id, s_no, number, name FROM syllabus_chapters "
            "WHERE unit_id = ANY(%s::uuid[]) ORDER BY s_no",
            (unit_ids,),
        )
        chapter_rows = cur.fetchall()
    chapter_ids = [str(r[0]) for r in chapter_rows]

    topic_rows = []
    if chapter_ids:
        cur.execute(
            "SELECT id, chapter_id, s_no, title FROM syllabus_topics "
            "WHERE chapter_id = ANY(%s::uuid[]) ORDER BY s_no",
            (chapter_ids,),
        )
        topic_rows = cur.fetchall()

    topics_by_chapter: dict = {}
    for r in topic_rows:
        topics_by_chapter.setdefault(str(r[1]), []).append(
            SyllabusTopicOut(id=str(r[0]), s_no=r[2], title=r[3])
        )
    chapters_by_unit: dict = {}
    for r in chapter_rows:
        cid = str(r[0])
        chapters_by_unit.setdefault(str(r[1]), []).append(
            SyllabusChapterOut(
                id=cid, s_no=r[2], number=r[3], name=r[4],
                topics=topics_by_chapter.get(cid, []),
            )
        )
    units = [
        SyllabusUnitOut(
            id=str(r[0]), s_no=r[1], number=r[2], name=r[3], marks=r[4],
            chapters=chapters_by_unit.get(str(r[0]), []),
        )
        for r in unit_rows
    ]
    return SyllabusOut(subject_id=subject_id, subject_name=subject_name, units=units)


class SyllabusRepo:
    """Per-subject syllabus detail tree (units → chapters → topics)."""

    def get_syllabus(self, subject_id: str) -> SyllabusOut:
        conn = _connect()
        try:
            with conn.cursor() as cur:
                return _load_syllabus_tree(cur, subject_id)
        finally:
            conn.close()

    def put_syllabus(self, subject_id: str, req: SyllabusIn) -> SyllabusOut:
        """Atomic replace: drop the old tree (ON DELETE CASCADE takes the
        chapters and topics with it), write the new one, then recompute the
        Curriculum-tab summary from the saved tree."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT curriculum_id FROM curriculum_subjects WHERE id = %s",
                    (subject_id,),
                )
                row = cur.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="subject not found")
                curriculum_id = row[0]

                cur.execute(
                    "DELETE FROM syllabus_units WHERE curriculum_subject_id = %s",
                    (subject_id,),
                )
                for u_no, unit in enumerate(req.units, start=1):
                    cur.execute(
                        "INSERT INTO syllabus_units (curriculum_subject_id, s_no, number, name, marks) "
                        "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                        (subject_id, u_no, unit.number, unit.name, unit.marks),
                    )
                    unit_id = cur.fetchone()[0]
                    for c_no, ch in enumerate(unit.chapters, start=1):
                        cur.execute(
                            "INSERT INTO syllabus_chapters (unit_id, s_no, number, name) "
                            "VALUES (%s, %s, %s, %s) RETURNING id",
                            (unit_id, c_no, ch.number, ch.name),
                        )
                        chapter_id = cur.fetchone()[0]
                        for t_no, title in enumerate(ch.topics, start=1):
                            cur.execute(
                                "INSERT INTO syllabus_topics (chapter_id, s_no, title) "
                                "VALUES (%s, %s, %s)",
                                (chapter_id, t_no, title),
                            )

                # Recompute the Curriculum tab's summary from the saved tree.
                syllabus_json = {u.name: (u.marks or 0) for u in req.units}
                total_chapters = sum(len(u.chapters) for u in req.units)
                cur.execute(
                    "UPDATE curriculum_subjects SET syllabus_json = %s, total_chapters = %s "
                    "WHERE id = %s",
                    (json.dumps(syllabus_json), total_chapters, subject_id),
                )
                cur.execute(
                    "UPDATE curriculums SET updated_at = NOW() WHERE id = %s",
                    (curriculum_id,),
                )
                tree = _load_syllabus_tree(cur, subject_id)
            conn.commit()
            return tree
        finally:
            conn.close()


# ============================================================
# SAVED LESSON PLANS — Lesson Planner > AI Generator > "Save to My Plans"
# (edova-web). Persists the full generated draft so the teacher's library
# survives reload and a saved plan can be re-opened in full (migration 0018).
# Authless like the rest of this API today — plans are not yet scoped to a
# teacher; that waits on the auth layer (see app module docstring).
# ============================================================

# Column order shared by the INSERT ... RETURNING and the list SELECT so the
# row-tuple unpacking in _lesson_plan_row stays in lockstep with both.
_PLAN_COLUMNS = (
    "id, topic, title, class_label, section, subject, curriculum_subject_id, "
    "duration_minutes, standards, materials, objective, outcomes, warmup, "
    "instruction, activity, assessment, homework, created_at"
)


def _lesson_plan_row(r) -> LessonPlanOut:
    return LessonPlanOut(
        id=str(r[0]), topic=r[1], title=r[2], class_label=r[3], section=r[4], subject=r[5],
        curriculum_subject_id=str(r[6]) if r[6] else None,
        duration_minutes=r[7], standards=r[8] or [], materials=r[9] or [],
        objective=r[10], outcomes=r[11] or [], warmup=r[12], instruction=r[13],
        activity=r[14], assessment=r[15], homework=r[16], created_at=r[17].isoformat(),
    )


class LessonPlanRepo:
    """Saved lesson plans (the teacher's library of generated drafts)."""

    def list_plans(self) -> List[LessonPlanOut]:
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"SELECT {_PLAN_COLUMNS} FROM saved_lesson_plans "
                    "WHERE deleted_at IS NULL ORDER BY created_at DESC"
                )
                return [_lesson_plan_row(r) for r in cur.fetchall()]
        finally:
            conn.close()

    def save_plan(self, req: LessonPlanIn) -> LessonPlanOut:
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    INSERT INTO saved_lesson_plans
                        (topic, title, class_label, section, subject, curriculum_subject_id,
                         duration_minutes, standards, materials, objective, outcomes, warmup,
                         instruction, activity, assessment, homework)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING {_PLAN_COLUMNS}
                    """,
                    (
                        req.topic.strip(), req.title.strip() or req.topic.strip(),
                        req.class_label, req.section, req.subject,
                        req.curriculum_subject_id or None, req.duration_minutes,
                        json.dumps(req.standards), json.dumps(req.materials),
                        req.objective, json.dumps(req.outcomes), req.warmup,
                        req.instruction, req.activity, req.assessment, req.homework,
                    ),
                )
                row = cur.fetchone()
                plan = _lesson_plan_row(row)
                bloom_levels = [b.strip() for b in req.bloom_levels if b and b.strip()]
                if bloom_levels:
                    cur.executemany(
                        "INSERT INTO lesson_plan_bloom_levels (lesson_plan_id, level) "
                        "VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        [(plan.id, level) for level in bloom_levels],
                    )
            conn.commit()
            plan.bloom_levels = bloom_levels
            return plan
        except psycopg2.errors.ForeignKeyViolation:
            conn.rollback()
            raise HTTPException(status_code=404, detail="unknown curriculum_subject_id")
        finally:
            conn.close()

    def update_plan(self, plan_id: str, req: LessonPlanIn) -> LessonPlanOut:
        """Full-record replace (PUT), same shape as save_plan's INSERT. Bloom
        levels aren't touched here — they aren't read back into the edit form
        yet (see LessonPlanner.tsx), so overwriting them on every save would
        silently drop whatever was set at creation time."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    UPDATE saved_lesson_plans SET
                        topic = %s, title = %s, class_label = %s, section = %s, subject = %s,
                        curriculum_subject_id = %s, duration_minutes = %s, standards = %s,
                        materials = %s, objective = %s, outcomes = %s, warmup = %s,
                        instruction = %s, activity = %s, assessment = %s, homework = %s
                    WHERE id = %s AND deleted_at IS NULL
                    RETURNING {_PLAN_COLUMNS}
                    """,
                    (
                        req.topic.strip(), req.title.strip() or req.topic.strip(),
                        req.class_label, req.section, req.subject,
                        req.curriculum_subject_id or None, req.duration_minutes,
                        json.dumps(req.standards), json.dumps(req.materials),
                        req.objective, json.dumps(req.outcomes), req.warmup,
                        req.instruction, req.activity, req.assessment, req.homework,
                        plan_id,
                    ),
                )
                row = cur.fetchone()
                if row is None:
                    raise HTTPException(status_code=404, detail="lesson plan not found")
                conn.commit()
                return _lesson_plan_row(row)
        except psycopg2.errors.ForeignKeyViolation:
            conn.rollback()
            raise HTTPException(status_code=404, detail="unknown curriculum_subject_id")
        finally:
            conn.close()

    def delete_plan(self, plan_id: str) -> None:
        """Soft-delete (deleted_at), matching the schema's convention — a
        removed plan stays recoverable and out of the library list."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE saved_lesson_plans SET deleted_at = NOW() "
                    "WHERE id = %s AND deleted_at IS NULL",
                    (plan_id,),
                )
                if cur.rowcount == 0:
                    raise HTTPException(status_code=404, detail="lesson plan not found")
            conn.commit()
        finally:
            conn.close()


# ============================================================
# CLASS SECTIONS + PER-TOPIC PROGRESS (edova-web: Lesson Planner "This Week",
# Syllabus Map, Settings > Syllabus tab). Migration 0019.
#
# A class_sections row is one section studying one subject ("Class 10 —
# Section A · Mathematics"). It tracks its own taught-topic ticks against the
# shared master syllabus tree: a row present in section_topic_progress means
# taught; un-ticking deletes the row (sparse). Authless for now — no
# per-teacher scoping (see app module docstring).
# ============================================================

class ClassSectionsRepo:
    """Class sections (get-or-create per year/board/class/subject) and their
    taught-topic ticks."""

    def list_section_names(self, year: str, board: str, class_label: str) -> List[str]:
        """Distinct sections for a class across all its subjects — a section
        spans every subject it studies, so this ignores subject."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT DISTINCT cs.section FROM class_sections cs "
                    "JOIN curriculum_subjects s ON cs.curriculum_subject_id = s.id "
                    "JOIN curriculums c ON s.curriculum_id = c.id "
                    "JOIN academic_years ay ON ay.id = c.academic_year_id "
                    "WHERE ay.year_label = %s AND c.board = %s AND c.class_label = %s "
                    "AND cs.deleted_at IS NULL "
                    "ORDER BY cs.section",
                    (year, board, class_label),
                )
                return [r[0] for r in cur.fetchall()]
        finally:
            conn.close()

    def get_or_create_section(self, year: str, subject: str, board: str,
                              class_label: str, section: str) -> ClassSectionOut:
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT s.id, s.subject_name FROM curriculum_subjects s "
                    "JOIN curriculums c ON s.curriculum_id = c.id "
                    "JOIN academic_years ay ON ay.id = c.academic_year_id "
                    "WHERE ay.year_label = %s AND c.board = %s AND c.class_label = %s "
                    "AND s.subject_name = %s",
                    (year, board, class_label, subject),
                )
                subj = cur.fetchone()
                if not subj:
                    raise HTTPException(
                        status_code=404,
                        detail=f"no {subject} curriculum for {class_label} {year}")
                subject_id, subject_name = subj

                cur.execute(
                    "SELECT id, section, deleted_at FROM class_sections "
                    "WHERE curriculum_subject_id = %s AND section = %s",
                    (subject_id, section),
                )
                row = cur.fetchone()
                if row and row[2] is not None:
                    # A soft-deleted row still holds the unique key — revive
                    # it instead of erroring (clerk has no deleted_at, so
                    # re-asking for the section just works).
                    cur.execute(
                        "UPDATE class_sections SET deleted_at = NULL WHERE id = %s",
                        (row[0],),
                    )
                elif not row:
                    cur.execute(
                        "INSERT INTO class_sections (curriculum_subject_id, section, teacher) "
                        "VALUES (%s, %s, %s) RETURNING id, section",
                        (subject_id, section, None),
                    )
                    row = cur.fetchone()
            conn.commit()
            return ClassSectionOut(
                id=str(row[0]), section=row[1], subject_id=str(subject_id),
                subject_name=subject_name, class_label=class_label, year_label=year,
            )
        finally:
            conn.close()

    def get_progress(self, section_id: str) -> SectionProgressOut:
        """The section's taught-topic ticks: topic ids + when they were taught."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT curriculum_subject_id FROM class_sections "
                    "WHERE id = %s AND deleted_at IS NULL",
                    (section_id,),
                )
                sec = cur.fetchone()
                if not sec:
                    raise HTTPException(status_code=404, detail="section not found")
                cur.execute(
                    "SELECT syllabus_topic_id, taught_on FROM section_topic_progress "
                    "WHERE section_id = %s",
                    (section_id,),
                )
                done = [
                    DoneTopicOut(topic_id=str(r[0]),
                                 taught_on=r[1].isoformat() if r[1] is not None else None)
                    for r in cur.fetchall()
                ]
            return SectionProgressOut(
                section_id=section_id, subject_id=str(sec[0]), done_topics=done)
        finally:
            conn.close()

    def tick_topic(self, section_id: str, topic_id: str, done: bool,
                   taught_on: Optional[str]) -> TopicTickOut:
        """Tick/untick a taught topic. A row present means taught; unticking
        deletes the row (sparse)."""
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM class_sections WHERE id = %s AND deleted_at IS NULL",
                    (section_id,),
                )
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="section not found")
                cur.execute("SELECT 1 FROM syllabus_topics WHERE id = %s", (topic_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="topic not found")
                if done:
                    if taught_on:
                        cur.execute(
                            "INSERT INTO section_topic_progress "
                            "    (section_id, syllabus_topic_id, done, taught_on) "
                            "VALUES (%s, %s, TRUE, %s) "
                            "ON CONFLICT (section_id, syllabus_topic_id) "
                            "DO UPDATE SET done = TRUE, taught_on = EXCLUDED.taught_on",
                            (section_id, topic_id, taught_on),
                        )
                    else:
                        cur.execute(
                            "INSERT INTO section_topic_progress "
                            "    (section_id, syllabus_topic_id, done, taught_on) "
                            "VALUES (%s, %s, TRUE, CURRENT_DATE) "
                            "ON CONFLICT (section_id, syllabus_topic_id) "
                            "DO UPDATE SET done = TRUE, taught_on = CURRENT_DATE",
                            (section_id, topic_id),
                        )
                else:
                    cur.execute(
                        "DELETE FROM section_topic_progress "
                        "WHERE section_id = %s AND syllabus_topic_id = %s",
                        (section_id, topic_id),
                    )
            conn.commit()
            return TopicTickOut(section_id=section_id, topic_id=topic_id, done=done)
        finally:
            conn.close()


# ---------------------------------------------------------------- DI seam
# Repo factories for FastAPI Depends — a later phase overrides these with
# fakes in tests.

def get_curriculum_repo() -> CurriculumRepo:
    return CurriculumRepo()


def get_syllabus_repo() -> SyllabusRepo:
    return SyllabusRepo()


def get_lesson_plan_repo() -> LessonPlanRepo:
    return LessonPlanRepo()


def get_class_sections_repo() -> ClassSectionsRepo:
    return ClassSectionsRepo()
