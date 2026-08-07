import sqlite3
import psycopg2
import sys
import uuid
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
NCERT_RAG = REPO_ROOT / "ncert_rag"
sys.path.insert(0, str(NCERT_RAG))
from config.settings import settings

CLERK_DB = NCERT_RAG / "clerk" / "clerk.db"

PG_SCHEMA = """
CREATE TABLE IF NOT EXISTS clerk_students (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0, last_activity TEXT
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
  id TEXT PRIMARY KEY, topic_id TEXT NOT NULL,
  questions TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clerk_student_wiki_pages (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL, content_markdown TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS clerk_student_chapter_notes (
  id TEXT PRIMARY KEY, student_id TEXT NOT NULL,
  chapter_number INTEGER, chapter_name TEXT NOT NULL,
  note_text TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS vec_chunks (
    rowid SERIAL PRIMARY KEY,
    text TEXT,
    metadata TEXT,
    embedding vector(3072)
);
"""

def setup_pg():
    conn = psycopg2.connect(settings.DATABASE_URL)
    with conn.cursor() as cur:
        cur.execute(PG_SCHEMA)
    conn.commit()
    conn.close()

def migrate_table(sq, pg, sq_table_name, pg_table_name, columns):
    sq_cursor = sq.cursor()
    sq_cursor.execute(f"SELECT {', '.join(columns)} FROM {sq_table_name}")
    rows = sq_cursor.fetchall()
    
    pg_cursor = pg.cursor()
    placeholders = ", ".join(["%s"] * len(columns))
    
    # Exclude conflict update for primary key
    update_cols = [c for c in columns if c != 'id']
    if update_cols:
        updates = ", ".join([f"{c} = EXCLUDED.{c}" for c in update_cols])
        conflict = f"ON CONFLICT (id) DO UPDATE SET {updates}"
    else:
        conflict = "ON CONFLICT DO NOTHING"
        
    insert_sql = f"INSERT INTO {pg_table_name} ({', '.join(columns)}) VALUES ({placeholders}) {conflict}"
    
    for row in rows:
        pg_cursor.execute(insert_sql, row)
        
    print(f"Migrated {len(rows)} rows from {sq_table_name} to {pg_table_name}")

def main():
    setup_pg()
    sq = sqlite3.connect(CLERK_DB)
    pg = psycopg2.connect(settings.DATABASE_URL)
    
    tables = [
        ("students", "clerk_students", ["id", "name", "xp", "streak", "last_activity"]),
        ("student_mistakes", "clerk_student_mistakes", ["id", "student_id", "topic_id", "chapter", "question", "your_answer", "correct_answer", "solution", "created_at"]),
        ("student_flags", "clerk_student_flags", ["id", "student_id", "context", "created_at"]),
        ("quizzes", "clerk_quizzes", ["id", "topic_id", "questions"]),
        ("student_wiki_pages", "clerk_student_wiki_pages", ["id", "student_id", "slug", "title", "content_markdown", "created_at", "updated_at"]),
        ("student_chapter_notes", "clerk_student_chapter_notes", ["id", "student_id", "chapter_number", "chapter_name", "note_text", "created_at"])
    ]
    
    for sq_table, pg_table, cols in tables:
        migrate_table(sq, pg, sq_table, pg_table, cols)
        
    pg.commit()
    sq.close()
    pg.close()
    print("Migration completed.")

if __name__ == "__main__":
    main()
