-- Up Migration

-- ============================================================
-- MESSAGES — unpartitioned (see submissions/grades for the partitioned
-- pattern). At single-school volume, monthly partitioning here is
-- operational overhead with no benefit for years; revisit only if this
-- table crosses roughly 10-20M rows.
-- ============================================================
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id       UUID,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_ids   UUID[] NOT NULL DEFAULT '{}',
    classroom_id    UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    subject         VARCHAR(255),
    body            TEXT NOT NULL,
    message_type    VARCHAR(20) NOT NULL DEFAULT 'direct',
    parent_id       UUID REFERENCES messages(id),
    attachments     JSONB NOT NULL DEFAULT '[]',
    read_receipts   JSONB NOT NULL DEFAULT '{}',    -- {userId: timestamp}
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_message_type CHECK (message_type IN ('direct', 'announcement', 'comment', 'alert')),
    CONSTRAINT chk_message_moderation CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged'))
);

CREATE INDEX idx_messages_sender ON messages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_thread ON messages(thread_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_class ON messages(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_recipients ON messages USING gin (recipient_ids);
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY messages_select ON messages FOR SELECT TO app_role
    USING (deleted_at IS NULL AND (
        is_admin() OR sender_id = current_app_user_id() OR current_app_user_id() = ANY(recipient_ids)
    ));
CREATE POLICY messages_insert ON messages FOR INSERT TO app_role
    WITH CHECK (sender_id = current_app_user_id());
CREATE POLICY messages_update ON messages FOR UPDATE TO app_role
    USING (is_admin() OR sender_id = current_app_user_id() OR current_app_user_id() = ANY(recipient_ids));

-- ============================================================
-- ANNOUNCEMENTS — school-wide broadcasts
-- ============================================================
CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    target_audience JSONB NOT NULL DEFAULT '{}',    -- {role:[], classroom_ids:[], class_levels:[]}
    priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
    expires_at      TIMESTAMPTZ,
    is_pinned       BOOLEAN NOT NULL DEFAULT FALSE,
    pin_until       TIMESTAMPTZ,
    read_count      INT NOT NULL DEFAULT 0,
    attachment_ids  UUID[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,

    CONSTRAINT chk_announcement_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_announcements_priority ON announcements(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_expires ON announcements(expires_at) WHERE deleted_at IS NULL;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
-- Broadcast by nature: every active staff member can read; only the author
-- or an admin can write. (target_audience-based filtering can be layered on
-- in the app query once student/parent logins exist and audience targeting
-- actually needs to exclude someone — with only teacher/admin today,
-- everyone is always the intended audience.)
CREATE POLICY announcements_select ON announcements FOR SELECT TO app_role
    USING (deleted_at IS NULL);
CREATE POLICY announcements_insert ON announcements FOR INSERT TO app_role
    WITH CHECK (created_by = current_app_user_id() OR is_admin());
CREATE POLICY announcements_update ON announcements FOR UPDATE TO app_role
    USING (created_by = current_app_user_id() OR is_admin());
CREATE POLICY announcements_delete ON announcements FOR DELETE TO app_role
    USING (created_by = current_app_user_id() OR is_admin());

CREATE TABLE announcement_reads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_announcement_read UNIQUE (announcement_id, user_id)
);

ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcement_reads_select ON announcement_reads FOR SELECT TO app_role
    USING (is_admin() OR user_id = current_app_user_id());
CREATE POLICY announcement_reads_insert ON announcement_reads FOR INSERT TO app_role
    WITH CHECK (user_id = current_app_user_id());

-- ============================================================
-- NOTIFICATIONS — unpartitioned, strictly own-row visibility
-- ============================================================
CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    action_url      VARCHAR(500),
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    delivery_channels JSONB NOT NULL DEFAULT '[]',  -- ['push','email','sms','in_app']
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    is_actioned     BOOLEAN NOT NULL DEFAULT FALSE,
    priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_notification_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_reference ON notifications(reference_type, reference_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_select ON notifications FOR SELECT TO app_role
    USING (is_admin() OR user_id = current_app_user_id());
CREATE POLICY notifications_update ON notifications FOR UPDATE TO app_role
    USING (user_id = current_app_user_id());

-- Down Migration

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS announcement_reads;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS messages;
