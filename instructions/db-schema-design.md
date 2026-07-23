- ============================================================
-- EDOVA CO-TEACHER APP — ENTERPRISE POSTGRESQL SCHEMA
-- Target: 5,000+ concurrent users | Sub-100ms P95 queries
-- Features: Multi-tenant, RBAC, JSONB, Partitioning, RLS
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- For composite GIN indexes

-- ============================================================
-- 1. ORGANIZATION & TENANCY
-- ============================================================

CREATE TABLE organizations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    logo_url        VARCHAR(500),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    locale          VARCHAR(10) DEFAULT 'en-US',
    subscription_tier VARCHAR(20) DEFAULT 'standard', -- free/standard/premium/enterprise
    subscription_expires_at TIMESTAMPTZ,
    settings        JSONB DEFAULT '{}',            -- Feature flags, custom configs
    branding        JSONB DEFAULT '{}',            -- Colors, fonts, custom CSS
    data_retention_days INT DEFAULT 2555,          -- 7 years default
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,                    -- Soft delete
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_organizations_slug ON organizations(slug) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_active ON organizations(is_active) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. USERS & AUTHENTICATION (RBAC)
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    username        VARCHAR(100),
    password_hash   VARCHAR(255),                   -- NULL for SSO users
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    display_name    VARCHAR(200),
    avatar_url      VARCHAR(500),
    phone           VARCHAR(50),
    role            VARCHAR(20) NOT NULL DEFAULT 'teacher', 
                                    -- super_admin/admin/principal/teacher/student/parent/observer
    status          VARCHAR(20) DEFAULT 'active',   -- active/inactive/suspended/pending
    email_verified  BOOLEAN DEFAULT FALSE,
    mfa_enabled     BOOLEAN DEFAULT FALSE,
    mfa_secret      VARCHAR(255),                   -- Encrypted TOTP secret
    last_login_at   TIMESTAMPTZ,
    login_count     INT DEFAULT 0,
    preferences     JSONB DEFAULT '{}',             -- UI prefs, notification settings
    profile         JSONB DEFAULT '{}',             -- Extensible profile data
    gdpr_consent    BOOLEAN DEFAULT FALSE,
    gdpr_consent_at TIMESTAMPTZ,
    data_retention_expiry TIMESTAMPTZ,
    metadata        JSONB DEFAULT '{}',             -- SSO provider IDs, external refs
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT uq_users_email_org UNIQUE (email, organization_id),
    CONSTRAINT uq_users_username_org UNIQUE (username, organization_id)
);

-- Partitioning candidate: users by organization_id (if >1M users)
CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_name_trgm ON users USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_tenant_isolation ON users
    FOR ALL TO app_role
    USING (organization_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY users_self_access ON users
    FOR SELECT TO app_role
    USING (id = current_setting('app.current_user_id')::UUID);

-- User sessions for JWT refresh rotation
CREATE TABLE user_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_jti       UUID NOT NULL,                  -- JWT ID for revocation
    device_fingerprint VARCHAR(500),
    ip_address      INET,
    user_agent      VARCHAR(500),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX idx_sessions_jti ON user_sessions(token_jti);

-- Role-based permissions (granular RBAC)
CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(50) NOT NULL,
    description     TEXT,
    permissions     JSONB NOT NULL DEFAULT '[]',    -- Array of permission strings
    is_system       BOOLEAN DEFAULT FALSE,          -- Built-in roles cannot be deleted
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_roles_name_org UNIQUE (name, organization_id)
);

