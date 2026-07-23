#!/usr/bin/env python
"""Seed Settings > Master Data from instructions/math-chapters.xlsx.

Loads the CBSE Class 10 Mathematics sheet (Unit Name / Unit Marks /
Chapter Number and Name / Topic Titles) into the syllabus detail tables
(migration 0017): syllabus_units -> syllabus_chapters -> syllabus_topics.

Idempotent: the subject's existing syllabus tree is wiped and re-inserted.
Also refreshes the flat curriculum_subjects summary (syllabus_json,
total_chapters) exactly like the API's PUT endpoint does.

Usage:
    cd db && python seed_master_syllabus.py
    # override anything via env: SEED_YEAR / SEED_BOARD / SEED_CLASS /
    # SEED_SUBJECT_NAME / SEED_SUBJECT_CODE / SEED_XLSX / DATABASE_URL
"""

import json
import os
import re
import sys
from pathlib import Path

import openpyxl
import psycopg2

DB_DIR = Path(__file__).resolve().parent
DEFAULT_XLSX = DB_DIR.parent / "instructions" / "math-chapters.xlsx"

YEAR = os.environ.get("SEED_YEAR", "2025-26")
BOARD = os.environ.get("SEED_BOARD", "CBSE")
CLASS_LABEL = os.environ.get("SEED_CLASS", "Class 10")
SUBJECT_NAME = os.environ.get("SEED_SUBJECT_NAME", "Mathematics")
SUBJECT_CODE = os.environ.get("SEED_SUBJECT_CODE", "041")
XLSX = Path(os.environ.get("SEED_XLSX", str(DEFAULT_XLSX)))


def load_database_url() -> str:
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env_file = DB_DIR / ".env"
    for line in env_file.read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    sys.exit("DATABASE_URL not set and not found in db/.env")


def parse_sheet(path: Path):
    """Return [{name, marks, chapters: [{number, name, topics: [...]}]}]."""
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.worksheets[0]
    units = []
    for unit_name, unit_marks, chapter, topics in ws.iter_rows(min_row=2, values_only=True):
        if not chapter:
            continue
        m = re.match(r"\s*Chapter\s+(\d+)\s*:\s*(.+?)\s*$", str(chapter))
        if m:
            number, ch_name = int(m.group(1)), m.group(2)
        else:  # board doesn't number chapters — keep the whole string as the name
            number, ch_name = None, str(chapter).strip()
        # topics: "1. Foo, 2. Bar (with, commas)" -> split only before "N. "
        topic_list = [
            re.sub(r"^\d+\.\s*", "", part).strip()
            for part in re.split(r",\s*(?=\d+\.\s)", str(topics or ""))
            if part and part.strip()
        ]
        unit_name = str(unit_name).strip()
        if not units or units[-1]["name"] != unit_name:
            units.append({"name": unit_name, "marks": int(unit_marks) if unit_marks is not None else None, "chapters": []})
        units[-1]["chapters"].append({"number": number, "name": ch_name, "topics": topic_list})
    return units


def main() -> None:
    units = parse_sheet(XLSX)
    conn = psycopg2.connect(load_database_url())
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM academic_years WHERE year_label = %s", (YEAR,))
            row = cur.fetchone()
            if not row:
                sys.exit(f"academic year '{YEAR}' not found — run migrations first")
            year_id = row[0]

            cur.execute(
                """
                INSERT INTO curriculums (academic_year_id, board, class_label)
                VALUES (%s, %s, %s)
                ON CONFLICT ON CONSTRAINT uq_curriculums_year_board_class
                DO UPDATE SET board = EXCLUDED.board
                RETURNING id
                """,
                (year_id, BOARD, CLASS_LABEL),
            )
            curriculum_id = cur.fetchone()[0]

            total_marks = sum(u["marks"] or 0 for u in units) or None
            total_chapters = sum(len(u["chapters"]) for u in units)
            cur.execute(
                """
                INSERT INTO curriculum_subjects
                    (curriculum_id, subject_code, subject_name, total_marks, total_chapters)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT ON CONSTRAINT uq_curriculum_subject_code
                DO UPDATE SET subject_name = EXCLUDED.subject_name,
                              total_marks = EXCLUDED.total_marks,
                              total_chapters = EXCLUDED.total_chapters
                RETURNING id
                """,
                (curriculum_id, SUBJECT_CODE, SUBJECT_NAME, total_marks, total_chapters),
            )
            subject_id = cur.fetchone()[0]

            cur.execute("DELETE FROM syllabus_units WHERE curriculum_subject_id = %s", (subject_id,))
            for ui, unit in enumerate(units, start=1):
                cur.execute(
                    "INSERT INTO syllabus_units (curriculum_subject_id, s_no, number, name, marks) "
                    "VALUES (%s, %s, %s, %s, %s) RETURNING id",
                    (subject_id, ui, ui, unit["name"], unit["marks"]),
                )
                unit_id = cur.fetchone()[0]
                for ci, ch in enumerate(unit["chapters"], start=1):
                    cur.execute(
                        "INSERT INTO syllabus_chapters (unit_id, s_no, number, name) "
                        "VALUES (%s, %s, %s, %s) RETURNING id",
                        (unit_id, ci, ch["number"], ch["name"]),
                    )
                    chapter_id = cur.fetchone()[0]
                    for ti, title in enumerate(ch["topics"], start=1):
                        cur.execute(
                            "INSERT INTO syllabus_topics (chapter_id, s_no, title) VALUES (%s, %s, %s)",
                            (chapter_id, ti, title),
                        )

            syllabus_json = {u["name"]: (u["marks"] or 0) for u in units}
            cur.execute(
                "UPDATE curriculum_subjects SET syllabus_json = %s, total_chapters = %s WHERE id = %s",
                (json.dumps(syllabus_json), total_chapters, subject_id),
            )
        conn.commit()
    finally:
        conn.close()

    n_topics = sum(len(c["topics"]) for u in units for c in u["chapters"])
    print(f"Seeded {BOARD} / {CLASS_LABEL} / {SUBJECT_NAME} ({YEAR}): "
          f"{len(units)} units, {sum(len(u['chapters']) for u in units)} chapters, {n_topics} topics")


if __name__ == "__main__":
    main()
