-- Up Migration

-- ============================================================
-- SUBMISSIONS — partitioned by academic_year
-- ============================================================
-- Note on a correctness fix vs. the reviewed design doc: Postgres requires
-- a partitioned table's PRIMARY KEY / UNIQUE constraints to include the
-- partition key column. `id UUID PRIMARY KEY` alone on a table
-- `PARTITION BY RANGE (academic_year)` is rejected by Postgres outright —
-- the reviewed schema as written would fail to even create. Fixed here by
-- making the primary key composite (id, academic_year); grades below
-- carries the same academic_year and FKs against the composite key so the
-- database — not app convention — enforces that a grade's academic_year
-- always matches its submission's.
CREATE TABLE submissions (
    id              UUID NOT NULL DEFAULT uuid_generate_v4(),
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submission_type VARCHAR(20) NOT NULL DEFAULT 'final',
    attempt_number  INT NOT NULL DEFAULT 1,
    answers         JSONB NOT NULL DEFAULT '{}',
    attachments     JSONB NOT NULL DEFAULT '[]',
    text_response   TEXT,
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    is_late         BOOLEAN NOT NULL DEFAULT FALSE,
    late_minutes    INT NOT NULL DEFAULT 0,
    plagiarism_score NUMERIC(5,2),
    plagiarism_report_url VARCHAR(500),
    status          VARCHAR(20) NOT NULL DEFAULT 'submitted',
    academic_year   VARCHAR(20) NOT NULL,            -- partition key
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, academic_year),
    CONSTRAINT chk_submission_type CHECK (submission_type IN ('draft', 'final', 'resubmission')),
    CONSTRAINT chk_submission_status CHECK (status IN ('started', 'submitted', 'graded', 'returned'))
) PARTITION BY RANGE (academic_year);

-- Three years of headroom (current + 2) — yearly cadence is a five-minute
-- manual task each spring, not something that needs pg_partman automation
-- at single-school volume. A DEFAULT partition catches anything outside the
-- pre-created range so an unexpected academic_year value fails soft (lands
-- somewhere queryable) instead of failing the write outright.
CREATE TABLE submissions_y2025 PARTITION OF submissions
    FOR VALUES FROM ('2025-2026') TO ('2026-2027');
CREATE TABLE submissions_y2026 PARTITION OF submissions
    FOR VALUES FROM ('2026-2027') TO ('2027-2028');
CREATE TABLE submissions_y2027 PARTITION OF submissions
    FOR VALUES FROM ('2027-2028') TO ('2028-2029');
CREATE TABLE submissions_default PARTITION OF submissions DEFAULT;

CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_answers ON submissions USING gin (answers);
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY submissions_select ON submissions FOR SELECT TO app_role
    USING (is_admin() OR EXISTS (
        SELECT 1 FROM assignments a WHERE a.id = assignment_id AND teaches_classroom(a.classroom_id)
    ));
CREATE POLICY submissions_insert ON submissions FOR INSERT TO app_role
    WITH CHECK (is_admin() OR EXISTS (
        SELECT 1 FROM assignments a WHERE a.id = assignment_id AND teaches_classroom(a.classroom_id)
    ));
CREATE POLICY submissions_update ON submissions FOR UPDATE TO app_role
    USING (is_admin() OR EXISTS (
        SELECT 1 FROM assignments a WHERE a.id = assignment_id AND teaches_classroom(a.classroom_id)
    ));

-- ============================================================
-- GRADES — partitioned by academic_year, tied to submissions
-- ============================================================
CREATE TABLE grades (
    id              UUID NOT NULL DEFAULT uuid_generate_v4(),
    submission_id   UUID,
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    grader_id       UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    points_earned   NUMERIC(8,2),
    points_possible NUMERIC(8,2),
    -- Generated, not just app-computed: percentage can never drift from the
    -- two numbers it's derived from, because Postgres recomputes it itself.
    percentage      NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN points_possible IS NULL OR points_possible = 0 THEN NULL
             ELSE ROUND((points_earned / points_possible) * 100, 2) END
    ) STORED,
    letter_grade    VARCHAR(5),
    rubric_scores   JSONB NOT NULL DEFAULT '[]',
    feedback        TEXT,
    is_excused      BOOLEAN NOT NULL DEFAULT FALSE,
    is_missing      BOOLEAN NOT NULL DEFAULT FALSE,
    override_history JSONB NOT NULL DEFAULT '[]',
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    published_at    TIMESTAMPTZ,
    academic_year   VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, academic_year),
    CONSTRAINT fk_grades_submission FOREIGN KEY (submission_id, academic_year)
        REFERENCES submissions(id, academic_year) ON DELETE CASCADE,
    CONSTRAINT chk_grades_status CHECK (status IN ('draft', 'published', 'returned', 'hidden'))
) PARTITION BY RANGE (academic_year);

CREATE TABLE grades_y2025 PARTITION OF grades
    FOR VALUES FROM ('2025-2026') TO ('2026-2027');
