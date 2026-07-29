-- Up Migration

-- ============================================================
-- Give the first demo student (migration 0023's student01) a simpler
-- login, same spirit as migration 0024's teacher@edova.co/admin@edova.co:
--   student@edova.co / student123!
-- students 02-15 keep their original per-student demo credentials, so
-- multi-student scenarios (rosters, per-student progress, etc.) still have
-- distinct logins to test with.
-- ============================================================

UPDATE users
SET email = 'student@edova.co',
    password_hash = '$2b$12$W1AeWZQ/wcN5NP0/92VuvOvWl31be8g7wQc8O0DPYsM7D1IoncOkC'
WHERE id = 'a0000000-0000-4000-a000-000000000301';

-- Down Migration

UPDATE users
SET email = 'student01.demo@edova.local',
    password_hash = '$2b$12$u5DoJ9sFH.sXgFcZPEnM6OS0j83XRSCVDAjy0LCyPP2A.BAHwKq6e'
WHERE id = 'a0000000-0000-4000-a000-000000000301';
