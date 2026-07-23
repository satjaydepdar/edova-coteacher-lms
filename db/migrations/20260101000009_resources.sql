-- Up Migration

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    file_type       VARCHAR(50),
    file_url        VARCHAR(500),
    file_size_bytes BIGINT,
    thumbnail_url   VARCHAR(500),
    metadata        JSONB NOT NULL DEFAULT '{}',
    tags            TEXT[] NOT NULL DEFAULT '{}',
    is_public       BOOLEAN NOT NULL DEFAULT FALSE,   -- visible school-wide, not just to uploader/linked classes
    share_settings  JSONB NOT NULL DEFAULT '{}',
    download_count  INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_resources_type ON resources(file_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_tags ON resources USING gin (tags);
CREATE INDEX idx_resources_uploader ON resources(uploaded_by) WHERE deleted_at IS NULL;
CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CLASSROOM ↔ RESOURCE LINKAGE
-- ============================================================
CREATE TABLE classroom_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    added_by        UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    display_order   INT NOT NULL DEFAULT 0,
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_classroom_resource UNIQUE (classroom_id, resource_id)
);

CREATE INDEX idx_classroom_resources_classroom ON classroom_resources(classroom_id);
CREATE INDEX idx_classroom_resources_resource ON classroom_resources(resource_id);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY resources_select ON resources FOR SELECT TO app_role
    USING (deleted_at IS NULL AND (
        is_admin() OR uploaded_by = current_app_user_id() OR is_public
        OR EXISTS (SELECT 1 FROM classroom_resources cr WHERE cr.resource_id = id AND teaches_classroom(cr.classroom_id))
    ));
CREATE POLICY resources_insert ON resources FOR INSERT TO app_role
    WITH CHECK (uploaded_by = current_app_user_id() OR is_admin());
CREATE POLICY resources_update ON resources FOR UPDATE TO app_role
    USING (uploaded_by = current_app_user_id() OR is_admin());
CREATE POLICY resources_delete ON resources FOR DELETE TO app_role
    USING (uploaded_by = current_app_user_id() OR is_admin());

ALTER TABLE classroom_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY classroom_resources_all ON classroom_resources FOR ALL TO app_role
    USING (is_admin() OR teaches_classroom(classroom_id));

-- Down Migration

-- resources_select's subquery into classroom_resources makes the policy
-- depend on that table — drop the policy before the table, or the table
-- drop fails with "other objects depend on it" even though nothing else
-- references classroom_resources directly.
DROP POLICY IF EXISTS resources_select ON resources;
DROP TABLE IF EXISTS classroom_resources;
DROP TABLE IF EXISTS resources;
