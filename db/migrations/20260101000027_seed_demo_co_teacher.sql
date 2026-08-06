-- Up Migration

-- ============================================================
-- Demo seed: a second teacher co-teaching the Class 10 — Section A
-- classroom, so the co-teaching relationship this product is named after
-- has something to actually display. Until now every classroom had exactly
-- one primary_teacher, which meant the co-teaching UI could only ever
-- render an empty state.
--
-- Same demo-credential convention as migrations 0022-0025.
-- Password: coteacher123!
-- ============================================================

INSERT INTO users (id, email, password_hash, first_name, last_name, display_name, role, status, email_verified)
VALUES (
    'a0000000-0000-4000-a000-000000000004',
    'coteacher@edova.co',
    '$2b$12$LQmqOA9dQxNhqmcFVJXvVe0Zc4gWMfhPvKC8vT6DKvXVvXQjKKxKa',
    'Anjali', 'Rao', 'Anjali Rao',
    'teacher', 'active', TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO co_teaching_assignments
    (classroom_id, teacher_id, role_type, responsibilities, start_date, is_primary, handoff_notes, status)
VALUES (
    'a0000000-0000-4000-a000-000000000003',
    'a0000000-0000-4000-a000-000000000004',
    'co_teacher',
    '["grading", "lesson_planning"]',
    '2026-04-01',
    FALSE,
    'Took the Thursday period this week — covered Quadratic Equations up to the discriminant. Rohan and Meera still need a recap on factorisation.',
    'active'
)
ON CONFLICT (classroom_id, teacher_id) DO NOTHING;

-- Down Migration

DELETE FROM co_teaching_assignments
WHERE teacher_id = 'a0000000-0000-4000-a000-000000000004';

DELETE FROM users WHERE id = 'a0000000-0000-4000-a000-000000000004';
