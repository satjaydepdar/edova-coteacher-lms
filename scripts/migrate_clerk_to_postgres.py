#!/usr/bin/env python
"""Migrate the clerk's course-CRUD data from SQLite (ncert_rag/clerk/clerk.db)
into Postgres (DATABASE_URL from ncert_rag/config/settings.py).

The rag app (ncert_rag/api, :8000) now serves the clerk-compatible contract
from Postgres, so the data behind it moves too:

    clerk.db (SQLite)                 Postgres (db/migrations 0016-0019)
    academic_years                    academic_years        (key: year_label)
    curriculums                       curriculums           (key: year+board+class)
    subjects                          curriculum_subjects   (key: curriculum+subject_code)
    syllabus_units                    syllabus_units        (key: subject+s_no, else name)
    syllabus_chapters                 syllabus_chapters     (key: unit+number+name)
    syllabus_topics                   syllabus_topics       (key: chapter+title)
    lesson_plans                      saved_lesson_plans    (key: topic+class+subject+created_at)
    class_sections                    class_sections        (key: subject+section)
    section_topic_progress            section_topic_progress(key: section+topic)

Every row gets a NEW Postgres UUID (clerk's prefixed text ids can't be PG
UUID keys); the clerk-id -> PG-uuid mapping is written to
scripts/clerk_pg_id_map.json on --apply.

CRITICAL cross-store link: clerk keeps serving its gamification/quiz surface
from clerk.db, and quizzes.topic_id / student_mistakes.topic_id point at
syllabus topic ids. After the topics are migrated, --apply rewrites those
references in clerk.db to the new PG UUIDs so clerk's quiz lookup keeps
resolving topics by id.

Idempotent: rows are matched by natural key and reused on re-run, so a
second --apply inserts 0 new rows (and rewrites 0 clerk references).

Usage:
    python scripts/migrate_clerk_to_postgres.py           # dry-run: print the plan
    python scripts/migrate_clerk_to_postgres.py --apply   # write, then verify
"""

import argparse
import json
import sqlite3
import sys
import uuid
from datetime import date, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NCERT_RAG = REPO_ROOT / "ncert_rag"
sys.path.insert(0, str(NCERT_RAG))

import psycopg2  # noqa: E402

from config.settings import settings  # noqa: E402

CLERK_DB = NCERT_RAG / "clerk" / "clerk.db"
ID_MAP_PATH = REPO_ROOT / "scripts" / "clerk_pg_id_map.json"

# Migration order is FK order: parents before children.
ENTITIES = [
    "academic_years", "curriculums", "subjects", "syllabus_units",
    "syllabus_chapters", "syllabus_topics", "lesson_plans", "class_sections",
    "section_topic_progress",
]

# clerk table -> PG target table (only lesson_plans/subjects/section ids differ in name).
PG_TABLE = {
    "academic_years": "academic_years",
    "curriculums": "curriculums",
    "subjects": "curriculum_subjects",
    "syllabus_units": "syllabus_units",
    "syllabus_chapters": "syllabus_chapters",
    "syllabus_topics": "syllabus_topics",
    "lesson_plans": "saved_lesson_plans",
    "class_sections": "class_sections",
    "section_topic_progress": "section_topic_progress",
}


def _ts(value):
    """Parse a clerk ISO-8601 text timestamp; None when absent/unparseable."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


def _date(value):
    """Parse the clerk's 'YYYY-MM-DD' taught_on text; None when absent."""
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _json_obj(value, fallback):
    """Parse a clerk TEXT JSON column; fallback when absent/unparseable."""
    if not value:
        return fallback
    try:
        parsed = json.loads(value)
    except (TypeError, ValueError):
        return fallback
    return parsed if isinstance(parsed, type(fallback)) else fallback