CREATE TABLE grades_y2026 PARTITION OF grades
    FOR VALUES FROM ('2026-2027') TO ('2027-2028');
CREATE TABLE grades_y2027 PARTITION OF grades
    FOR VALUES FROM ('2027-2028') TO ('2028-2029');
CREATE TABLE grades_default PARTITION OF grades DEFAULT;

CREATE INDEX idx_grades_assignment ON grades(assignment_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_grader ON grades(grader_id);
CREATE INDEX idx_grades_status ON grades(status);
CREATE INDEX idx_grades_rubric ON grades USING gin (rubric_scores);
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY grades_select ON grades FOR SELECT TO app_role
    USING (is_admin() OR EXISTS (
        SELECT 1 FROM assignments a WHERE a.id = assignment_id AND teaches_classroom(a.classroom_id)
    ));
CREATE POLICY grades_insert ON grades FOR INSERT TO app_role
    WITH CHECK (is_admin() OR EXISTS (
        SELECT 1 FROM assignments a WHERE a.id = assignment_id AND teaches_classroom(a.classroom_id)
    ));
CREATE POLICY grades_update ON grades FOR UPDATE TO app_role
    USING (is_admin() OR EXISTS (
        SELECT 1 FROM assignments a WHERE a.id = assignment_id AND teaches_classroom(a.classroom_id)
    ));

-- ============================================================
-- GRADEBOOK SNAPSHOTS — pre-aggregated per (classroom, student, category)
-- ============================================================
-- "Pre-aggregated for performance" only holds if something keeps it in sync.
-- The reviewed schema didn't specify what — this migration adds the
-- refresh trigger inline rather than deferring it, since a stale gradebook
-- is a correctness bug the moment a real grade is entered, not a scale
-- problem to revisit later.
CREATE TABLE gradebook_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    category_id     UUID,
    total_points    NUMERIC(10,2) NOT NULL DEFAULT 0,
    earned_points   NUMERIC(10,2) NOT NULL DEFAULT 0,
    percentage      NUMERIC(5,2),
    letter_grade    VARCHAR(5),
    assignment_count INT NOT NULL DEFAULT 0,
    missing_count   INT NOT NULL DEFAULT 0,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_snapshot_class_student_cat UNIQUE (classroom_id, student_id, category_id)
);

CREATE INDEX idx_snapshots_class ON gradebook_snapshots(classroom_id);
CREATE INDEX idx_snapshots_student ON gradebook_snapshots(student_id);

ALTER TABLE gradebook_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY gradebook_snapshots_select ON gradebook_snapshots FOR SELECT TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));

-- Incremental upsert triggered by any published grade change — recomputes
-- only the affected (classroom, student) pair, not the whole gradebook.
CREATE OR REPLACE FUNCTION refresh_gradebook_snapshot() RETURNS TRIGGER AS $$
DECLARE
    v_classroom_id UUID;
    v_student_id UUID;
BEGIN
    v_student_id := COALESCE(NEW.student_id, OLD.student_id);
    SELECT a.classroom_id INTO v_classroom_id FROM assignments a
        WHERE a.id = COALESCE(NEW.assignment_id, OLD.assignment_id);

    INSERT INTO gradebook_snapshots (classroom_id, student_id, category_id, total_points, earned_points, percentage, assignment_count, missing_count, last_updated)
    SELECT
        v_classroom_id,
        v_student_id,
        NULL,
        COALESCE(SUM(g.points_possible), 0),
        COALESCE(SUM(g.points_earned), 0),
        CASE WHEN COALESCE(SUM(g.points_possible), 0) = 0 THEN NULL
             ELSE ROUND((SUM(g.points_earned) / SUM(g.points_possible)) * 100, 2) END,
        COUNT(*) FILTER (WHERE NOT g.is_excused),
        COUNT(*) FILTER (WHERE g.is_missing),
        NOW()
    FROM grades g
    JOIN assignments a ON a.id = g.assignment_id
    WHERE a.classroom_id = v_classroom_id AND g.student_id = v_student_id
      AND g.status = 'published' AND NOT g.is_excused
    ON CONFLICT (classroom_id, student_id, category_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        earned_points = EXCLUDED.earned_points,
        percentage = EXCLUDED.percentage,
        assignment_count = EXCLUDED.assignment_count,
        missing_count = EXCLUDED.missing_count,
        last_updated = NOW();

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_gradebook_snapshot_trigger
    AFTER INSERT OR UPDATE OR DELETE ON grades
    FOR EACH ROW EXECUTE FUNCTION refresh_gradebook_snapshot();

-- Down Migration

DROP TRIGGER IF EXISTS refresh_gradebook_snapshot_trigger ON grades;
DROP FUNCTION IF EXISTS refresh_gradebook_snapshot();
DROP TABLE IF EXISTS gradebook_snapshots;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS submissions;
