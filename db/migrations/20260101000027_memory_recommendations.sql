-- Up Migration

-- Behavioral memory layer (rule-based v1 — no LLM in the loop).
--
-- memory_events: append-only record of significant user actions. The
-- frontend dual-writes here alongside the clerk API (quiz mistakes, wiki
-- notes) — fire-and-forget, so memory capture never blocks the action
-- itself. user_id is TEXT (not a students.id FK) because identity is still
-- split between edova-backend UUIDs and clerk text ids ('stu_demo'); the FK
-- lands with the clerk→Postgres identity migration.
--
-- recommendations: proactive cards derived from memory_events by rules in
-- ncert_rag/api/routers/memory.py, generated lazily on read and upserted by
-- dedupe_key so a dismissed card never resurrects. The rule outputs are
-- stored (not recomputed per render) so students/teachers can see and
-- dismiss them — the "memory dashboard" seam.

CREATE TABLE memory_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     TEXT NOT NULL,                  -- clerk id or backend UUID, as text
    role        VARCHAR(20) NOT NULL,           -- 'student' | 'teacher'
    event_type  VARCHAR(50) NOT NULL,           -- 'quiz_mistake' | 'note_saved' | …
    chapter     VARCHAR(255),                   -- display name, e.g. 'Light — Reflection and Refraction'
    topic_id    TEXT,                           -- clerk syllabus topic id when known
    subject     VARCHAR(120),
    payload     JSONB NOT NULL DEFAULT '{}',    -- event-specific extras (question id, note length, …)
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_memory_events_role CHECK (role IN ('student', 'teacher'))
);

CREATE INDEX idx_memory_events_user ON memory_events(user_id, created_at DESC);
CREATE INDEX idx_memory_events_type_chapter ON memory_events(event_type, chapter, created_at DESC);

CREATE TABLE recommendations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     TEXT NOT NULL,
    role        VARCHAR(20) NOT NULL,
    kind        VARCHAR(50) NOT NULL,           -- 'struggle_remedial' | 'class_struggle_digest'
    title       VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    cta_label   VARCHAR(120) NOT NULL,
    cta_url     VARCHAR(500) NOT NULL,          -- in-app route, e.g. '/learning'
    chapter     VARCHAR(255),
    dedupe_key  TEXT NOT NULL UNIQUE,           -- '{user_id}:{kind}:{chapter}'
    status      VARCHAR(20) NOT NULL DEFAULT 'new',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seen_at     TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,

    CONSTRAINT chk_recommendations_role CHECK (role IN ('student', 'teacher')),
    CONSTRAINT chk_recommendations_status CHECK (status IN ('new', 'seen', 'dismissed'))
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id, status, created_at DESC);

-- Recommendations are read/updated by the acting user and written by the
-- rule engine; open to app_role like saved_lesson_plans until auth scoping lands.
ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_events_select ON memory_events FOR SELECT TO app_role USING (TRUE);
CREATE POLICY memory_events_insert ON memory_events FOR INSERT TO app_role WITH CHECK (TRUE);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY recommendations_select ON recommendations FOR SELECT TO app_role USING (TRUE);
CREATE POLICY recommendations_insert ON recommendations FOR INSERT TO app_role WITH CHECK (TRUE);
CREATE POLICY recommendations_update ON recommendations FOR UPDATE TO app_role USING (TRUE);

-- Down Migration

DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS memory_events;