class Migrator:
    def __init__(self, apply: bool):
        self.apply = apply
        self.sq = sqlite3.connect(CLERK_DB)
        self.sq.row_factory = sqlite3.Row
        self.pg = psycopg2.connect(settings.DATABASE_URL)
        self.id_map = {e: {} for e in ENTITIES}
        self.stats = {e: {"source": 0, "existing": 0, "inserted": 0} for e in ENTITIES}
        self.skipped = []  # (entity, clerk_id, reason)
        self.year_ids = {}  # year_label -> PG academic_years id

    # -- helpers -----------------------------------------------------------

    def _lookup(self, sql, params):
        with self.pg.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        return str(row[0]) if row else None

    def _insert(self, sql, params):
        with self.pg.cursor() as cur:
            cur.execute(sql, params)

    def _resolve(self, entity, clerk_id, lookup_sql, lookup_params,
                 insert_sql=None, insert_params=()):
        """Return the PG id (str) for a clerk row: reuse the natural-key
        match when it exists, else mint a new UUID and (on --apply) insert."""
        if clerk_id in self.id_map[entity]:
            return self.id_map[entity][clerk_id]
        pg_id = self._lookup(lookup_sql, lookup_params)
        if pg_id:
            self.stats[entity]["existing"] += 1
        else:
            pg_id = str(uuid.uuid4())
            if self.apply:
                self._insert(insert_sql, [pg_id, *insert_params])
            self.stats[entity]["inserted"] += 1
        self.id_map[entity][clerk_id] = pg_id
        return pg_id

    def _rows(self, entity, sql):
        rows = self.sq.execute(sql).fetchall()
        self.stats[entity]["source"] = len(rows)
        return rows

    # -- per-entity migrations (FK order) -----------------------------------

    def migrate_academic_years(self):
        for r in self._rows("academic_years",
                            "SELECT id, year_label FROM academic_years"):
            pg_id = self._resolve(
                "academic_years", r["id"],
                "SELECT id FROM academic_years WHERE year_label = %s",
                (r["year_label"],),
                "INSERT INTO academic_years (id, year_label) VALUES (%s, %s)",
                (r["year_label"],))
            self.year_ids[r["year_label"]] = pg_id

    def migrate_curriculums(self):
        for r in self._rows(
                "curriculums",
                "SELECT id, year_label, board, class_label, updated_at FROM curriculums"):
            year_id = self.year_ids.get(r["year_label"])
            if not year_id:
                self.skipped.append(("curriculums", r["id"],
                                     f"no academic year '{r['year_label']}'"))
                continue
            self._resolve(
                "curriculums", r["id"],
                "SELECT id FROM curriculums WHERE academic_year_id = %s "
                "AND board = %s AND class_label = %s",
                (year_id, r["board"], r["class_label"]),
                "INSERT INTO curriculums (id, academic_year_id, board, class_label, updated_at) "
                "VALUES (%s, %s, %s, %s, COALESCE(%s::timestamptz, NOW()))",
                (year_id, r["board"], r["class_label"], _ts(r["updated_at"])))

    def migrate_subjects(self):
        for r in self._rows(
                "subjects",
                "SELECT id, curriculum_id, s_no, subject_code, subject_name, subject_type,"
                " credits, total_marks, total_chapters, syllabus_json FROM subjects"):
            cur_id = self.id_map["curriculums"].get(r["curriculum_id"])
            if not cur_id:
                self.skipped.append(("subjects", r["id"], "curriculum not migrated"))
                continue
            subject_type = r["subject_type"] if r["subject_type"] in ("Core", "Elective") else "Core"
            self._resolve(
                "subjects", r["id"],
                "SELECT id FROM curriculum_subjects WHERE curriculum_id = %s AND subject_code = %s",
                (cur_id, r["subject_code"]),
                "INSERT INTO curriculum_subjects (id, curriculum_id, s_no, subject_code,"
                " subject_name, subject_type, credits, total_marks, total_chapters, syllabus_json)"
                " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (cur_id, r["s_no"], r["subject_code"], r["subject_name"], subject_type,
                 r["credits"] or 0, r["total_marks"], r["total_chapters"],
                 json.dumps(_json_obj(r["syllabus_json"], {}))))

    def migrate_syllabus_units(self):
        for r in self._rows(
                "syllabus_units",
                "SELECT id, subject_id, s_no, number, name, marks FROM syllabus_units"):
            subj_id = self.id_map["subjects"].get(r["subject_id"])
            if not subj_id:
                self.skipped.append(("syllabus_units", r["id"], "subject not migrated"))
                continue
            if r["s_no"] is not None:
                lookup_sql = ("SELECT id FROM syllabus_units "
                              "WHERE curriculum_subject_id = %s AND s_no = %s")
                lookup_params = (subj_id, r["s_no"])
            else:  # fall back to the name when the display order is missing
                lookup_sql = ("SELECT id FROM syllabus_units "
                              "WHERE curriculum_subject_id = %s AND name = %s")
                lookup_params = (subj_id, r["name"])
            self._resolve(
                "syllabus_units", r["id"], lookup_sql, lookup_params,
                "INSERT INTO syllabus_units (id, curriculum_subject_id, s_no, number, name, marks)"
                " VALUES (%s, %s, %s, %s, %s, %s)",
                (subj_id, r["s_no"], r["number"], r["name"], r["marks"]))

    def migrate_syllabus_chapters(self):
        for r in self._rows(
                "syllabus_chapters",
                "SELECT id, unit_id, s_no, number, name FROM syllabus_chapters"):
            unit_id = self.id_map["syllabus_units"].get(r["unit_id"])
            if not unit_id:
                self.skipped.append(("syllabus_chapters", r["id"], "unit not migrated"))
                continue
            self._resolve(
                "syllabus_chapters", r["id"],
                "SELECT id FROM syllabus_chapters WHERE unit_id = %s "
                "AND number IS NOT DISTINCT FROM %s AND name = %s",
                (unit_id, r["number"], r["name"]),
                "INSERT INTO syllabus_chapters (id, unit_id, s_no, number, name)"
                " VALUES (%s, %s, %s, %s, %s)",
                (unit_id, r["s_no"], r["number"], r["name"]))

    def migrate_syllabus_topics(self):
        for r in self._rows(
                "syllabus_topics",
                "SELECT id, chapter_id, s_no, title FROM syllabus_topics"):
            chapter_id = self.id_map["syllabus_chapters"].get(r["chapter_id"])
            if not chapter_id:
                self.skipped.append(("syllabus_topics", r["id"], "chapter not migrated"))
                continue
            self._resolve(
                "syllabus_topics", r["id"],
                "SELECT id FROM syllabus_topics WHERE chapter_id = %s AND title = %s",
                (chapter_id, r["title"]),
                "INSERT INTO syllabus_topics (id, chapter_id, s_no, title)"
                " VALUES (%s, %s, %s, %s)",
                (chapter_id, r["s_no"], r["title"]))

    def migrate_lesson_plans(self):
        for r in self._rows(
                "lesson_plans",
                "SELECT id, topic, class_label, section, subject, curriculum_subject_id,"
                " duration_minutes, standards, objective, materials, warmup, instruction,"
                " activity, assessment, homework, created_at FROM lesson_plans"):
            cs_id = (self.id_map["subjects"].get(r["curriculum_subject_id"])
                     if r["curriculum_subject_id"] else None)
            created = _ts(r["created_at"])
            if created is not None:
                lookup_sql = ("SELECT id FROM saved_lesson_plans WHERE topic = %s "
                              "AND class_label = %s AND subject = %s AND created_at = %s")
                lookup_params = (r["topic"], r["class_label"], r["subject"], created)
            else:  # unparseable timestamp: fall back to the stable part of the key
                lookup_sql = ("SELECT id FROM saved_lesson_plans WHERE topic = %s "
                              "AND class_label = %s AND subject = %s")
                lookup_params = (r["topic"], r["class_label"], r["subject"])
            duration = r["duration_minutes"]
            if not duration or duration <= 0:  # PG chk_slp_duration: must be > 0
                duration = 45
            self._resolve(
                "lesson_plans", r["id"], lookup_sql, lookup_params,
                "INSERT INTO saved_lesson_plans (id, topic, class_label, section, subject,"
                " curriculum_subject_id, duration_minutes, standards, objective, materials,"
                " warmup, instruction, activity, assessment, homework, created_at)"
                " VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,"
                " COALESCE(%s::timestamptz, NOW()))",
                (r["topic"], r["class_label"], r["section"], r["subject"], cs_id, duration,
                 json.dumps(_json_obj(r["standards"], [])), r["objective"] or "",
                 json.dumps(_json_obj(r["materials"], [])), r["warmup"] or "",
                 r["instruction"] or "", r["activity"] or "", r["assessment"] or "",
                 r["homework"] or "", created))

    def migrate_class_sections(self):
        for r in self._rows(
                "class_sections",
                "SELECT id, subject_id, section, teacher, created_at FROM class_sections"):
            subj_id = self.id_map["subjects"].get(r["subject_id"])
            if not subj_id:
                self.skipped.append(("class_sections", r["id"], "subject not migrated"))
                continue
            if not r["section"]:  # PG class_sections.section is NOT NULL
                self.skipped.append(("class_sections", r["id"], "NULL section name"))
                continue
            self._resolve(
                "class_sections", r["id"],
                "SELECT id FROM class_sections WHERE curriculum_subject_id = %s AND section = %s",
                (subj_id, r["section"]),
                "INSERT INTO class_sections (id, curriculum_subject_id, section, teacher, created_at)"
                " VALUES (%s, %s, %s, %s, COALESCE(%s::timestamptz, NOW()))",
                (subj_id, r["section"], r["teacher"], _ts(r["created_at"])))

    def migrate_section_topic_progress(self):
        for r in self._rows(
                "section_topic_progress",
                "SELECT id, section_id, topic_id, taught_on FROM section_topic_progress"):
            section_id = self.id_map["class_sections"].get(r["section_id"])
            topic_id = self.id_map["syllabus_topics"].get(r["topic_id"])
            if not section_id or not topic_id:
                self.skipped.append(("section_topic_progress", r["id"],
                                     "section or topic not migrated"))
                continue
            self._resolve(
                "section_topic_progress", r["id"],
                "SELECT id FROM section_topic_progress WHERE section_id = %s "
                "AND syllabus_topic_id = %s",
                (section_id, topic_id),
                "INSERT INTO section_topic_progress (id, section_id, syllabus_topic_id,"
                " done, taught_on) VALUES (%s, %s, %s, TRUE, %s)",
                (section_id, topic_id, _date(r["taught_on"])))

    # -- clerk.db cross-store relink ----------------------------------------

    def relink_clerk_references(self):
        """Rewrite clerk.db's quizzes.topic_id / student_mistakes.topic_id to
        the new PG UUIDs so clerk's quiz/gamification surface keeps resolving
        topics after the syllabus moved to Postgres."""
        report = {}
        for table in ("quizzes", "student_mistakes"):
            remapped, already, unresolved = 0, 0, 0
            rows = self.sq.execute(
                f"SELECT id, topic_id FROM {table} WHERE topic_id IS NOT NULL").fetchall()
            for r in rows:
                new_id = self.id_map["syllabus_topics"].get(r["topic_id"])
                if new_id and new_id != r["topic_id"]:
                    if self.apply:
                        self.sq.execute(f"UPDATE {table} SET topic_id = ? WHERE id = ?",
                                        (new_id, r["id"]))
                    remapped += 1
                elif new_id:
                    already += 1  # clerk id already mapped to the same PG id
                else:
                    # Not a clerk syllabus-topic id — either already a PG UUID
                    # from a previous run (verify below) or dangling.
                    if self._pg_topic_exists(r["topic_id"]):
                        already += 1
                    else:
                        unresolved += 1
            report[table] = {"rows": len(rows), "remapped": remapped,
                             "already_pg": already, "unresolved": unresolved}
        if self.apply:
            self.sq.commit()
        return report

    def _pg_topic_exists(self, topic_id) -> bool:
        try:
            uuid.UUID(str(topic_id))
        except (ValueError, AttributeError, TypeError):
            return False
        with self.pg.cursor() as cur:
            cur.execute("SELECT 1 FROM syllabus_topics WHERE id = %s", (str(topic_id),))
            return cur.fetchone() is not None

    # -- verification ---------------------------------------------------------

    def verify(self):
        """Per-table source/target counts; assert every clerk quizzes.topic_id
        resolves to a PG syllabus_topics id (the cross-store link)."""
        lines = []
        with self.pg.cursor() as cur:
            for entity in ENTITIES:
                cur.execute(f"SELECT COUNT(*) FROM {PG_TABLE[entity]}")
                target = cur.fetchone()[0]
                lines.append((entity, self.stats[entity]["source"], target))
        unresolved = []
        for r in self.sq.execute(
                "SELECT id, topic_id FROM quizzes WHERE topic_id IS NOT NULL").fetchall():
            if not self._pg_topic_exists(r["topic_id"]):
                unresolved.append((r["id"], r["topic_id"]))
        return lines, unresolved

    # -- driver ----------------------------------------------------------------

    def run(self):
        self.migrate_academic_years()
        self.migrate_curriculums()
        self.migrate_subjects()
        self.migrate_syllabus_units()
        self.migrate_syllabus_chapters()
        self.migrate_syllabus_topics()
        self.migrate_lesson_plans()
        self.migrate_class_sections()
        self.migrate_section_topic_progress()
        if self.apply:
            self.pg.commit()
        relink = self.relink_clerk_references()
        return relink

    def close(self):
        if not self.apply:
            self.pg.rollback()  # defensive: dry-run never writes
        self.pg.close()
        self.sq.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true",
                        help="write to Postgres + clerk.db (default: dry-run, prints the plan)")
    args = parser.parse_args()

    if not CLERK_DB.exists():
        print(f"ERROR: clerk.db not found at {CLERK_DB}", file=sys.stderr)
        return 2

    mode = "APPLY" if args.apply else "DRY-RUN (no writes)"
    print(f"clerk -> Postgres course-CRUD migration [{mode}]")
    print(f"  source: {CLERK_DB}")
    print(f"  target: {settings.DATABASE_URL.split('@')[-1]}\n")

    m = Migrator(apply=args.apply)
    try:
        relink = m.run()

        verb = "inserted" if args.apply else "would insert"
        print(f"{'table':<26}{'source':>8}{'already in PG':>15}{verb:>15}")
        for entity in ENTITIES:
            s = m.stats[entity]
            print(f"{PG_TABLE[entity]:<26}{s['source']:>8}{s['existing']:>15}{s['inserted']:>15}")

        if m.skipped:
            print(f"\nskipped {len(m.skipped)} row(s):")
            for entity, clerk_id, reason in m.skipped:
                print(f"  {entity} {clerk_id}: {reason}")

        print("\nclerk.db cross-store relink (quizzes / student_mistakes topic_id -> PG UUID):")
        for table, rep in relink.items():
            did = "remapped" if args.apply else "would remap"
            print(f"  {table}: {rep['rows']} row(s) with topic_id — "
                  f"{rep['remapped']} {did}, {rep['already_pg']} already resolve, "
                  f"{rep['unresolved']} unresolved")

        if args.apply:
            ID_MAP_PATH.write_text(json.dumps(m.id_map, indent=2), encoding="utf-8")
            print(f"\nid_map written to {ID_MAP_PATH}")

            lines, unresolved = m.verify()
            print("\nverification — source vs target row counts:")
            for entity, source, target in lines:
                flag = "" if target >= source else "  <-- TARGET < SOURCE"
                print(f"  {PG_TABLE[entity]:<26}clerk={source:<6}pg={target}{flag}")
            if unresolved:
                print(f"\nERROR: {len(unresolved)} clerk quizzes.topic_id value(s) "
                      "do not resolve to PG syllabus_topics:", file=sys.stderr)
                for quiz_id, topic_id in unresolved:
                    print(f"  quiz {quiz_id} -> {topic_id}", file=sys.stderr)
                return 1
            print("  every clerk quizzes.topic_id resolves to a PG syllabus_topics id: OK")
        else:
            print("\ndry-run only — re-run with --apply to write.")
    finally:
        m.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
