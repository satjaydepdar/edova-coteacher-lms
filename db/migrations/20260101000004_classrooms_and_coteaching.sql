-- Up Migration

-- ============================================================
-- CLASSROOMS
-- ============================================================
CREATE TABLE classrooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    grade_level     INT NOT NULL,
    section         VARCHAR(50),
    academic_year   VARCHAR(20) NOT NULL,           -- '2025-2026'
    semester        VARCHAR(20),
    schedule        JSONB NOT NULL DEFAULT '{}',    -- days/times/room, denormalized display copy
    max_students    INT NOT NULL DEFAULT 30,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_archived     BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at     TIMESTAMPTZ,
    settings        JSONB NOT NULL DEFAULT '{}',    -- grading scale, late policy — see JSONB schema notes
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT uq_classroom_code_year UNIQUE (code, academic_year)
);

CREATE INDEX idx_classrooms_subject ON classrooms(subject_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_classrooms_year ON classrooms(academic_year) WHERE deleted_at IS NULL;
CREATE INDEX idx_classrooms_active ON classrooms(is_active, is_archived) WHERE deleted_at IS NULL;
CREATE INDEX idx_classrooms_schedule ON classrooms USING gin (schedule);
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CO-TEACHING ASSIGNMENTS — the core Edova domain
-- ============================================================
CREATE TABLE co_teaching_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_type       VARCHAR(30) NOT NULL DEFAULT 'co_teacher',
    responsibilities JSONB NOT NULL DEFAULT '[]',   -- ["grading","attendance","lesson_planning",...]
    permissions     JSONB NOT NULL DEFAULT '{}',
    start_date      DATE NOT NULL,
    end_date        DATE,
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    handoff_notes   TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_coteach_class_teacher UNIQUE (classroom_id, teacher_id),
    CONSTRAINT chk_coteach_role_type CHECK (role_type IN ('primary_teacher', 'co_teacher', 'lead', 'support', 'observer', 'assistant')),
    CONSTRAINT chk_coteach_status CHECK (status IN ('active', 'pending', 'ended')),
    CONSTRAINT chk_coteach_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_coteach_classroom ON co_teaching_assignments(classroom_id);
CREATE INDEX idx_coteach_teacher ON co_teaching_assignments(teacher_id);
CREATE INDEX idx_coteach_primary ON co_teaching_assignments(classroom_id, is_primary) WHERE is_primary = TRUE;
CREATE TRIGGER update_coteach_updated_at BEFORE UPDATE ON co_teaching_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS HELPER: teaches_classroom() — used by every classroom-scoped table
-- from here on (lesson_plans, assignments, submissions, grades, attendance,
-- schedules, ...). Defined here since it depends on co_teaching_assignments.
-- ============================================================
CREATE OR REPLACE FUNCTION teaches_classroom(p_classroom_id UUID) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM co_teaching_assignments
        WHERE classroom_id = p_classroom_id
          AND teacher_id = current_app_user_id()
          AND status = 'active'
    );
$$ LANGUAGE sql STABLE;

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY classrooms_select ON classrooms FOR SELECT TO app_role
    USING (deleted_at IS NULL AND (is_admin() OR teaches_classroom(id)));
CREATE POLICY classrooms_modify_admin ON classrooms FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY classrooms_update ON classrooms FOR UPDATE TO app_role
    USING (is_admin() OR teaches_classroom(id));
CREATE POLICY classrooms_delete_admin ON classrooms FOR DELETE TO app_role
    USING (is_admin());

ALTER TABLE co_teaching_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY coteach_select ON co_teaching_assignments FOR SELECT TO app_role
    USING (is_admin() OR teacher_id = current_app_user_id() OR teaches_classroom(classroom_id));
CREATE POLICY coteach_modify_admin ON co_teaching_assignments FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY coteach_update_admin ON co_teaching_assignments FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY coteach_delete_admin ON co_teaching_assignments FOR DELETE TO app_role
    USING (is_admin());

-- ============================================================
-- TEACHER HANDOFFS
-- ============================================================
CREATE TABLE teacher_handoffs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    from_teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_teacher_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    handoff_date    TIMESTAMPTZ NOT NULL,
    lesson_context  JSONB NOT NULL DEFAULT '{}',    -- current unit, progress, notes
    student_notes   JSONB NOT NULL DEFAULT '[]',
    materials_status JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    acknowledged_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_handoff_status CHECK (status IN ('pending', 'acknowledged', 'completed')),
    CONSTRAINT chk_handoff_teachers CHECK (from_teacher_id != to_teacher_id)
);

CREATE INDEX idx_handoffs_classroom ON teacher_handoffs(classroom_id);
CREATE INDEX idx_handoffs_from ON teacher_handoffs(from_teacher_id);
CREATE INDEX idx_handoffs_to ON teacher_handoffs(to_teacher_id);
CREATE INDEX idx_handoffs_status ON teacher_handoffs(status);

ALTER TABLE teacher_handoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY handoffs_select ON teacher_handoffs FOR SELECT TO app_role
    USING (is_admin() OR from_teacher_id = current_app_user_id() OR to_teacher_id = current_app_user_id());
CREATE POLICY handoffs_insert ON teacher_handoffs FOR INSERT TO app_role
    WITH CHECK (is_admin() OR from_teacher_id = current_app_user_id());
CREATE POLICY handoffs_update ON teacher_handoffs FOR UPDATE TO app_role
    USING (is_admin() OR from_teacher_id = current_app_user_id() OR to_teacher_id = current_app_user_id());

-- Down Migration

-- teaches_classroom() is called from policies on this file's own tables
-- (and every classroom-scoped table added in later migrations) — it must
-- be dropped only after every table whose policies reference it, which in
-- a full rollback means after classrooms/co_teaching_assignments here, and
-- only once all later migrations' down steps have already run.
DROP TABLE IF EXISTS teacher_handoffs;
DROP TABLE IF EXISTS co_teaching_assignments;
DROP TABLE IF EXISTS classrooms;
DROP FUNCTION IF EXISTS teaches_classroom(UUID);
