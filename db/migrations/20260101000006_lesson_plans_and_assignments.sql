-- Up Migration

-- ============================================================
-- LESSON PLANS
-- ============================================================
CREATE TABLE lesson_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    unit_id         UUID REFERENCES curriculum_units(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    objectives      JSONB NOT NULL DEFAULT '[]',
    standards       JSONB NOT NULL DEFAULT '[]',
    materials       JSONB NOT NULL DEFAULT '[]',
    procedure       JSONB NOT NULL DEFAULT '{}',
    duration_minutes INT NOT NULL DEFAULT 45,
    scheduled_date  DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    version         INT NOT NULL DEFAULT 1,
    parent_plan_id  UUID REFERENCES lesson_plans(id),
    is_template     BOOLEAN NOT NULL DEFAULT FALSE,
    shared_with     UUID[] NOT NULL DEFAULT '{}',   -- co-teachers with access beyond classroom scope
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_lesson_status CHECK (status IN ('draft', 'planned', 'scheduled', 'completed', 'cancelled'))
);

CREATE INDEX idx_lessons_classroom ON lesson_plans(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_unit ON lesson_plans(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_date ON lesson_plans(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_status ON lesson_plans(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_creator ON lesson_plans(created_by) WHERE deleted_at IS NULL;
CREATE TRIGGER update_lesson_plans_updated_at BEFORE UPDATE ON lesson_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_plans_select ON lesson_plans FOR SELECT TO app_role
    USING (deleted_at IS NULL AND (
        is_admin() OR teaches_classroom(classroom_id)
        OR created_by = current_app_user_id() OR current_app_user_id() = ANY(shared_with)
    ));
CREATE POLICY lesson_plans_insert ON lesson_plans FOR INSERT TO app_role
    WITH CHECK (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY lesson_plans_update ON lesson_plans FOR UPDATE TO app_role
    USING (is_admin() OR created_by = current_app_user_id() OR current_app_user_id() = ANY(shared_with));
CREATE POLICY lesson_plans_delete ON lesson_plans FOR DELETE TO app_role
    USING (is_admin() OR created_by = current_app_user_id());

-- ============================================================
-- ASSIGNMENTS
-- ============================================================
CREATE TABLE assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    lesson_plan_id  UUID REFERENCES lesson_plans(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    type            VARCHAR(30) NOT NULL DEFAULT 'homework',
    instructions    TEXT,
    rubric          JSONB NOT NULL DEFAULT '{}',
    points_possible NUMERIC(8,2) NOT NULL DEFAULT 100,
    allowed_attempts INT NOT NULL DEFAULT 1,
    time_limit_minutes INT,
    due_date        TIMESTAMPTZ,
    available_from  TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    late_policy     JSONB NOT NULL DEFAULT '{}',
    settings        JSONB NOT NULL DEFAULT '{}',
    attachments     JSONB NOT NULL DEFAULT '[]',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    is_graded       BOOLEAN NOT NULL DEFAULT TRUE,
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_assignment_type CHECK (type IN ('homework', 'classwork', 'quiz', 'exam', 'project', 'essay', 'presentation', 'lab', 'participation')),
    CONSTRAINT chk_assignment_status CHECK (status IN ('draft', 'published', 'closed', 'archived')),
    CONSTRAINT chk_assignment_points CHECK (points_possible >= 0)
);

CREATE INDEX idx_assignments_class ON assignments(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_type ON assignments(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_due ON assignments(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_status ON assignments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_rubric ON assignments USING gin (rubric);
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
-- Published assignments are visible school-wide within the classroom's own
-- roster via enrollments (student portal is a later feature); for staff,
-- draft-through-archived are visible to whoever teaches the classroom.
CREATE POLICY assignments_select ON assignments FOR SELECT TO app_role
    USING (deleted_at IS NULL AND (is_admin() OR teaches_classroom(classroom_id)));
CREATE POLICY assignments_insert ON assignments FOR INSERT TO app_role
    WITH CHECK (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY assignments_update ON assignments FOR UPDATE TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY assignments_delete ON assignments FOR DELETE TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));

-- ============================================================
-- QUESTION BANK — shared school-wide item bank, not classroom-scoped
-- ============================================================
CREATE TABLE question_bank (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    question_type   VARCHAR(30) NOT NULL,
    question_text   TEXT NOT NULL,
    options         JSONB NOT NULL DEFAULT '[]',    -- [{text, isCorrect, feedback}] for MC
    correct_answer  JSONB,
    explanation     TEXT,
    points          NUMERIC(5,2) NOT NULL DEFAULT 1,
    difficulty      INT NOT NULL DEFAULT 3,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    standards       JSONB NOT NULL DEFAULT '[]',
    usage_count     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_qb_type CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer', 'essay', 'matching', 'fill_blank')),
    CONSTRAINT chk_qb_difficulty CHECK (difficulty BETWEEN 1 AND 5)
);

CREATE INDEX idx_qb_type ON question_bank(question_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_qb_tags ON question_bank USING gin (tags);
CREATE INDEX idx_qb_difficulty ON question_bank(difficulty) WHERE deleted_at IS NULL;
CREATE TRIGGER update_question_bank_updated_at BEFORE UPDATE ON question_bank
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
-- Shared item bank: every active staff member can browse and reuse any
-- question; only the author or an admin can edit/retire one.
CREATE POLICY question_bank_select ON question_bank FOR SELECT TO app_role
    USING (deleted_at IS NULL);
CREATE POLICY question_bank_insert ON question_bank FOR INSERT TO app_role
    WITH CHECK (created_by = current_app_user_id() OR is_admin());
CREATE POLICY question_bank_update ON question_bank FOR UPDATE TO app_role
    USING (created_by = current_app_user_id() OR is_admin());
CREATE POLICY question_bank_delete ON question_bank FOR DELETE TO app_role
    USING (created_by = current_app_user_id() OR is_admin());

-- ============================================================
-- ASSIGNMENT ↔ QUESTION LINKAGE
-- ============================================================
CREATE TABLE assignment_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    sequence_order  INT NOT NULL DEFAULT 0,
    points_override NUMERIC(5,2),
    settings        JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX idx_aq_assignment ON assignment_questions(assignment_id);
CREATE INDEX idx_aq_sequence ON assignment_questions(assignment_id, sequence_order);

ALTER TABLE assignment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignment_questions_all ON assignment_questions FOR ALL TO app_role
    USING (EXISTS (
        SELECT 1 FROM assignments a WHERE a.id = assignment_id
          AND (is_admin() OR teaches_classroom(a.classroom_id))
    ));

-- Down Migration

DROP TABLE IF EXISTS assignment_questions;
DROP TABLE IF EXISTS question_bank;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS lesson_plans;
