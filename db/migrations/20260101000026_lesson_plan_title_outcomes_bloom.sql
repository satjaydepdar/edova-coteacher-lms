-- Up Migration

-- Lesson Planner update: camel now generates a title and a short learning-
-- outcomes list per plan (see edova-camel/api.py _map_to_lesson_plan), and
-- the generator UI lets the teacher tag a plan with Bloom's Taxonomy levels.
-- `materials` is dropped from the generator UI but the column stays (old
-- saved plans still have data in it; no destructive DROP COLUMN).

ALTER TABLE saved_lesson_plans
    ADD COLUMN title    VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN outcomes JSONB NOT NULL DEFAULT '[]'; -- string[]

-- Bloom's Level pills selected at generation time. Not consumed anywhere
-- yet (see LessonPlanner.tsx) — persisted now so the data exists once the
-- feature that uses it is built.
CREATE TABLE lesson_plan_bloom_levels (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_plan_id UUID NOT NULL REFERENCES saved_lesson_plans(id) ON DELETE CASCADE,
    level          VARCHAR(20) NOT NULL,
    CONSTRAINT uq_lpbl_plan_level UNIQUE (lesson_plan_id, level)
);

CREATE INDEX idx_lpbl_plan ON lesson_plan_bloom_levels(lesson_plan_id);

ALTER TABLE lesson_plan_bloom_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY lesson_plan_bloom_levels_select ON lesson_plan_bloom_levels FOR SELECT TO app_role
    USING (TRUE);
CREATE POLICY lesson_plan_bloom_levels_insert ON lesson_plan_bloom_levels FOR INSERT TO app_role
    WITH CHECK (TRUE);
CREATE POLICY lesson_plan_bloom_levels_delete ON lesson_plan_bloom_levels FOR DELETE TO app_role
    USING (TRUE);

-- Down Migration

DROP TABLE IF EXISTS lesson_plan_bloom_levels;
ALTER TABLE saved_lesson_plans
    DROP COLUMN IF EXISTS title,
    DROP COLUMN IF EXISTS outcomes;
