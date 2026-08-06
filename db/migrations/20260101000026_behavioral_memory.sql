-- Up Migration

-- ============================================================
-- BEHAVIORAL MEMORY — the tables ncert_rag/api/routers/memory.py has been
-- querying since it was written. That router shipped without its migration:
-- every call to /api/memory/* raised "relation memory_events does not
-- exist". This adds the schema it expects, unchanged in shape.
--
-- Design (from the router's own docstring): events are an append-only log of
-- observed behaviour; recommendations are DERIVED from that log on read and
-- upserted by dedupe_key. Mastery/struggle is never stored as a mutable
-- profile blob — it stays a function of recorded events, so it is auditable
-- and can be recomputed if the rules change.
-- ============================================================

CREATE TABLE memory_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    event_type      VARCHAR(50) NOT NULL,   -- quiz_mistake, topic_viewed, ...
    chapter         VARCHAR(255),
    topic_id        UUID,
    subject         VARCHAR(100),
    payload         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_memory_events_role CHECK (role IN ('student', 'teacher'))
);

-- The struggle rules scan by (user, chapter) inside a rolling window, so the
-- index leads with those and carries created_at for the range scan.
CREATE INDEX idx_memory_events_user_chapter ON memory_events(user_id, chapter, created_at DESC);
CREATE INDEX idx_memory_events_type ON memory_events(event_type, created_at DESC);

CREATE TABLE recommendations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,
    rec_type        VARCHAR(50) NOT NULL,   -- struggle_remedial, class_struggle_digest
    -- Stable identity for "this same advice about this same thing", so a
    -- regenerated recommendation updates its row instead of stacking up —
    -- and a dismissed one never comes back.
    dedupe_key      VARCHAR(255) NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    cta_label       VARCHAR(100),
    cta_url         VARCHAR(255),
    chapter         VARCHAR(255),
    subject         VARCHAR(100),
    payload         JSONB NOT NULL DEFAULT '{}',
    seen_at         TIMESTAMPTZ,
    dismissed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_recommendations_role CHECK (role IN ('student', 'teacher')),
    CONSTRAINT uq_recommendations_dedupe UNIQUE (user_id, dedupe_key)
);

CREATE INDEX idx_recommendations_open ON recommendations(user_id, role)
    WHERE dismissed_at IS NULL;

CREATE TRIGGER update_recommendations_updated_at BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Down Migration

DROP TABLE IF EXISTS recommendations;
DROP TABLE IF EXISTS memory_events;
