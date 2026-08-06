-- Up Migration

-- Saved assessments (edova-web: Assessment Builder > "Save Assessment").
-- Previously the assessment bank lived only in browser memory and every
-- saved assessment was lost on reload. Full section/question content is
-- persisted here (sections JSONB mirrors the AssessmentSection[] wire
-- shape field-for-field) so a saved assessment can be re-opened, edited,
-- and updated in place — the same contract migration 0018 established
-- for saved_lesson_plans. Update-in-place uses PUT; soft-delete column
-- included for parity though no delete UI exists yet.

CREATE TABLE saved_assessments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    class_id        VARCHAR(50),                    -- edova-web seed class id ('c10')
    subject         VARCHAR(120) NOT NULL DEFAULT '',
    term            VARCHAR(50) NOT NULL DEFAULT '',
    academic_year   VARCHAR(20) NOT NULL DEFAULT '',
    objective       TEXT NOT NULL DEFAULT '',
    topic_label     VARCHAR(255) NOT NULL DEFAULT '',
    total_points    INT NOT NULL DEFAULT 0,
    sections        JSONB NOT NULL DEFAULT '[]',    -- AssessmentSection[] verbatim
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_saved_assessments_created ON saved_assessments(created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER update_saved_assessments_updated_at BEFORE UPDATE ON saved_assessments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE saved_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_assessments_select ON saved_assessments FOR SELECT TO app_role
    USING (deleted_at IS NULL);
CREATE POLICY saved_assessments_insert ON saved_assessments FOR INSERT TO app_role
    WITH CHECK (TRUE);
CREATE POLICY saved_assessments_update ON saved_assessments FOR UPDATE TO app_role
    USING (TRUE);
CREATE POLICY saved_assessments_delete ON saved_assessments FOR DELETE TO app_role
    USING (TRUE);

-- Down Migration

DROP TABLE IF EXISTS saved_assessments;
