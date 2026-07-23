-- Up Migration

-- Milestone 1 of the timetable feature: real class-sections and per-section
-- syllabus pacing/progress. This is what "This Week" (Lesson Planner) reads
-- and writes — ticking a taught topic here drives Actual % in Syllabus Map
-- and Course Progress.
--
-- Grain: a class_sections row is one section studying one subject, e.g.
-- "Class 8 — Section A · Mathematics". It hangs off curriculum_subjects
-- (migration 0016), so year/board/class/subject all come from that join —
-- only the section letter (and optional teacher name) are new. Each section
-- then tracks its OWN progress against the shared master syllabus tree
-- (syllabus_units/chapters/topics, migration 0017), because two sections of
-- the same class move through the syllabus at different rates.
--
-- Aligned with edova-web (like migrations 0016-0018), NOT the legacy
-- classrooms/schedules/users tables — reconciling those waits on the auth
-- phase (see db/README.md). Authless for now: no per-teacher scoping.

-- ============================================================
-- CLASS SECTIONS — "Section A" of a curriculum subject
-- ============================================================
CREATE TABLE class_sections (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_subject_id UUID NOT NULL REFERENCES curriculum_subjects(id) ON DELETE CASCADE,
    section               VARCHAR(50) NOT NULL,        -- 'Section A'
    teacher               VARCHAR(120),                -- free text until auth lands
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,

    CONSTRAINT uq_class_sections_subject_section UNIQUE (curriculum_subject_id, section)
);

CREATE INDEX idx_class_sections_subject ON class_sections(curriculum_subject_id) WHERE deleted_at IS NULL;

CREATE TRIGGER update_class_sections_updated_at BEFORE UPDATE ON class_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION UNIT PACING — planned dates/periods for one unit in one section
-- (the CurriculumUnit fields the master syllabus doesn't carry). Created
-- lazily on first edit; a missing row just means "no dates set yet".
-- ============================================================
CREATE TABLE section_unit_pacing (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id       UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    syllabus_unit_id UUID NOT NULL REFERENCES syllabus_units(id) ON DELETE CASCADE,
    planned_start    DATE,
    planned_end      DATE,
    periods          INT,
    weightage        VARCHAR(50),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_section_unit_pacing UNIQUE (section_id, syllabus_unit_id)
);

CREATE INDEX idx_section_unit_pacing_section ON section_unit_pacing(section_id);

CREATE TRIGGER update_section_unit_pacing_updated_at BEFORE UPDATE ON section_unit_pacing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECTION TOPIC PROGRESS — one row per TAUGHT topic (sparse). A row present
-- with done=TRUE means the section has covered that topic; un-ticking deletes
-- the row. Actual % for a unit = taught topics / total topics in that unit.
-- ============================================================
CREATE TABLE section_topic_progress (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id        UUID NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
    syllabus_topic_id UUID NOT NULL REFERENCES syllabus_topics(id) ON DELETE CASCADE,
    done              BOOLEAN NOT NULL DEFAULT TRUE,
    taught_on         DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_section_topic_progress UNIQUE (section_id, syllabus_topic_id)
);

CREATE INDEX idx_section_topic_progress_section ON section_topic_progress(section_id);

CREATE TRIGGER update_section_topic_progress_updated_at BEFORE UPDATE ON section_topic_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: teacher-managed data, open to any app_role for now (scoping to the
-- owning teacher waits on auth) — same posture as saved_lesson_plans (0018).
ALTER TABLE class_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY class_sections_select ON class_sections FOR SELECT TO app_role USING (deleted_at IS NULL);
CREATE POLICY class_sections_insert ON class_sections FOR INSERT TO app_role WITH CHECK (TRUE);
CREATE POLICY class_sections_update ON class_sections FOR UPDATE TO app_role USING (TRUE);
CREATE POLICY class_sections_delete ON class_sections FOR DELETE TO app_role USING (TRUE);

ALTER TABLE section_unit_pacing ENABLE ROW LEVEL SECURITY;
CREATE POLICY section_unit_pacing_all ON section_unit_pacing FOR ALL TO app_role USING (TRUE) WITH CHECK (TRUE);

ALTER TABLE section_topic_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY section_topic_progress_all ON section_topic_progress FOR ALL TO app_role USING (TRUE) WITH CHECK (TRUE);

-- Down Migration

DROP TABLE IF EXISTS section_topic_progress;
DROP TABLE IF EXISTS section_unit_pacing;
DROP TABLE IF EXISTS class_sections;
