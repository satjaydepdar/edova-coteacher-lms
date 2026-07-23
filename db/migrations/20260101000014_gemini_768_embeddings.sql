-- Up Migration

-- ============================================================
-- SWITCH EMBEDDING DIMENSION: 1024 (BGE-m3, local) -> 768
-- (gemini-embedding-2, Google's recommended truncation tier via Matryoshka
-- Representation Learning — no meaningful accuracy loss vs the 3072
-- default, ~4x smaller index than full width). All three embedding
-- columns from migration 0013 need to change together, since ingestion
-- and query embeddings must come from the same model at the same
-- dimension or cosine distance is meaningless.
--
-- These tables are empty in practice at this point (Phase 2 just shipped,
-- no real ingestion has run yet) — a straight column-type change is safe.
-- If that's no longer true when this runs, TRUNCATE first; ALTER COLUMN
-- TYPE will fail on any existing 1024-dim row.
-- ============================================================

DROP INDEX IF EXISTS idx_knowledge_embedding;
ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(768);
CREATE INDEX idx_knowledge_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_resource_chunks_embedding;
ALTER TABLE resource_chunks ALTER COLUMN embedding TYPE vector(768);
CREATE INDEX idx_resource_chunks_embedding ON resource_chunks USING hnsw (embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_question_bank_embedding;
ALTER TABLE question_bank ALTER COLUMN embedding TYPE vector(768);
CREATE INDEX idx_question_bank_embedding ON question_bank USING hnsw (embedding vector_cosine_ops);

-- Down Migration

DROP INDEX IF EXISTS idx_question_bank_embedding;
ALTER TABLE question_bank ALTER COLUMN embedding TYPE vector(1024);
CREATE INDEX idx_question_bank_embedding ON question_bank USING hnsw (embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_resource_chunks_embedding;
ALTER TABLE resource_chunks ALTER COLUMN embedding TYPE vector(1024);
CREATE INDEX idx_resource_chunks_embedding ON resource_chunks USING hnsw (embedding vector_cosine_ops);

DROP INDEX IF EXISTS idx_knowledge_embedding;
ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(1024);
CREATE INDEX idx_knowledge_embedding ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);
