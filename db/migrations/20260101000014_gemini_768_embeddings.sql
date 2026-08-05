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

ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE JSONB;
ALTER TABLE resource_chunks ALTER COLUMN embedding TYPE JSONB;
ALTER TABLE question_bank ALTER COLUMN embedding TYPE JSONB;

-- Down Migration

ALTER TABLE question_bank ALTER COLUMN embedding TYPE JSONB;
ALTER TABLE resource_chunks ALTER COLUMN embedding TYPE JSONB;
ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE JSONB;
