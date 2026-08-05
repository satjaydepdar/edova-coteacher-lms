-- Up Migration

-- ============================================================
-- PGVECTOR EXTENSION (REMOVED FOR LOCAL SETUP)
-- ============================================================
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- KNOWLEDGE CHUNKS — global reference knowledge (NCERT textbook corpus,
-- OKF library). No school-scoping column: this is shared reference
-- material, not this school's private content. Formalizes ncert_rag's
-- standalone ncert_documents table (previously in its own ncert_db
-- database, SERIAL PK, ivfflat index) into the main schema with a UUID PK
-- (consistent with every other table here) and an HNSW index (no
-- training-set-size dependency, better recall than ivfflat at this corpus
-- size — see the architecture review for the reasoning).
-- ============================================================
CREATE TABLE knowledge_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type     VARCHAR(30) NOT NULL,            -- ncert_textbook / okf_library
    source_ref      VARCHAR(255),                    -- doc_id, chapter code, etc.
    curriculum_unit_id UUID REFERENCES curriculum_units(id) ON DELETE SET NULL,
    page_number     INT,
    content         TEXT NOT NULL,
    embedding       JSONB,                           -- fallback for local setup
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_knowledge_source_type CHECK (source_type IN ('ncert_textbook', 'okf_library'))
);

-- HNSW index removed for local JSONB fallback
CREATE INDEX idx_knowledge_source ON knowledge_chunks(source_type, source_ref);
CREATE INDEX idx_knowledge_unit ON knowledge_chunks(curriculum_unit_id) WHERE curriculum_unit_id IS NOT NULL;

ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
-- Shared reference knowledge: every active staff member can read it.
-- Writes are ingestion-pipeline territory, admin-scoped for now — if a
-- non-admin content-ingestion role is needed later, add a narrower policy
-- rather than opening this to every teacher.
CREATE POLICY knowledge_chunks_select ON knowledge_chunks FOR SELECT TO app_role
    USING (TRUE);
CREATE POLICY knowledge_chunks_insert_admin ON knowledge_chunks FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY knowledge_chunks_update_admin ON knowledge_chunks FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY knowledge_chunks_delete_admin ON knowledge_chunks FOR DELETE TO app_role
    USING (is_admin());

-- ============================================================
-- RESOURCE CHUNKS — this school's own uploaded material, chunked and
-- embedded. Access follows the same rule as the parent `resources` row
-- (uploader, public, or a classroom the requester teaches) — replicated
-- here as a helper function since RLS can't "inherit" another table's
-- policy directly.
-- ============================================================
CREATE OR REPLACE FUNCTION can_access_resource(p_resource_id UUID) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM resources r
        WHERE r.id = p_resource_id AND r.deleted_at IS NULL
          AND (
              is_admin() OR r.uploaded_by = current_app_user_id() OR r.is_public
              OR EXISTS (
                  SELECT 1 FROM classroom_resources cr
                  WHERE cr.resource_id = r.id AND teaches_classroom(cr.classroom_id)
              )
          )
    );
$$ LANGUAGE sql STABLE;

CREATE TABLE resource_chunks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    chunk_index     INT NOT NULL DEFAULT 0,
    content         TEXT NOT NULL,
    embedding       JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index removed for local JSONB fallback
CREATE INDEX idx_resource_chunks_resource ON resource_chunks(resource_id);

ALTER TABLE resource_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_chunks_select ON resource_chunks FOR SELECT TO app_role
    USING (can_access_resource(resource_id));
CREATE POLICY resource_chunks_insert ON resource_chunks FOR INSERT TO app_role
    WITH CHECK (can_access_resource(resource_id));
CREATE POLICY resource_chunks_delete ON resource_chunks FOR DELETE TO app_role
    USING (can_access_resource(resource_id));

-- ============================================================
-- QUESTION BANK — add embedding for semantic dedup / "find similar
-- question". A column, not a chunk table: questions are already atomic.
-- ============================================================
ALTER TABLE question_bank ADD COLUMN embedding JSONB;
-- HNSW index removed for local JSONB fallback

-- ============================================================
-- RAG QUERIES — retrieval + generation audit trail
-- ============================================================
CREATE TABLE rag_queries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    query_text      TEXT NOT NULL,
    retrieved_chunk_ids UUID[] NOT NULL DEFAULT '{}',
    answer_text     TEXT,
    model           VARCHAR(50),                     -- 'deepseek-chat', etc.
    latency_ms      INT,
    feedback        SMALLINT,                          -- -1 / 0 / 1, added post-launch
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_rag_feedback CHECK (feedback IS NULL OR feedback IN (-1, 0, 1))
);

CREATE INDEX idx_rag_queries_user ON rag_queries(user_id);
CREATE INDEX idx_rag_queries_created ON rag_queries(created_at);

ALTER TABLE rag_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY rag_queries_select ON rag_queries FOR SELECT TO app_role
    USING (is_admin() OR user_id = current_app_user_id());
CREATE POLICY rag_queries_insert ON rag_queries FOR INSERT TO app_role
    WITH CHECK (user_id = current_app_user_id() OR user_id IS NULL);

-- Down Migration

DROP TABLE IF EXISTS rag_queries;
DROP INDEX IF EXISTS idx_question_bank_embedding;
ALTER TABLE question_bank DROP COLUMN IF EXISTS embedding;
DROP TABLE IF EXISTS resource_chunks;
DROP FUNCTION IF EXISTS can_access_resource(UUID);
DROP TABLE IF EXISTS knowledge_chunks;
-- DROP EXTENSION IF EXISTS vector;
