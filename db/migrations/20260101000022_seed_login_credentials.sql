-- Up Migration

-- ============================================================
-- SEED: real login credentials for the placeholder teacher + a new admin
-- ============================================================
-- Step 2 of the teacher/admin login feature. Hashes are bcrypt, computed
-- once locally in Python -- storing a one-way hash in a migration file is
-- no different from storing it in the users table itself, nothing secret
-- is exposed. Demo credentials, same spirit as the placeholder Class 10
-- roster (Teacher Demo, Student 01-15):
--   teacher.demo@edova.local / TeacherDemo123!
--   admin.demo@edova.local   / AdminDemo123!

UPDATE users
SET password_hash = '$2b$12$riG084/RAxyiX.Cr/W9JJOtxZSD6R2rnxuABrwnoujX.bn6wSzr1i'
WHERE id = 'a0000000-0000-4000-a000-000000000002';

INSERT INTO users (id, email, first_name, last_name, display_name, role, password_hash)
VALUES (
    'a0000000-0000-4000-a000-000000000005',
    'admin.demo@edova.local',
    'Admin',
    'Demo',
    'Admin Demo',
    'admin',
    '$2b$12$iaIIM/LG2Dpi3p2CSoYvGuq3xpWr9aXD95yLq021Iabnmv01qBStu'
);

-- Down Migration

DELETE FROM users WHERE id = 'a0000000-0000-4000-a000-000000000005';
UPDATE users SET password_hash = NULL WHERE id = 'a0000000-0000-4000-a000-000000000002';
