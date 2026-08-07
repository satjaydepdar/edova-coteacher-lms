-- Up Migration

-- ============================================================
-- RESOURCE ASSIGNMENTS
-- A teacher assigning a catalogued Learning Resource (OKF video/PDF) to a
-- class -- distinct from the homework `assignments` table (grades, due
-- dates, submissions). This is what Student Learning Hub reads to decide
-- which chapters/media to show a student: only resources actually
-- assigned to their classroom, nothing else from the catalog.
-- ============================================================
CREATE TABLE resource_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    resource_id     VARCHAR(255) NOT NULL,   -- OKF manifest resource id
    resource_title  VARCHAR(255) NOT NULL,
    resource_type   VARCHAR(30) NOT NULL,    -- manifest "type": Video / PDF / ...
    chapter_number  INT,
    s3_key          TEXT,
    assigned_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (classroom_id, resource_id)
);

CREATE INDEX idx_resource_assignments_classroom ON resource_assignments(classroom_id);

ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_assignments_select ON resource_assignments FOR SELECT TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY resource_assignments_insert ON resource_assignments FOR INSERT TO app_role
    WITH CHECK (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY resource_assignments_delete ON resource_assignments FOR DELETE TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));

-- Down Migration

DROP TABLE IF EXISTS resource_assignments;
