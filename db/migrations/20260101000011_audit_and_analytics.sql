-- Up Migration

-- ============================================================
-- AUDIT LOGS — the single canonical audit trail
-- ============================================================
-- The reviewed schema had two overlapping systems (activity_logs +
-- audit_logs, both actor/action/entity/old-new-values). Collapsed to one
-- here. Unpartitioned per the Phase 1 scope decision — weekly partitioning
-- was operational overhead this table won't earn back for years at
-- single-school volume.
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name      VARCHAR(100) NOT NULL,
    record_id       UUID,
    action          VARCHAR(20) NOT NULL,
    old_values      JSONB,
    new_values      JSONB,
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address      INET,
    session_id      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_audit_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_record ON audit_logs(record_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_select_admin ON audit_logs FOR SELECT TO app_role
    USING (is_admin());

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, actor_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), current_app_user_id());
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, actor_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_app_user_id());
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, actor_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), current_app_user_id());
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Applied to the tables where an audit trail actually matters for a school
-- (account changes, grade changes, roster changes, attendance changes) —
-- not blanket-applied to every table, to keep audit_logs' growth
-- proportional to what's worth auditing.
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_students AFTER INSERT OR UPDATE OR DELETE ON students
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_grades AFTER INSERT OR UPDATE OR DELETE ON grades
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_assignments AFTER INSERT OR UPDATE OR DELETE ON assignments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_attendance AFTER INSERT OR UPDATE OR DELETE ON attendance
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================
-- ANALYTICS SNAPSHOTS
-- ============================================================
CREATE TABLE analytics_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    classroom_id    UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    snapshot_type   VARCHAR(50) NOT NULL,
    snapshot_date   DATE NOT NULL,
    metrics         JSONB NOT NULL DEFAULT '{}',
    dimensions      JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_snapshot UNIQUE (organization_id, classroom_id, snapshot_type, snapshot_date)
);

CREATE INDEX idx_analytics_class ON analytics_snapshots(classroom_id);
CREATE INDEX idx_analytics_type ON analytics_snapshots(snapshot_type);
CREATE INDEX idx_analytics_date ON analytics_snapshots(snapshot_date);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY analytics_snapshots_select ON analytics_snapshots FOR SELECT TO app_role
    USING (is_admin() OR (classroom_id IS NOT NULL AND teaches_classroom(classroom_id)));

-- ============================================================
-- DASHBOARD MATERIALIZED VIEW
-- ============================================================
-- Note: Postgres RLS does not apply to materialized views. Access control
-- for this view has to happen in the query layer (filter by classroom_id
-- server-side against the requesting teacher's actual assignments) — do not
-- expose it through a passthrough endpoint that lets a client pick an
-- arbitrary classroom_id.
CREATE MATERIALIZED VIEW mv_dashboard_metrics AS
SELECT
    c.id AS classroom_id,
    c.name AS classroom_name,
    COUNT(DISTINCT e.student_id) AS student_count,
    COUNT(DISTINCT a.id) AS assignment_count,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'submitted') AS submission_count,
    AVG(g.percentage) AS avg_grade,
    COUNT(DISTINCT att.id) FILTER (WHERE att.status = 'absent') AS absence_count
FROM classrooms c
LEFT JOIN enrollments e ON c.id = e.classroom_id AND e.status = 'active'
LEFT JOIN assignments a ON c.id = a.classroom_id AND a.deleted_at IS NULL
LEFT JOIN submissions s ON a.id = s.assignment_id
LEFT JOIN grades g ON s.id = g.submission_id AND g.status = 'published'
LEFT JOIN attendance att ON c.id = att.classroom_id AND att.date = CURRENT_DATE
WHERE c.deleted_at IS NULL AND c.is_active = TRUE
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX idx_mv_dashboard ON mv_dashboard_metrics(classroom_id);

-- Down Migration

DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_metrics;
DROP TABLE IF EXISTS analytics_snapshots;
-- Triggers on other (still-existing) tables depend on this function, so they
-- must go before the function does, regardless of table drop order elsewhere.
DROP TRIGGER IF EXISTS audit_attendance ON attendance;
DROP TRIGGER IF EXISTS audit_assignments ON assignments;
DROP TRIGGER IF EXISTS audit_grades ON grades;
DROP TRIGGER IF EXISTS audit_students ON students;
DROP TRIGGER IF EXISTS audit_users ON users;
DROP TABLE IF EXISTS audit_logs;
DROP FUNCTION IF EXISTS audit_trigger_func();
