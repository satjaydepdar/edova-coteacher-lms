-- Up Migration

-- ============================================================
-- USERS
-- ============================================================
-- role is deliberately restricted to what the product actually has today
-- (edova-web's Settings page only ever toggles Teacher/Admin — there is no
-- student or parent login anywhere in the current frontend). Extending this
-- CHECK constraint later when student/parent accounts are actually built is
-- a one-line migration; building RLS for roles with zero consumers today
-- isn't.
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) DEFAULT '00000000-0000-0000-0000-000000000001',
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255),                   -- NULL for SSO users
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    display_name    VARCHAR(200),
    avatar_url      VARCHAR(500),
    phone           VARCHAR(50),
    role            VARCHAR(20) NOT NULL DEFAULT 'teacher',
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret      VARCHAR(255),
    auth_provider    VARCHAR(30) NOT NULL DEFAULT 'password',  -- password/google/microsoft/...
    external_auth_id VARCHAR(255),                              -- SSO subject id — real column,
                                                                  -- not buried in JSONB, since it's
                                                                  -- looked up on every SSO login
    last_login_at   TIMESTAMPTZ,
    login_count     INT NOT NULL DEFAULT 0,
    preferences     JSONB NOT NULL DEFAULT '{}',    -- UI prefs, notification settings
    metadata        JSONB NOT NULL DEFAULT '{}',    -- extensible, non-hot-path extras only
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_role CHECK (role IN ('teacher', 'admin')),
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
    CONSTRAINT chk_users_auth_provider CHECK (auth_provider IN ('password', 'google', 'microsoft', 'other'))
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_name_trgm ON users USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);
CREATE UNIQUE INDEX idx_users_external_auth ON users(auth_provider, external_auth_id)
    WHERE external_auth_id IS NOT NULL;

-- ============================================================
-- AUTH HELPER FUNCTIONS
-- ============================================================
-- Every request handler must SET LOCAL app.current_user_id = '<uuid>' as the
-- first statement in its transaction (never a bare SET — under PgBouncer
-- transaction-mode pooling a bare SET can leak across requests sharing a
-- backend connection). These helpers read that session-local value so RLS
-- policies stay short and consistent instead of repeating the
-- current_setting(...)::UUID cast in every USING clause.
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = current_app_user_id() AND role = 'admin' AND deleted_at IS NULL
    );
$$ LANGUAGE sql STABLE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Every active staff member can see the staff directory (co-teaching, handoffs,
-- and messaging all need to look up other teachers by name) — but only an
-- admin or the user themself can write to a row.
CREATE POLICY users_select_all ON users FOR SELECT TO app_role
    USING (deleted_at IS NULL);
CREATE POLICY users_modify_self_or_admin ON users FOR UPDATE TO app_role
    USING (id = current_app_user_id() OR is_admin());
CREATE POLICY users_insert_admin ON users FOR INSERT TO app_role
    WITH CHECK (is_admin());
CREATE POLICY users_delete_admin ON users FOR DELETE TO app_role
    USING (is_admin());

-- update_updated_at_column() is defined once in the extensions/organizations
-- migration and reused by every table below (and every later migration file).
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- USER SESSIONS (JWT refresh rotation)
-- ============================================================
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_jti       UUID NOT NULL,
    device_fingerprint VARCHAR(500),
    ip_address      INET,
    user_agent      VARCHAR(500),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX idx_sessions_jti ON user_sessions(token_jti);

-- Down Migration

DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS current_app_user_id();
