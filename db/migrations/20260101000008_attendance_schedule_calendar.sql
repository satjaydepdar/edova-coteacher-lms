-- Up Migration

-- ============================================================
-- ATTENDANCE
-- ============================================================
-- The current edova-web frontend renders Attendance as a read-only view
-- (mirrors the design mockup exactly — no marking UI yet). This table is
-- intentionally ahead of that: real per-status marking, excuse tracking,
-- and period-level granularity, so the backend doesn't need a schema change
-- the day marking UI actually ships.
CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'present',
    period          VARCHAR(20),
    notes           TEXT,
    recorded_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_excused      BOOLEAN NOT NULL DEFAULT FALSE,
    excuse_reason   VARCHAR(255),
    excuse_document JSONB,
    academic_year   VARCHAR(20) NOT NULL,

    CONSTRAINT uq_attendance UNIQUE (classroom_id, student_id, date, period),
    CONSTRAINT chk_attendance_status CHECK (status IN ('present', 'absent', 'tardy', 'excused', 'early_departure', 'field_trip'))
);

-- BRIN, not B-tree: attendance.date is append-only and always queried by
-- range, never a random single lookup — a fraction of the index size for
-- the same query performance.
CREATE INDEX idx_attendance_date ON attendance USING brin (date);
CREATE INDEX idx_attendance_class ON attendance(classroom_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_status ON attendance(status);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_select ON attendance FOR SELECT TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY attendance_insert ON attendance FOR INSERT TO app_role
    WITH CHECK (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY attendance_update ON attendance FOR UPDATE TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY attendance_delete ON attendance FOR DELETE TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));

-- ============================================================
-- SCHEDULES
-- ============================================================
-- Recurring-block model as designed in the reviewed schema. Doesn't yet
-- match edova-web's actual MasterTimetableRow (a section × day × period
-- grid with bulk-upload/copy-from-previous-year operations) — that
-- reconciliation is Phase 3 work, not done here.
CREATE TABLE schedules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    room            VARCHAR(100),
    is_recurring    BOOLEAN NOT NULL DEFAULT TRUE,
    effective_from  DATE NOT NULL,
    effective_until DATE,
    exceptions      JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_schedule_time CHECK (end_time > start_time)
);

CREATE INDEX idx_schedules_class ON schedules(classroom_id);
CREATE INDEX idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX idx_schedules_day ON schedules(day_of_week);
CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedules_select ON schedules FOR SELECT TO app_role
    USING (is_admin() OR teacher_id = current_app_user_id() OR teaches_classroom(classroom_id));
CREATE POLICY schedules_modify_admin ON schedules FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY schedules_update_admin ON schedules FOR UPDATE TO app_role
    USING (is_admin());
CREATE POLICY schedules_delete_admin ON schedules FOR DELETE TO app_role
    USING (is_admin());

-- ============================================================
-- CALENDAR EVENTS
-- ============================================================
CREATE TABLE calendar_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    classroom_id    UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    event_type      VARCHAR(30) NOT NULL,
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ,
    is_all_day      BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_rule JSONB,
    attendees       UUID[] NOT NULL DEFAULT '{}',
    reminders       JSONB NOT NULL DEFAULT '[]',
    visibility      VARCHAR(20) NOT NULL DEFAULT 'class',
    color           VARCHAR(7),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_calendar_type CHECK (event_type IN ('assignment', 'exam', 'meeting', 'holiday', 'event')),
    CONSTRAINT chk_calendar_visibility CHECK (visibility IN ('private', 'class', 'school', 'public')),
    CONSTRAINT chk_calendar_dates CHECK (end_at IS NULL OR end_at >= start_at)
);

CREATE INDEX idx_calendar_class ON calendar_events(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_start ON calendar_events(start_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_type ON calendar_events(event_type) WHERE deleted_at IS NULL;
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY calendar_events_select ON calendar_events FOR SELECT TO app_role
    USING (deleted_at IS NULL AND (
        is_admin() OR created_by = current_app_user_id() OR current_app_user_id() = ANY(attendees)
        OR visibility IN ('school', 'public')
        OR (visibility = 'class' AND classroom_id IS NOT NULL AND teaches_classroom(classroom_id))
    ));
CREATE POLICY calendar_events_insert ON calendar_events FOR INSERT TO app_role
    WITH CHECK (is_admin() OR created_by = current_app_user_id());
CREATE POLICY calendar_events_update ON calendar_events FOR UPDATE TO app_role
    USING (is_admin() OR created_by = current_app_user_id());
CREATE POLICY calendar_events_delete ON calendar_events FOR DELETE TO app_role
    USING (is_admin() OR created_by = current_app_user_id());

-- Down Migration

DROP TABLE IF EXISTS calendar_events;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS attendance;
