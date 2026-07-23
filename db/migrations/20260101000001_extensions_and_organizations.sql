-- Up Migration

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy text search (teacher/student name lookup)
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- composite GIN indexes

-- ============================================================
-- APPLICATION ROLE
-- ============================================================
-- The API server connects as this role (not a superuser), so RLS policies
-- defined "TO app_role" throughout these migrations actually apply. The
-- migration runner itself connects as a superuser/owner role and is
-- unaffected by RLS. NOLOGIN here on purpose — grant an actual login
-- password to this role outside of version control, in your secrets
-- manager / infra provisioning, not in a migration file.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
        CREATE ROLE app_role NOLOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_role;

-- ============================================================
-- ORGANIZATIONS
-- ============================================================
-- Single-school production: exactly one row will ever exist here. Kept as a
-- table (rather than hardcoded app config) because it's still a reasonable
-- home for school-level branding/settings, and it keeps every other table's
-- organization_id column meaningful without inventing a special-case NULL
-- convention. No subscription/billing columns, no created_by/updated_by —
-- those exist to support signup flows and multi-org auditing that don't
-- apply when the one row is provisioned by this migration, not a user.
CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    timezone        VARCHAR(50) DEFAULT 'UTC',
    locale          VARCHAR(10) DEFAULT 'en-US',
    logo_url        VARCHAR(500),
    settings        JSONB NOT NULL DEFAULT '{}',   -- feature flags, custom config
    branding        JSONB NOT NULL DEFAULT '{}',   -- colors, fonts
    data_retention_days INT NOT NULL DEFAULT 2555, -- 7 years default
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce single-row at the database level, not just by convention — a second
-- INSERT here is a bug, and this makes it fail loudly instead of silently
-- creating a school nothing in the app expects to see.
CREATE UNIQUE INDEX idx_organizations_singleton ON organizations ((true));

INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Edova School')
ON CONFLICT DO NOTHING;

-- Shared by every table with an updated_at column across every later
-- migration — defined once here since organizations is the first to need it.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Down Migration

DROP TABLE IF EXISTS organizations;
DROP FUNCTION IF EXISTS update_updated_at_column();
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM app_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE USAGE, SELECT ON SEQUENCES FROM app_role;
REVOKE USAGE ON SCHEMA public FROM app_role;
DROP ROLE IF EXISTS app_role;
DROP EXTENSION IF EXISTS "btree_gin";
DROP EXTENSION IF EXISTS "pg_trgm";
DROP EXTENSION IF EXISTS "pgcrypto";
DROP EXTENSION IF EXISTS "uuid-ossp";
