-- Up Migration

-- Renames the "grade level" (school year, e.g. Grade 8) columns to
-- "class level" for terminology consistency with the frontend. This is
-- unrelated to academic grading/scoring (the `grades` table,
-- `gradebook_snapshots`, `enrollments.final_grade`, `grades.letter_grade`,
-- etc.), which keeps its existing naming — that's a different concept and
-- was deliberately left untouched.

ALTER TABLE subjects RENAME COLUMN grade_levels TO class_levels;
ALTER TABLE classrooms RENAME COLUMN grade_level TO class_level;
ALTER TABLE students RENAME COLUMN grade_level TO class_level;

ALTER INDEX idx_students_grade RENAME TO idx_students_class_level;

-- Down Migration

ALTER INDEX idx_students_class_level RENAME TO idx_students_grade;

ALTER TABLE students RENAME COLUMN class_level TO grade_level;
ALTER TABLE classrooms RENAME COLUMN class_level TO grade_level;
ALTER TABLE subjects RENAME COLUMN class_levels TO grade_levels;
