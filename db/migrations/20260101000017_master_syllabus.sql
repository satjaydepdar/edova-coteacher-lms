-- Up Migration

-- Master Data (Settings > Master Data tab): per-subject syllabus detail —
-- units (with marks) → chapters (number + name) → topics. Hangs under
-- curriculum_subjects (migration 0016), so every (year, board, class,
-- subject) combo gets its own tree — CBSE Class 10 Maths and ICSE Class 10
-- Maths are independent rows with independent trees.
--
-- The flat curriculum_subjects.syllabus_json unit→marks map stays as the
-- summary the Curriculum tab renders; the API recomputes it (and
-- total_chapters) from these tables on every save so the two never drift.
--
-- Naming note: `syllabus_*`, NOT `curriculum_*` — migration 0003 already
-- has a `curriculum_units` table for the school subject catalog, a
-- different concept.

-- ============================================================
-- SYLLABUS UNITS — 'I. Number Systems', 6 marks
-- ============================================================
CREATE TABLE syllabus_units (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_subject_id UUID NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
    s_no            INT NOT NULL,                       -- display order within the subject
    name            VARCHAR(255) NOT NULL,              -- 'I. Number Systems'
    marks           INT,                                -- 6; NULL when the board doesn't publish unit marks
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_syllabus_units_subject_sno UNIQUE (curriculum_subject_id, s_no),
    CONSTRAINT chk_syllabus_units_marks CHECK (marks IS NULL OR marks >= 0)
);

CREATE INDEX idx_syllabus_units_subject ON syllabus_units(curriculum_subject_id);

CREATE TRIGGER update_syllabus_units_updated_at BEFORE UPDATE ON syllabus_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SYLLABUS CHAPTERS — 'Chapter 1: Real Numbers'
-- ============================================================
CREATE TABLE syllabus_chapters (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id         UUID NOT NULL REFERENCES syllabus_units(id) ON DELETE CASCADE,
    s_no            INT NOT NULL,                       -- display order within the unit
    number          INT,                                -- 1; NULL for boards that don't number chapters
    name            VARCHAR(255) NOT NULL,              -- 'Real Numbers'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_syllabus_chapters_unit_sno UNIQUE (unit_id, s_no)
);

CREATE INDEX idx_syllabus_chapters_unit ON syllabus_chapters(unit_id);

CREATE TRIGGER update_syllabus_chapters_updated_at BEFORE UPDATE ON syllabus_chapters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SYLLABUS TOPICS — 'Fundamental Theorem of Arithmetic'
-- ============================================================
CREATE TABLE syllabus_topics (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id      UUID NOT NULL REFERENCES syllabus_chapters(id) ON DELETE CASCADE,
    s_no            INT NOT NULL,                       -- display order within the chapter
    title           VARCHAR(500) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_syllabus_topics_chapter_sno UNIQUE (chapter_id, s_no)
);

CREATE INDEX idx_syllabus_topics_chapter ON syllabus_topics(chapter_id);

-- RLS mirrors migration 0016: read for everyone, writes admin-only.
ALTER TABLE syllabus_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY syllabus_units_select ON syllabus_units FOR SELECT TO app_role
    USING (TRUE);
CREATE POLICY syllabus_units_insert_admin ON syllabus_units FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY syllabus_units_update_admin ON syllabus_units FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY syllabus_units_delete_admin ON syllabus_units FOR DELETE TO app_role
    USING (is_admin());

ALTER TABLE syllabus_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY syllabus_chapters_select ON syllabus_chapters FOR SELECT TO app_role
    USING (TRUE);
CREATE POLICY syllabus_chapters_insert_admin ON syllabus_chapters FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY syllabus_chapters_update_admin ON syllabus_chapters FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY syllabus_chapters_delete_admin ON syllabus_chapters FOR DELETE TO app_role
    USING (is_admin());

ALTER TABLE syllabus_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY syllabus_topics_select ON syllabus_topics FOR SELECT TO app_role
    USING (TRUE);
CREATE POLICY syllabus_topics_insert_admin ON syllabus_topics FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY syllabus_topics_update_admin ON syllabus_topics FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY syllabus_topics_delete_admin ON syllabus_topics FOR DELETE TO app_role
    USING (is_admin());

-- Down Migration

DROP TABLE IF EXISTS syllabus_topics;
DROP TABLE IF EXISTS syllabus_chapters;
DROP TABLE IF EXISTS syllabus_units;
