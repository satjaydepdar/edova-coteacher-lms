-- Up Migration

-- Saved AI lesson plans (edova-web: Lesson Planner > AI Generator > "Save to
-- My Plans"). The full generated draft is persisted here so a teacher's
-- library survives reload and a saved plan can be re-opened in full — the
-- previous build kept it only in browser memory and discarded the plan body.
--
-- This is deliberately NOT migration 0006's `lesson_plans` table: that one is
-- the authed, classroom-scoped future (NOT NULL classroom_id + created_by,
-- RLS keyed to the acting user), which this authless single-teacher generator
-- flow has no values for yet. Reconciling the two — attaching a saved AI draft
-- to a real classroom/user once auth lands — is Phase 3 work, same as the
-- other edova-web ↔ schema shape gaps noted in db/README.md. The optional
-- curriculum_subject_id link is the seam for that reconciliation.
--
-- Columns mirror edova-web's `LessonPlan` type field-for-field so the API is a
-- straight passthrough.

CREATE TABLE saved_lesson_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic           VARCHAR(255) NOT NULL,
    class_label     VARCHAR(50) NOT NULL,               -- 'Class 10'
    section         VARCHAR(50),                        -- 'Section A' (nullable — generator allows none)
    subject         VARCHAR(120) NOT NULL,              -- 'Mathematics'
    curriculum_subject_id UUID REFERENCES curriculum_subjects(id) ON DELETE SET NULL,
    duration_minutes INT NOT NULL DEFAULT 45,
    standards       JSONB NOT NULL DEFAULT '[]',        -- string[]
    objective       TEXT NOT NULL DEFAULT '',
    materials       JSONB NOT NULL DEFAULT '[]',        -- string[]
    warmup          TEXT NOT NULL DEFAULT '',
    instruction     TEXT NOT NULL DEFAULT '',
    activity        TEXT NOT NULL DEFAULT '',
    assessment      TEXT NOT NULL DEFAULT '',
    homework        TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_slp_duration CHECK (duration_minutes > 0)
);

CREATE INDEX idx_slp_created ON saved_lesson_plans(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_slp_subject ON saved_lesson_plans(curriculum_subject_id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_saved_lesson_plans_updated_at BEFORE UPDATE ON saved_lesson_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Lesson plans are a normal teacher action (not admin-only), so create/read/
-- delete are open to any app_role; scoping to the owning teacher waits on auth.
ALTER TABLE saved_lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_lesson_plans_select ON saved_lesson_plans FOR SELECT TO app_role
    USING (deleted_at IS NULL);
CREATE POLICY saved_lesson_plans_insert ON saved_lesson_plans FOR INSERT TO app_role
    WITH CHECK (TRUE);
CREATE POLICY saved_lesson_plans_update ON saved_lesson_plans FOR UPDATE TO app_role
    USING (TRUE);
CREATE POLICY saved_lesson_plans_delete ON saved_lesson_plans FOR DELETE TO app_role
    USING (TRUE);

-- Down Migration

DROP TABLE IF EXISTS saved_lesson_plans;
