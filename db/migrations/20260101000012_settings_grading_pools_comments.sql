-- Up Migration

-- Note on scope: `workflows`, `scheduled_tasks`, and `webhooks` from the
-- reviewed schema are deliberately NOT created here. Same reasoning as
-- deferring the granular roles/permissions RBAC tables in the users
-- migration — generic workflow-automation and external-webhook
-- infrastructure with zero consumers in the current product is exactly the
-- kind of speculative enterprise-SaaS surface the architecture review
-- flagged. Add them in a later migration once a real feature needs one, not
-- ahead of that need.

-- ============================================================
-- SETTINGS
-- ============================================================
CREATE TABLE user_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category        VARCHAR(50) NOT NULL,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_settings UNIQUE (user_id, category)
);
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_settings_all ON user_settings FOR ALL TO app_role
    USING (user_id = current_app_user_id() OR is_admin());

CREATE TABLE classroom_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    category        VARCHAR(50) NOT NULL,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_classroom_settings UNIQUE (classroom_id, category)
);
CREATE TRIGGER update_classroom_settings_updated_at BEFORE UPDATE ON classroom_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE classroom_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY classroom_settings_all ON classroom_settings FOR ALL TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));

-- ============================================================
-- SHARED GRADING POOLS — co-teaching domain
-- ============================================================
CREATE TABLE shared_grading_pools (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_ids     UUID[] NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_grading_pool UNIQUE (classroom_id, assignment_id, teacher_id),
    CONSTRAINT chk_grading_pool_status CHECK (status IN ('active', 'completed'))
);

CREATE INDEX idx_grading_pool_class ON shared_grading_pools(classroom_id);
CREATE INDEX idx_grading_pool_teacher ON shared_grading_pools(teacher_id);
CREATE TRIGGER update_grading_pools_updated_at BEFORE UPDATE ON shared_grading_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE shared_grading_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY grading_pools_select ON shared_grading_pools FOR SELECT TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY grading_pools_insert ON shared_grading_pools FOR INSERT TO app_role
    WITH CHECK (is_admin() OR teaches_classroom(classroom_id));
CREATE POLICY grading_pools_update ON shared_grading_pools FOR UPDATE TO app_role
    USING (is_admin() OR teacher_id = current_app_user_id());

-- ============================================================
-- COMMENTS — polymorphic (assignment/submission/grade/lesson_plan)
-- ============================================================
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    body            TEXT NOT NULL,
    is_private      BOOLEAN NOT NULL DEFAULT FALSE,  -- visible only to co-teachers, not students/parents later
    mentions        UUID[] NOT NULL DEFAULT '{}',
    attachment_ids  UUID[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_comments_entity_type CHECK (entity_type IN ('assignment', 'submission', 'grade', 'lesson_plan'))
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author ON comments(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- entity_type is polymorphic (no FK), so RLS can't join straight through —
-- this resolves classroom access per known entity_type and denies by
-- default for anything it doesn't recognize, rather than silently allowing.
CREATE OR REPLACE FUNCTION can_access_comment_entity(p_entity_type VARCHAR, p_entity_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    IF is_admin() THEN
        RETURN TRUE;
    END IF;
    IF p_entity_type = 'assignment' THEN
        RETURN EXISTS (SELECT 1 FROM assignments a WHERE a.id = p_entity_id AND teaches_classroom(a.classroom_id));
    ELSIF p_entity_type = 'submission' THEN
        RETURN EXISTS (
            SELECT 1 FROM submissions s JOIN assignments a ON a.id = s.assignment_id
            WHERE s.id = p_entity_id AND teaches_classroom(a.classroom_id)
        );
    ELSIF p_entity_type = 'grade' THEN
        RETURN EXISTS (
            SELECT 1 FROM grades g JOIN assignments a ON a.id = g.assignment_id
            WHERE g.id = p_entity_id AND teaches_classroom(a.classroom_id)
        );
    ELSIF p_entity_type = 'lesson_plan' THEN
        RETURN EXISTS (SELECT 1 FROM lesson_plans lp WHERE lp.id = p_entity_id AND teaches_classroom(lp.classroom_id));
    END IF;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_select ON comments FOR SELECT TO app_role
    USING (deleted_at IS NULL AND (
        author_id = current_app_user_id() OR current_app_user_id() = ANY(mentions)
        OR can_access_comment_entity(entity_type, entity_id)
    ));
CREATE POLICY comments_insert ON comments FOR INSERT TO app_role
    WITH CHECK (author_id = current_app_user_id() AND can_access_comment_entity(entity_type, entity_id));
CREATE POLICY comments_update ON comments FOR UPDATE TO app_role
    USING (author_id = current_app_user_id() OR is_admin());
CREATE POLICY comments_delete ON comments FOR DELETE TO app_role
    USING (author_id = current_app_user_id() OR is_admin());

-- Down Migration

DROP TABLE IF EXISTS comments;
DROP FUNCTION IF EXISTS can_access_comment_entity(VARCHAR, UUID);
DROP TABLE IF EXISTS shared_grading_pools;
DROP TABLE IF EXISTS classroom_settings;
DROP TABLE IF EXISTS user_settings;
