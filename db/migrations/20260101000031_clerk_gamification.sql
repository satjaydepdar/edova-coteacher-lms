-- SQL migration for clerk gamification and wikis

CREATE TABLE IF NOT EXISTS clerk_students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_activity TEXT
);

CREATE TABLE IF NOT EXISTS clerk_student_mistakes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES clerk_students(id) ON DELETE CASCADE,
  topic_id TEXT,
  chapter TEXT NOT NULL,
  question TEXT NOT NULL,
  your_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  solution TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clerk_student_flags (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES clerk_students(id) ON DELETE CASCADE,
  context TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clerk_quizzes (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  questions TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clerk_student_wiki_pages (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clerk_student_chapter_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  chapter_number INTEGER,
  chapter_name TEXT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TEXT NOT NULL
);
