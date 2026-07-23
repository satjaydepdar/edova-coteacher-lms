-- Up Migration

-- Curriculum Settings (Settings > Curriculum tab): DB-backed academic
-- years, per year/board/class curriculums, and the subjects inside them.
-- Naming note: the subject rows that make up a curriculum live in
-- `curriculum_subjects`, NOT `subjects` — `subjects` (migration 0003) is
-- the school's subject catalog referenced by `classrooms`, a different
-- concept with a different shape.

-- ============================================================
-- ACADEMIC YEARS — source for the Academic Year dropdown
-- ============================================================
CREATE TABLE academic_years (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    year_label      VARCHAR(9) NOT NULL,                -- '2025-26', '2026-27'
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_academic_years_label UNIQUE (year_label)
);

INSERT INTO academic_years (year_label) VALUES ('2025-26'), ('2026-27')
ON CONFLICT DO NOTHING;

ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY academic_years_select ON academic_years FOR SELECT TO app_role
    USING (TRUE);
CREATE POLICY academic_years_insert_admin ON academic_years FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY academic_years_update_admin ON academic_years FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY academic_years_delete_admin ON academic_years FOR DELETE TO app_role
    USING (is_admin());

-- ============================================================
-- CURRICULUMS — one row per (academic year, board, class) combo,
-- e.g. the "Class 5 - CBSE (2025-26)" card
-- ============================================================
CREATE TABLE curriculums (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    board           VARCHAR(20) NOT NULL,               -- 'CBSE', 'ICSE', 'State'
    class_label     VARCHAR(20) NOT NULL,               -- 'Class 5', 'Class 10'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_curriculums_year_board_class UNIQUE (academic_year_id, board, class_label),
    CONSTRAINT chk_curriculums_board CHECK (board IN ('CBSE', 'ICSE', 'State'))
);

CREATE TRIGGER update_curriculums_updated_at BEFORE UPDATE ON curriculums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE curriculums ENABLE ROW LEVEL SECURITY;
CREATE POLICY curriculums_select ON curriculums FOR SELECT TO app_role
    USING (TRUE);
CREATE POLICY curriculums_insert_admin ON curriculums FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY curriculums_update_admin ON curriculums FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY curriculums_delete_admin ON curriculums FOR DELETE TO app_role
    USING (is_admin());

-- ============================================================
-- CURRICULUM SUBJECTS — rows of the curriculum card table
-- ============================================================
CREATE TABLE curriculum_subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_id   UUID NOT NULL REFERENCES curriculums(id) ON DELETE CASCADE,
    s_no            SERIAL,
    subject_code    VARCHAR(10) NOT NULL,               -- '041'
    subject_name    VARCHAR(100) NOT NULL,              -- 'Mathematics Standard'
    subject_type    VARCHAR(20) NOT NULL DEFAULT 'Core',
    credits         INT NOT NULL DEFAULT 0,
    total_marks     INT,                                -- 100
    total_chapters  INT,
    syllabus_json   JSONB NOT NULL DEFAULT '{}',        -- unit -> marks, e.g. {"NUMBER SYSTEMS": 6, "ALGEBRA": 20, ...}
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_curriculum_subject_code UNIQUE (curriculum_id, subject_code),
    CONSTRAINT chk_curriculum_subject_type CHECK (subject_type IN ('Core', 'Elective')),
    CONSTRAINT chk_curriculum_subject_marks CHECK (total_marks IS NULL OR total_marks >= 0),
    CONSTRAINT chk_curriculum_subject_credits CHECK (credits >= 0)
);

CREATE INDEX idx_curriculum_subjects_curriculum ON curriculum_subjects(curriculum_id);

CREATE TRIGGER update_curriculum_subjects_updated_at BEFORE UPDATE ON curriculum_subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE curriculum_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY curriculum_subjects_select ON curriculum_subjects FOR SELECT TO app_role
    USING (TRUE);
CREATE POLICY curriculum_subjects_insert_admin ON curriculum_subjects FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY curriculum_subjects_update_admin ON curriculum_subjects FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY curriculum_subjects_delete_admin ON curriculum_subjects FOR DELETE TO app_role
    USING (is_admin());

-- Down Migration

DROP TABLE IF EXISTS curriculum_subjects;
DROP TABLE IF EXISTS curriculums;
DROP TABLE IF EXISTS academic_years;
