-- Up Migration

-- ============================================================
-- STUDENTS
-- ============================================================
-- demographics (IEP/504/ELL status) and medical_notes sit in the same row
-- and RLS policy as ordinary roster fields for now. The architecture review
-- flagged this as needing a narrower access tier (case manager + admin only)
-- than "any teacher who teaches this student" — deferred to Phase 3's
-- student_sensitive_records split, not solved here. Noting it in-line so the
-- gap isn't silently forgotten between phases.
CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    student_number  VARCHAR(50) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    date_of_birth   DATE,
    grade_level     INT,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    emergency_contact JSONB NOT NULL DEFAULT '{}',
    demographics    JSONB NOT NULL DEFAULT '{}',    -- SENSITIVE — see note above
    medical_notes   TEXT,                            -- SENSITIVE — see note above
    photo_url       VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT uq_student_number UNIQUE (student_number)
);

CREATE INDEX idx_students_grade ON students(grade_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_name_trgm ON students USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ENROLLMENTS
-- ============================================================
CREATE TABLE enrollments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dropped_at      TIMESTAMPTZ,
    drop_reason     VARCHAR(100),
    final_grade     VARCHAR(10),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_enrollment_class_student UNIQUE (classroom_id, student_id),
    CONSTRAINT chk_enrollment_status CHECK (status IN ('active', 'dropped', 'completed', 'transferred', 'suspended'))
);

CREATE INDEX idx_enrollments_class ON enrollments(classroom_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_active ON enrollments(classroom_id, student_id) WHERE status = 'active';
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS HELPER: teaches_student() — a teacher may see a student if that
-- student is actively enrolled in a classroom the teacher co-teaches.
-- ============================================================
CREATE OR REPLACE FUNCTION teaches_student(p_student_id UUID) RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.student_id = p_student_id
          AND e.status = 'active'
          AND teaches_classroom(e.classroom_id)
    );
$$ LANGUAGE sql STABLE;

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY students_select ON students FOR SELECT TO app_role
    USING (deleted_at IS NULL AND (is_admin() OR teaches_student(id)));
CREATE POLICY students_insert_admin ON students FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY students_update ON students FOR UPDATE TO app_role
    USING (is_admin() OR teaches_student(id));
CREATE POLICY students_delete_admin ON students FOR DELETE TO app_role
    USING (is_admin());

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY enrollments_select ON enrollments FOR SELECT TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY enrollments_insert_admin ON enrollments FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY enrollments_update ON enrollments FOR UPDATE TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY enrollments_delete_admin ON enrollments FOR DELETE TO app_role
    USING (is_admin());

-- Down Migration

DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS students;
DROP FUNCTION IF EXISTS teaches_student(UUID);
