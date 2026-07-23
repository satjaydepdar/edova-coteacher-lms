-- Up Migration

-- ============================================================
-- SUBJECTS
-- ============================================================
CREATE TABLE subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    code            VARCHAR(50),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),                   -- STEM/Humanities/Arts/etc — free text, school-defined
    grade_levels    INT[] NOT NULL DEFAULT '{}',
    color_code      VARCHAR(7),
    icon            VARCHAR(100),
    parent_subject_id UUID REFERENCES subjects(id),
    standards_framework VARCHAR(100),
    metadata        JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT uq_subjects_code UNIQUE (code)
);

CREATE INDEX idx_subjects_active ON subjects(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_parent ON subjects(parent_subject_id) WHERE deleted_at IS NULL;
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CURRICULUM UNITS
-- ============================================================
-- Subject-level unit catalog (reusable across classes/years) as designed in
-- the reviewed schema. Note: edova-web's frontend CurriculumUnit type is a
-- different, narrower concept — a per-class, per-year pacing-guide instance
-- with topic-level done/actual% tracking and a dependsOn predecessor unit.
-- That's a real shape mismatch, not yet reconciled here — flagged for
-- Phase 3 rather than silently resolved or silently ignored in Phase 1.
CREATE TABLE curriculum_units (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    sequence_order  INT NOT NULL DEFAULT 0,
    duration_days   INT,
    standards       JSONB NOT NULL DEFAULT '[]',
    learning_objectives JSONB NOT NULL DEFAULT '[]',
    prerequisites   UUID[] NOT NULL DEFAULT '{}',
    resources       JSONB NOT NULL DEFAULT '[]',
    is_published    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_curriculum_subject ON curriculum_units(subject_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_curriculum_sequence ON curriculum_units(sequence_order) WHERE deleted_at IS NULL;
CREATE TRIGGER update_curriculum_units_updated_at BEFORE UPDATE ON curriculum_units
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Down Migration

DROP TABLE IF EXISTS curriculum_units;
DROP TABLE IF EXISTS subjects;
