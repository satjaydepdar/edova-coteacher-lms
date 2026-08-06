-- Up Migration

-- Real classrooms for the remaining edova-web seed classes (c1-c5), so
-- assignments published to them persist to the DB and reach students —
-- previously only Class 10 -- Section A (migration 0004's seed) was a real
-- classroom and every other class fell back to in-memory-only.
--
-- Classrooms mirror edova-web/src/data/seed.ts CLASSES:
--   c1  Class 8 — Section A  Mathematics
--   c2  Class 8 — Section B  Mathematics
--   c3  Class 7 — Section A  Mathematics
--   c4  Class 9 — Section C  Algebra II
--   c5  Class 8 — Section A  Homeroom
-- Two new subjects (Algebra II, Homeroom) are added for c4/c5.
-- All 15 demo students are enrolled in every new classroom so the demo
-- roster works per-class, same as Class 10.

INSERT INTO subjects (id, code, name, is_active)
VALUES
  ('a0000000-0000-4000-a000-0000000000a2', 'ALG2', 'Algebra II', TRUE),
  ('a0000000-0000-4000-a000-0000000000a3', 'HOME', 'Homeroom', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO classrooms (id, name, code, subject_id, class_level, section, academic_year, is_active)
VALUES
  ('a0000000-0000-4000-a000-0000000000c1', 'Class 8 -- Section A',  'C8A-MAT',  'a0000000-0000-4000-a000-000000000001', 8, 'Section A', '2026-2027', TRUE),
  ('a0000000-0000-4000-a000-0000000000c2', 'Class 8 -- Section B',  'C8B-MAT',  'a0000000-0000-4000-a000-000000000001', 8, 'Section B', '2026-2027', TRUE),
  ('a0000000-0000-4000-a000-0000000000c3', 'Class 7 -- Section A',  'C7A-MAT',  'a0000000-0000-4000-a000-000000000001', 7, 'Section A', '2026-2027', TRUE),
  ('a0000000-0000-4000-a000-0000000000c4', 'Class 9 -- Section C',  'C9C-ALG2', 'a0000000-0000-4000-a000-0000000000a2', 9, 'Section C', '2026-2027', TRUE),
  ('a0000000-0000-4000-a000-0000000000c5', 'Class 8 -- Section A (Homeroom)', 'C8A-HOME', 'a0000000-0000-4000-a000-0000000000a3', 8, 'Section A', '2026-2027', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Enroll every demo student in each new classroom (idempotent).
INSERT INTO enrollments (id, classroom_id, student_id, status, enrolled_at)
SELECT uuid_generate_v4(), cls.id, stu.id, 'active', NOW()
FROM classrooms cls
CROSS JOIN students stu
WHERE cls.id IN (
  'a0000000-0000-4000-a000-0000000000c1',
  'a0000000-0000-4000-a000-0000000000c2',
  'a0000000-0000-4000-a000-0000000000c3',
  'a0000000-0000-4000-a000-0000000000c4',
  'a0000000-0000-4000-a000-0000000000c5'
)
AND NOT EXISTS (
  SELECT 1 FROM enrollments e
  WHERE e.classroom_id = cls.id AND e.student_id = stu.id
);

-- Down Migration

DELETE FROM enrollments WHERE classroom_id IN (
  'a0000000-0000-4000-a000-0000000000c1',
  'a0000000-0000-4000-a000-0000000000c2',
  'a0000000-0000-4000-a000-0000000000c3',
  'a0000000-0000-4000-a000-0000000000c4',
  'a0000000-0000-4000-a000-0000000000c5'
);
DELETE FROM classrooms WHERE id IN (
  'a0000000-0000-4000-a000-0000000000c1',
  'a0000000-0000-4000-a000-0000000000c2',
  'a0000000-0000-4000-a000-0000000000c3',
  'a0000000-0000-4000-a000-0000000000c4',
  'a0000000-0000-4000-a000-0000000000c5'
);
DELETE FROM subjects WHERE id IN (
  'a0000000-0000-4000-a000-0000000000a2',
  'a0000000-0000-4000-a000-0000000000a3'
);