CREATE TABLE user_roles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    classroom_id    UUID,                           -- NULL = org-wide role
    assigned_at     TIMESTAMPTZ DEFAULT NOW(),
    assigned_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    
    CONSTRAINT uq_user_role_class UNIQUE (user_id, role_id, classroom_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_classroom ON user_roles(classroom_id);

-- ============================================================
-- 3. ACADEMIC STRUCTURE (Subjects, Curriculum)
-- ============================================================

CREATE TABLE subjects (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    code            VARCHAR(50),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(100),                   -- STEM/Humanities/Arts/etc
    grade_levels    INT[] DEFAULT '{}',              -- Array of applicable grades
    color_code      VARCHAR(7),                      -- Hex color for UI
    icon            VARCHAR(100),
    parent_subject_id UUID REFERENCES subjects(id),   -- For sub-topics
    standards_framework VARCHAR(100),                 -- CCSS/NGSS/state
    metadata        JSONB DEFAULT '{}',              -- Standards mappings
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    CONSTRAINT uq_subjects_code_org UNIQUE (code, organization_id)
);

CREATE INDEX idx_subjects_org ON subjects(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_active ON subjects(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_subjects_parent ON subjects(parent_subject_id) WHERE deleted_at IS NULL;

-- Curriculum/Units mapping
CREATE TABLE curriculum_units (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    sequence_order  INT NOT NULL DEFAULT 0,
    duration_days   INT,
    standards        JSONB DEFAULT '[]',             -- Linked standards
    learning_objectives JSONB DEFAULT '[]',
    prerequisites   UUID[] DEFAULT '{}',             -- Required unit IDs
    resources       JSONB DEFAULT '[]',               -- Linked resource IDs
    is_published    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_curriculum_subject ON curriculum_units(subject_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_curriculum_sequence ON curriculum_units(sequence_order) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. CLASSROOMS & SECTIONS (Core to Co-Teaching)
-- ============================================================

CREATE TABLE classrooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(50),
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    grade_level     INT NOT NULL,
    section         VARCHAR(50),                     -- A, B, C, etc.
    academic_year   VARCHAR(20) NOT NULL,            -- 2025-2026
    semester        VARCHAR(20),                     -- Fall/Spring/Summer
    schedule        JSONB DEFAULT '{}',              -- Days, times, room info
    max_students    INT DEFAULT 30,
    is_active       BOOLEAN DEFAULT TRUE,
    is_archived     BOOLEAN DEFAULT FALSE,
    archived_at     TIMESTAMPTZ,
    settings        JSONB DEFAULT '{}',              -- Grading scale, late policy
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    CONSTRAINT uq_classroom_code_year UNIQUE (code, academic_year, organization_id)
);

CREATE INDEX idx_classrooms_org ON classrooms(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_classrooms_subject ON classrooms(subject_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_classrooms_year ON classrooms(academic_year) WHERE deleted_at IS NULL;
CREATE INDEX idx_classrooms_active ON classrooms(is_active, is_archived) WHERE deleted_at IS NULL;
CREATE INDEX idx_classrooms_schedule ON classrooms USING gin (schedule);

-- Co-Teaching Assignments (CRITICAL for Edova)
CREATE TABLE co_teaching_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_type       VARCHAR(30) NOT NULL DEFAULT 'co_teacher', 
                    -- primary_teacher/co_teacher/lead/support/observer/assistant
    responsibilities JSONB DEFAULT '[]',             -- ["grading", "attendance", "lesson_planning"]
    permissions     JSONB DEFAULT '{}',              -- Custom per-class permissions
    start_date      DATE NOT NULL,
    end_date        DATE,
    is_primary      BOOLEAN DEFAULT FALSE,           -- One primary per classroom
    handoff_notes   TEXT,                            -- Transition notes
    status          VARCHAR(20) DEFAULT 'active',   -- active/pending/ended
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_coteach_class_teacher UNIQUE (classroom_id, teacher_id)
);

CREATE INDEX idx_coteach_classroom ON co_teaching_assignments(classroom_id);
CREATE INDEX idx_coteach_teacher ON co_teaching_assignments(teacher_id);
CREATE INDEX idx_coteach_primary ON co_teaching_assignments(classroom_id, is_primary) WHERE is_primary = TRUE;

-- Teacher Handoffs (Lesson transitions between co-teachers)
CREATE TABLE teacher_handoffs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    from_teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_teacher_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    handoff_date    TIMESTAMPTZ NOT NULL,
    lesson_context  JSONB NOT NULL DEFAULT '{}',     -- Current lesson, progress, notes
    student_notes   JSONB DEFAULT '[]',              -- Individual student notes
    materials_status JSONB DEFAULT '{}',             -- Resources handed over
    status          VARCHAR(20) DEFAULT 'pending',  -- pending/acknowledged/completed
    acknowledged_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_handoffs_classroom ON teacher_handoffs(classroom_id);
CREATE INDEX idx_handoffs_from ON teacher_handoffs(from_teacher_id);
CREATE INDEX idx_handoffs_to ON teacher_handoffs(to_teacher_id);
CREATE INDEX idx_handoffs_status ON teacher_handoffs(status);

-- ============================================================
-- 5. STUDENTS & ENROLLMENTS
-- ============================================================

CREATE TABLE students (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE, -- If student has login
    student_number  VARCHAR(50) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    date_of_birth   DATE,
    grade_level     INT,
    email           VARCHAR(255),
    phone           VARCHAR(50),
    emergency_contact JSONB DEFAULT '{}',
    demographics    JSONB DEFAULT '{}',             -- IEP, 504, ELL status
    medical_notes   TEXT,
    photo_url       VARCHAR(500),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    
    CONSTRAINT uq_student_number_org UNIQUE (student_number, organization_id)
);

CREATE INDEX idx_students_org ON students(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_user ON students(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_students_grade ON students(grade_level) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_name_trgm ON students USING gin (first_name gin_trgm_ops, last_name gin_trgm_ops);

-- Enrollments (with soft-delete for drops)
CREATE TABLE enrollments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status          VARCHAR(20) DEFAULT 'active',   -- active/dropped/completed/transferred/suspended
    enrolled_at     TIMESTAMPTZ DEFAULT NOW(),
    dropped_at      TIMESTAMPTZ,
    drop_reason     VARCHAR(100),
    final_grade     VARCHAR(10),
    metadata        JSONB DEFAULT '{}',              -- Custom enrollment data
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_enrollment_class_student UNIQUE (classroom_id, student_id)
);

CREATE INDEX idx_enrollments_class ON enrollments(classroom_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_enrollments_active ON enrollments(classroom_id, student_id) WHERE status = 'active';

-- ============================================================
-- 6. LESSON PLANS & CONTENT
-- ============================================================

CREATE TABLE lesson_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    unit_id         UUID REFERENCES curriculum_units(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    objectives      JSONB DEFAULT '[]',
    standards       JSONB DEFAULT '[]',
    materials       JSONB DEFAULT '[]',              -- Required resources
    procedure       JSONB DEFAULT '{}',              -- Step-by-step activities
    duration_minutes INT DEFAULT 45,
    scheduled_date  DATE,
    status          VARCHAR(20) DEFAULT 'draft',     -- draft/planned/scheduled/completed/cancelled
    version         INT DEFAULT 1,
    parent_plan_id  UUID REFERENCES lesson_plans(id), -- For versioning
    is_template     BOOLEAN DEFAULT FALSE,
    shared_with     UUID[] DEFAULT '{}',             -- Co-teachers with access
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_lessons_classroom ON lesson_plans(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_unit ON lesson_plans(unit_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_date ON lesson_plans(scheduled_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_status ON lesson_plans(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_creator ON lesson_plans(created_by) WHERE deleted_at IS NULL;

-- ============================================================
-- 7. ASSIGNMENTS & ASSESSMENTS
-- ============================================================

CREATE TABLE assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    lesson_plan_id  UUID REFERENCES lesson_plans(id) ON DELETE SET NULL,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    type            VARCHAR(30) NOT NULL DEFAULT 'homework', 
                    -- homework/classwork/quiz/exam/project/essay/presentation/lab/participation
    instructions    TEXT,
    rubric          JSONB DEFAULT '{}',              -- Grading criteria JSONB
    points_possible NUMERIC(8,2) DEFAULT 100,
    allowed_attempts INT DEFAULT 1,
    time_limit_minutes INT,
    due_date        TIMESTAMPTZ,
    available_from  TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    late_policy     JSONB DEFAULT '{}',              -- Deduction %, grace period
    settings        JSONB DEFAULT '{}',              -- Randomization, show answers, etc.
    attachments     JSONB DEFAULT '[]',              -- File references
    status          VARCHAR(20) DEFAULT 'draft',   -- draft/published/closed/archived
    is_graded       BOOLEAN DEFAULT TRUE,
    version         INT DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_assignments_class ON assignments(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_type ON assignments(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_due ON assignments(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_status ON assignments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_assignments_rubric ON assignments USING gin (rubric);

-- Question bank (for quizzes/exams)
CREATE TABLE question_bank (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    question_type   VARCHAR(30) NOT NULL,            -- multiple_choice/true_false/short_answer/essay/matching/fill_blank
    question_text   TEXT NOT NULL,
    options         JSONB DEFAULT '[]',              -- For MC: [{text, isCorrect, feedback}]
    correct_answer  JSONB,                           -- Structured answer data
    explanation     TEXT,
    points          NUMERIC(5,2) DEFAULT 1,
    difficulty      INT DEFAULT 3,                   -- 1-5 scale
    tags            TEXT[] DEFAULT '{}',
    standards       JSONB DEFAULT '[]',
    usage_count     INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_qb_org ON question_bank(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_qb_type ON question_bank(question_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_qb_tags ON question_bank USING gin (tags);
CREATE INDEX idx_qb_difficulty ON question_bank(difficulty) WHERE deleted_at IS NULL;

-- Assignment-Question linkage
CREATE TABLE assignment_questions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    question_id     UUID NOT NULL REFERENCES question_bank(id) ON DELETE CASCADE,
    sequence_order  INT NOT NULL DEFAULT 0,
    points_override NUMERIC(5,2),
    settings        JSONB DEFAULT '{}'               -- Question-specific settings
);

CREATE INDEX idx_aq_assignment ON assignment_questions(assignment_id);
CREATE INDEX idx_aq_sequence ON assignment_questions(assignment_id, sequence_order);

-- ============================================================
-- 8. SUBMISSIONS & GRADES
-- ============================================================

-- Partitioned by academic year (range partitioning)
CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submission_type VARCHAR(20) DEFAULT 'final',   -- draft/final/resubmission
    attempt_number  INT DEFAULT 1,
    answers         JSONB DEFAULT '{}',            -- Student responses
    attachments     JSONB DEFAULT '[]',              -- Uploaded files
    text_response   TEXT,
    started_at      TIMESTAMPTZ,
    submitted_at    TIMESTAMPTZ,
    is_late         BOOLEAN DEFAULT FALSE,
    late_minutes    INT DEFAULT 0,
    plagiarism_score NUMERIC(5,2),                  -- Turnitin/similar integration
    plagiarism_report_url VARCHAR(500),
    status          VARCHAR(20) DEFAULT 'submitted', -- started/submitted/graded/returned
    academic_year   VARCHAR(20) NOT NULL,           -- Partition key
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (academic_year);

-- Create partitions for current + 5 years
CREATE TABLE submissions_y2025 PARTITION OF submissions
    FOR VALUES FROM ('2025-2026') TO ('2026-2027');
CREATE TABLE submissions_y2026 PARTITION OF submissions
    FOR VALUES FROM ('2026-2027') TO ('2027-2028');
CREATE TABLE submissions_y2027 PARTITION OF submissions
    FOR VALUES FROM ('2027-2028') TO ('2028-2029');
CREATE TABLE submissions_y2028 PARTITION OF submissions
    FOR VALUES FROM ('2028-2029') TO ('2029-2030');
CREATE TABLE submissions_y2029 PARTITION OF submissions
    FOR VALUES FROM ('2029-2030') TO ('2030-2031');

CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_type ON submissions(submission_type);
CREATE INDEX idx_submissions_answers ON submissions USING gin (answers);

-- Grades (with audit trail)
CREATE TABLE grades (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id   UUID REFERENCES submissions(id) ON DELETE CASCADE,
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    grader_id       UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    points_earned   NUMERIC(8,2),
    points_possible NUMERIC(8,2),
    percentage      NUMERIC(5,2),
    letter_grade    VARCHAR(5),
    rubric_scores   JSONB DEFAULT '[]',             -- [{criterionId, score, maxPoints, comment}]
    feedback        TEXT,
    is_excused      BOOLEAN DEFAULT FALSE,
    is_missing      BOOLEAN DEFAULT FALSE,
    override_history JSONB DEFAULT '[]',            -- [{previousGrade, changedBy, changedAt, reason}]
    status          VARCHAR(20) DEFAULT 'draft',   -- draft/published/returned/hidden
    published_at    TIMESTAMPTZ,
    academic_year   VARCHAR(20) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (academic_year);

-- Grade partitions
CREATE TABLE grades_y2025 PARTITION OF grades
    FOR VALUES FROM ('2025-2026') TO ('2026-2027');
CREATE TABLE grades_y2026 PARTITION OF grades
    FOR VALUES FROM ('2026-2027') TO ('2027-2028');
CREATE TABLE grades_y2027 PARTITION OF grades
    FOR VALUES FROM ('2027-2028') TO ('2028-2029');
CREATE TABLE grades_y2028 PARTITION OF grades
    FOR VALUES FROM ('2028-2029') TO ('2029-2030');
CREATE TABLE grades_y2029 PARTITION OF grades
    FOR VALUES FROM ('2029-2030') TO ('2030-2031');

CREATE INDEX idx_grades_assignment ON grades(assignment_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_grader ON grades(grader_id);
CREATE INDEX idx_grades_status ON grades(status);
CREATE INDEX idx_grades_rubric ON grades USING gin (rubric_scores);

-- Gradebook snapshots (pre-aggregated for performance)
CREATE TABLE gradebook_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    category_id     UUID,                            -- Assignment category
    total_points    NUMERIC(10,2) DEFAULT 0,
    earned_points   NUMERIC(10,2) DEFAULT 0,
    percentage      NUMERIC(5,2),
    letter_grade    VARCHAR(5),
    assignment_count INT DEFAULT 0,
    missing_count   INT DEFAULT 0,
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_snapshot_class_student_cat UNIQUE (classroom_id, student_id, category_id)
);

CREATE INDEX idx_snapshots_class ON gradebook_snapshots(classroom_id);
CREATE INDEX idx_snapshots_student ON gradebook_snapshots(student_id);

-- ============================================================
-- 9. ATTENDANCE
-- ============================================================

CREATE TABLE attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'present', 
                    -- present/absent/tardy/excused/early_departure/field_trip
    period          VARCHAR(20),                     -- For period-based attendance
    notes           TEXT,
    recorded_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    recorded_at     TIMESTAMPTZ DEFAULT NOW(),
    is_excused      BOOLEAN DEFAULT FALSE,
    excuse_reason   VARCHAR(255),
    excuse_document JSONB,                           -- Uploaded excuse note
    academic_year   VARCHAR(20) NOT NULL,
    
    CONSTRAINT uq_attendance UNIQUE (classroom_id, student_id, date, period)
);

-- BRIN index for append-only time-series data
CREATE INDEX idx_attendance_date ON attendance USING brin (date);
CREATE INDEX idx_attendance_class ON attendance(classroom_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_status ON attendance(status);

-- ============================================================
-- 10. SCHEDULE & CALENDAR
-- ============================================================

CREATE TABLE schedules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week     INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    room            VARCHAR(100),
    is_recurring    BOOLEAN DEFAULT TRUE,
    effective_from  DATE NOT NULL,
    effective_until DATE,
    exceptions      JSONB DEFAULT '[]',             -- Holiday overrides
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_schedule_time CHECK (end_time > start_time)
);

CREATE INDEX idx_schedules_class ON schedules(classroom_id);
CREATE INDEX idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX idx_schedules_day ON schedules(day_of_week);

-- Calendar events (assignments, exams, meetings, etc.)
CREATE TABLE calendar_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    classroom_id    UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    event_type      VARCHAR(30) NOT NULL,           -- assignment/exam/meeting/holiday/event
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ,
    is_all_day      BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,                           -- iCal RRULE format
    attendees       UUID[] DEFAULT '{}',             -- User IDs
    reminders       JSONB DEFAULT '[]',              -- [{minutes_before, method}]
    visibility      VARCHAR(20) DEFAULT 'class',    -- private/class/school/public
    color           VARCHAR(7),
    metadata        JSONB DEFAULT '{}',              -- Linked assignment_id, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_calendar_org ON calendar_events(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_class ON calendar_events(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_start ON calendar_events(start_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_type ON calendar_events(event_type) WHERE deleted_at IS NULL;

-- ============================================================
-- 11. RESOURCES & MATERIALS
-- ============================================================

CREATE TABLE resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    file_type       VARCHAR(50),                     -- pdf/doc/video/image/link
    file_url        VARCHAR(500),
    file_size_bytes BIGINT,
    thumbnail_url   VARCHAR(500),
    metadata        JSONB DEFAULT '{}',              -- Duration, dimensions, etc.
    tags            TEXT[] DEFAULT '{}',
    is_public       BOOLEAN DEFAULT FALSE,
    share_settings  JSONB DEFAULT '{}',              -- Per-classroom or user access
    download_count  INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_resources_org ON resources(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_type ON resources(file_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_resources_tags ON resources USING gin (tags);
CREATE INDEX idx_resources_uploader ON resources(uploaded_by) WHERE deleted_at IS NULL;

-- Resource-Classroom linkage
CREATE TABLE classroom_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    resource_id     UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    added_by        UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    added_at        TIMESTAMPTZ DEFAULT NOW(),
    display_order   INT DEFAULT 0,
    is_required     BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT uq_classroom_resource UNIQUE (classroom_id, resource_id)
);

-- ============================================================
-- 12. COMMUNICATION (Messages, Announcements)
-- ============================================================

-- Messages (threaded conversations)
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id       UUID,                            -- NULL = new thread
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_ids   UUID[] NOT NULL DEFAULT '{}',    -- For group messages
    classroom_id    UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    subject         VARCHAR(255),
    body            TEXT NOT NULL,
    message_type    VARCHAR(20) DEFAULT 'direct',     -- direct/announcement/comment/alert
    parent_id       UUID REFERENCES messages(id),   -- For threaded replies
    attachments     JSONB DEFAULT '[]',
    read_receipts   JSONB DEFAULT '{}',              -- {userId: timestamp}
    is_pinned       BOOLEAN DEFAULT FALSE,
    moderation_status VARCHAR(20) DEFAULT 'approved', -- pending/approved/rejected/flagged
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
) PARTITION BY RANGE (created_at);

-- Monthly partitions for messages
CREATE TABLE messages_2026_01 PARTITION OF messages
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE messages_2026_02 PARTITION OF messages
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE messages_2026_03 PARTITION OF messages
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX idx_messages_sender ON messages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_thread ON messages(thread_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_class ON messages(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_recipients ON messages USING gin (recipient_ids);

-- Announcements (targeted broadcasts)
CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    target_audience JSONB NOT NULL DEFAULT '{}',     -- {role: ['teacher'], classroom_ids: [], grade_levels: []}
    priority        VARCHAR(10) DEFAULT 'normal',    -- low/normal/high/urgent
    expires_at      TIMESTAMPTZ,
    is_pinned       BOOLEAN DEFAULT FALSE,
    pin_until       TIMESTAMPTZ,
    read_count      INT DEFAULT 0,
    attachment_ids  UUID[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_announcements_org ON announcements(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_priority ON announcements(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_expires ON announcements(expires_at) WHERE deleted_at IS NULL;

-- Announcement read tracking
CREATE TABLE announcement_reads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_announcement_read UNIQUE (announcement_id, user_id)
);

-- ============================================================
-- 13. NOTIFICATIONS & ACTIVITY FEED
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(50) NOT NULL,             -- grade_posted/assignment_due/announcement/handoff/etc
    title           VARCHAR(255) NOT NULL,
    body            TEXT,
    action_url      VARCHAR(500),                    -- Deep link
    actor_id        UUID REFERENCES users(id),       -- Who triggered it
    reference_type  VARCHAR(50),                     -- assignment/grade/message/etc
    reference_id    UUID,
    delivery_channels JSONB DEFAULT '[]',            -- ['push', 'email', 'sms', 'in_app']
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    is_actioned     BOOLEAN DEFAULT FALSE,
    priority        VARCHAR(10) DEFAULT 'normal',
    created_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE notifications_2026_01 PARTITION OF notifications
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE notifications_2026_02 PARTITION OF notifications
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE notifications_2026_03 PARTITION OF notifications
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_reference ON notifications(reference_type, reference_id);

-- Activity log (immutable audit trail)
CREATE TABLE activity_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES users(id),
    actor_type      VARCHAR(20) DEFAULT 'user',     -- user/system/api
    action          VARCHAR(50) NOT NULL,            -- create/update/delete/login/view
    entity_type     VARCHAR(50) NOT NULL,            -- assignment/grade/student/etc
    entity_id       UUID,
    old_values      JSONB,
    new_values      JSONB,
    ip_address      INET,
    user_agent      VARCHAR(500),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Weekly partitions for activity logs
CREATE TABLE activity_logs_2026_w01 PARTITION OF activity_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-01-08');
CREATE TABLE activity_logs_2026_w02 PARTITION OF activity_logs
    FOR VALUES FROM ('2026-01-08') TO ('2026-01-15');

CREATE INDEX idx_activity_org ON activity_logs(organization_id);
CREATE INDEX idx_activity_actor ON activity_logs(actor_id);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_action ON activity_logs(action, entity_type);

-- ============================================================
-- 14. ANALYTICS & REPORTING
-- ============================================================

-- Pre-aggregated analytics snapshots
CREATE TABLE analytics_snapshots (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    classroom_id    UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    snapshot_type   VARCHAR(50) NOT NULL,            -- grade_distribution/attendance_rate/etc
    snapshot_date   DATE NOT NULL,
    metrics         JSONB NOT NULL DEFAULT '{}',     -- {avg: 85, median: 87, std_dev: 5.2}
    dimensions      JSONB DEFAULT '{}',                -- {grade_level: 8, subject: 'Math'}
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_snapshot UNIQUE (organization_id, classroom_id, snapshot_type, snapshot_date)
);

CREATE INDEX idx_analytics_org ON analytics_snapshots(organization_id);
CREATE INDEX idx_analytics_class ON analytics_snapshots(classroom_id);
CREATE INDEX idx_analytics_type ON analytics_snapshots(snapshot_type);
CREATE INDEX idx_analytics_date ON analytics_snapshots(snapshot_date);

-- Materialized view for dashboard metrics (refresh strategy: every 15 min)
CREATE MATERIALIZED VIEW mv_dashboard_metrics AS
SELECT 
    c.organization_id,
    c.id as classroom_id,
    c.name as classroom_name,
    COUNT(DISTINCT e.student_id) as student_count,
    COUNT(DISTINCT a.id) as assignment_count,
    COUNT(DISTINCT s.id) FILTER (WHERE s.status = 'submitted') as submission_count,
    AVG(g.percentage) as avg_grade,
    COUNT(DISTINCT att.id) FILTER (WHERE att.status = 'absent') as absence_count
FROM classrooms c
LEFT JOIN enrollments e ON c.id = e.classroom_id AND e.status = 'active'
LEFT JOIN assignments a ON c.id = a.classroom_id AND a.deleted_at IS NULL
LEFT JOIN submissions s ON a.id = s.assignment_id
LEFT JOIN grades g ON s.id = g.submission_id AND g.status = 'published'
LEFT JOIN attendance att ON c.id = att.classroom_id AND att.date = CURRENT_DATE
WHERE c.deleted_at IS NULL AND c.is_active = TRUE
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX idx_mv_dashboard ON mv_dashboard_metrics(classroom_id);

-- ============================================================
-- 15. WORKFLOW & AUTOMATION
-- ============================================================

CREATE TABLE workflows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    entity_type     VARCHAR(50) NOT NULL,            -- assignment/grade/attendance
    trigger_type    VARCHAR(50) NOT NULL,            -- on_create/on_update/on_schedule
    conditions      JSONB NOT NULL DEFAULT '[]',      -- [{field, operator, value}]
    actions         JSONB NOT NULL DEFAULT '[]',      -- [{type, config}]
    is_active       BOOLEAN DEFAULT TRUE,
    run_count       INT DEFAULT 0,
    last_run_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_type ON workflows(entity_type);

-- Scheduled tasks (for reminders, report generation)
CREATE TABLE scheduled_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    task_type       VARCHAR(50) NOT NULL,            -- reminder/report_cleanup/backup
    cron_expression VARCHAR(100) NOT NULL,
    next_run_at     TIMESTAMPTZ NOT NULL,
    last_run_at     TIMESTAMPTZ,
    last_run_status VARCHAR(20),                     -- success/failed/running
    last_run_output TEXT,
    payload         JSONB DEFAULT '{}',              -- Task-specific data
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_tasks_next ON scheduled_tasks(next_run_at) WHERE is_active = TRUE;

-- Webhooks for external integrations
CREATE TABLE webhooks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    url             VARCHAR(500) NOT NULL,
    secret          VARCHAR(255),                    -- For HMAC verification
    events          JSONB NOT NULL DEFAULT '[]',     -- ['grade.published', 'assignment.created']
    is_active       BOOLEAN DEFAULT TRUE,
    retry_count     INT DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    last_status     VARCHAR(20),
    last_response   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. SETTINGS & CONFIGURATIONS
-- ============================================================

CREATE TABLE user_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category        VARCHAR(50) NOT NULL,            -- notification/display/calendar/grading
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_user_settings UNIQUE (user_id, category)
);

CREATE TABLE classroom_settings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    category        VARCHAR(50) NOT NULL,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_classroom_settings UNIQUE (classroom_id, category)
);

-- ============================================================
-- 17. AUDIT & COMPLIANCE
-- ============================================================

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name      VARCHAR(100) NOT NULL,
    record_id       UUID NOT NULL,
    action          VARCHAR(20) NOT NULL,            -- INSERT/UPDATE/DELETE
    old_values      JSONB,
    new_values      JSONB,
    actor_id        UUID REFERENCES users(id),
    ip_address      INET,
    session_id      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Weekly partitions
CREATE TABLE audit_logs_2026_w01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-01-08');

CREATE INDEX idx_audit_table ON audit_logs(table_name);
CREATE INDEX idx_audit_record ON audit_logs(record_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);

-- ============================================================
-- 18. SHARED GRADING POOLS (Co-Teaching Feature)
-- ============================================================

CREATE TABLE shared_grading_pools (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    assignment_id   UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_ids     UUID[] NOT NULL DEFAULT '{}',    -- Students assigned to this teacher
    status          VARCHAR(20) DEFAULT 'active',   -- active/completed
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT uq_grading_pool UNIQUE (classroom_id, assignment_id, teacher_id)
);

CREATE INDEX idx_grading_pool_class ON shared_grading_pools(classroom_id);
CREATE INDEX idx_grading_pool_teacher ON shared_grading_pools(teacher_id);

-- ============================================================
-- 19. COMMENTS & FEEDBACK
-- ============================================================

CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type     VARCHAR(50) NOT NULL,            -- assignment/submission/grade/lesson
    entity_id       UUID NOT NULL,
    body            TEXT NOT NULL,
    is_private      BOOLEAN DEFAULT FALSE,            -- Only visible to co-teachers
    mentions        UUID[] DEFAULT '{}',             -- Mentioned user IDs
    attachment_ids  UUID[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_author ON comments(author_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Organization isolation policy (applied to all tables)
CREATE POLICY org_isolation_classrooms ON classrooms FOR ALL TO app_role
    USING (organization_id = current_setting('app.current_org_id')::UUID);
CREATE POLICY org_isolation_students ON students FOR ALL TO app_role
    USING (organization_id = current_setting('app.current_org_id')::UUID);
CREATE POLICY org_isolation_assignments ON assignments FOR ALL TO app_role
    USING (classroom_id IN (SELECT id FROM classrooms WHERE organization_id = current_setting('app.current_org_id')::UUID));

-- Classroom-specific access (teachers see their classes, students see enrolled)
CREATE POLICY classroom_access_enrollments ON enrollments FOR ALL TO app_role
    USING (classroom_id IN (
        SELECT classroom_id FROM co_teaching_assignments 
        WHERE teacher_id = current_setting('app.current_user_id')::UUID
        UNION
        SELECT e.classroom_id FROM enrollments e 
        WHERE e.student_id = current_setting('app.current_student_id')::UUID
    ));

-- ============================================================
-- TRIGGERS FOR AUDIT & UPDATED_AT
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ... (apply to all other tables with updated_at)

-- Audit trigger
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, actor_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), current_setting('app.current_user_id')::UUID);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, actor_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), current_setting('app.current_user_id')::UUID);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, actor_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), current_setting('app.current_user_id')::UUID);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger to critical tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_grades AFTER INSERT OR UPDATE OR DELETE ON grades
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_assignments AFTER INSERT OR UPDATE OR DELETE ON assignments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();


---------------------------------------------------------------------------------------------------------------------------------------------------
3. JSONB SCHEMA DEFINITIONS
Here are the expected JSONB schemas for key fields:

// classrooms.settings
{
  "grading_scale": "percentage",      // percentage/letter/gpa
  "grade_categories": [
    {"name": "Homework", "weight": 20},
    {"name": "Quizzes", "weight": 30},
    {"name": "Exams", "weight": 50}
  ],
  "late_policy": {
    "grace_period_minutes": 60,
    "deduction_per_day": 10,
    "max_deduction": 50
  },
  "allow_late_submissions": true,
  "default_visibility": "class",
  "custom_fields": {}
}

// assignments.rubric
{
  "criteria": [
    {
      "id": "c1",
      "name": "Content Knowledge",
      "description": "Demonstrates understanding of key concepts",
      "max_points": 10,
      "levels": [
        {"score": 10, "description": "Excellent"},
        {"score": 7, "description": "Good"},
        {"score": 5, "description": "Satisfactory"},
        {"score": 0, "description": "Needs Improvement"}
      ]
    }
  ]
}

// co_teaching_assignments.responsibilities
["grading", "attendance", "lesson_planning", "parent_communication", "iep_management"]

// teacher_handoffs.lesson_context
{
  "current_unit": "Photosynthesis",
  "lesson_number": 5,
  "completed_topics": ["Light reactions", "Calvin cycle"],
  "upcoming_topics": ["Factors affecting photosynthesis"],
  "student_mastery": {
    "student_id_1": 85,
    "student_id_2": 72
  },
  "materials_used": ["Lab kit A", "Slides 1-15"],
  "notes": "Group 3 needs extra support on Calvin cycle"
}

// notifications.delivery_channels
["push", "email", "in_app"]

// user.preferences
{
  "theme": "light",
  "language": "en",
  "timezone": "America/New_York",
  "notification_settings": {
    "grade_posted": ["push", "email"],
    "assignment_due": ["push"],
    "announcement": ["in_app"]
  },
  "dashboard_layout": {
    "widgets": ["upcoming_assignments", "recent_grades", "attendance_alert"]
  }
}
