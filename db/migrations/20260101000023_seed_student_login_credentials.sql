-- Up Migration

-- ============================================================
-- Allow a 'student' role, then seed real login accounts for the 15
-- placeholder Class 10 students seeded earlier (migration 0021).
-- ============================================================
-- db/README.md already anticipated this: "extending it for student/parent
-- logins is a one-line CHECK constraint change when that feature is
-- actually built." Login/session mechanics are unchanged -- /auth/login
-- already works against any users row regardless of role.

ALTER TABLE users DROP CONSTRAINT chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('teacher', 'admin', 'student'));

-- Demo credentials, same placeholder spirit as the rest of this seed data:
--   student01.demo@edova.local / Student01Demo123!
--   ...
--   student15.demo@edova.local / Student15Demo123!
INSERT INTO users (id, email, first_name, last_name, display_name, role, password_hash) VALUES
('a0000000-0000-4000-a000-000000000301', 'student01.demo@edova.local', 'Student', '01', 'Student 01', 'student', '$2b$12$u5DoJ9sFH.sXgFcZPEnM6OS0j83XRSCVDAjy0LCyPP2A.BAHwKq6e'),
('a0000000-0000-4000-a000-000000000302', 'student02.demo@edova.local', 'Student', '02', 'Student 02', 'student', '$2b$12$XARv30omdb.V.FVNjzeq6.3xQ7S0LSyjenjRXg3f510qYbL31azLq'),
('a0000000-0000-4000-a000-000000000303', 'student03.demo@edova.local', 'Student', '03', 'Student 03', 'student', '$2b$12$1ijdc2VVR.4fVmI16rBFEuJYCZryjr/voJzBdlgSrvpcxrR2v2vEi'),
('a0000000-0000-4000-a000-000000000304', 'student04.demo@edova.local', 'Student', '04', 'Student 04', 'student', '$2b$12$uPyNwQU6d/hob5flxn/jReXZTvbF.1HweEfGgzZoVneZutQBPJtoi'),
('a0000000-0000-4000-a000-000000000305', 'student05.demo@edova.local', 'Student', '05', 'Student 05', 'student', '$2b$12$fYaxwAmCFJd4zyMUxf3VwOWRFCd1OnD4FZFFPAlGj4rKMfWN4RCyi'),
('a0000000-0000-4000-a000-000000000306', 'student06.demo@edova.local', 'Student', '06', 'Student 06', 'student', '$2b$12$Oz4eOxwxLcxrVp4/5/UCbe/v6Tp1Cgx/mERdZMMYjhkHC2/0.x80K'),
('a0000000-0000-4000-a000-000000000307', 'student07.demo@edova.local', 'Student', '07', 'Student 07', 'student', '$2b$12$Ftws3MJJuTkz6jQ75yxoqu/48v1x5SrryUd2hkGzsLvdfnEaUJ7/e'),
('a0000000-0000-4000-a000-000000000308', 'student08.demo@edova.local', 'Student', '08', 'Student 08', 'student', '$2b$12$AExs5A593cA3BLV5WL.Rgue4wElPjGi1tRPOOlAWKaRCCcBEB6e3y'),
('a0000000-0000-4000-a000-000000000309', 'student09.demo@edova.local', 'Student', '09', 'Student 09', 'student', '$2b$12$2C0ckNLUJu7zH1OxVlMsTeis/uFc37uqVS2JOttDt8WQDd78lwJ4m'),
('a0000000-0000-4000-a000-000000000310', 'student10.demo@edova.local', 'Student', '10', 'Student 10', 'student', '$2b$12$46wyAUFiVZxGgDGwa2uD1ezqY7bGzokSV2M64aPN1ZxvwZ/O2sSey'),
('a0000000-0000-4000-a000-000000000311', 'student11.demo@edova.local', 'Student', '11', 'Student 11', 'student', '$2b$12$Z4cezQCd7ulQy87XlfuWaei1W/5y0yredyh4fcxhczNuClsAOFJ4O'),
('a0000000-0000-4000-a000-000000000312', 'student12.demo@edova.local', 'Student', '12', 'Student 12', 'student', '$2b$12$Dp718T9KZOYYwpdJDU3Ires1oYN0iT3ND9sT1ihpYnoIw.73v8eDO'),
('a0000000-0000-4000-a000-000000000313', 'student13.demo@edova.local', 'Student', '13', 'Student 13', 'student', '$2b$12$t6KB/XwqVwjay7gVEG4ryu9T5wsbooftcf/Z5jRhgp1NuzeElJzIC'),
('a0000000-0000-4000-a000-000000000314', 'student14.demo@edova.local', 'Student', '14', 'Student 14', 'student', '$2b$12$xuxuNmfWr5RKuIkOluCsWO3Qoh4zfXn.j666Yg7bGbL8nNIciCwii'),
('a0000000-0000-4000-a000-000000000315', 'student15.demo@edova.local', 'Student', '15', 'Student 15', 'student', '$2b$12$lYJ.Ov80tVFoH6tdNyVBmeo/CPj6OhRj5xrFgB0P2ory9JJXfsxp2');

-- Link each new login account to its existing students row (migration
-- 0021's Class 10 roster) via the nullable students.user_id FK.
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000301' WHERE id = 'a0000000-0000-4000-a000-000000000101';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000302' WHERE id = 'a0000000-0000-4000-a000-000000000102';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000303' WHERE id = 'a0000000-0000-4000-a000-000000000103';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000304' WHERE id = 'a0000000-0000-4000-a000-000000000104';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000305' WHERE id = 'a0000000-0000-4000-a000-000000000105';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000306' WHERE id = 'a0000000-0000-4000-a000-000000000106';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000307' WHERE id = 'a0000000-0000-4000-a000-000000000107';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000308' WHERE id = 'a0000000-0000-4000-a000-000000000108';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000309' WHERE id = 'a0000000-0000-4000-a000-000000000109';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000310' WHERE id = 'a0000000-0000-4000-a000-000000000110';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000311' WHERE id = 'a0000000-0000-4000-a000-000000000111';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000312' WHERE id = 'a0000000-0000-4000-a000-000000000112';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000313' WHERE id = 'a0000000-0000-4000-a000-000000000113';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000314' WHERE id = 'a0000000-0000-4000-a000-000000000114';
UPDATE students SET user_id = 'a0000000-0000-4000-a000-000000000315' WHERE id = 'a0000000-0000-4000-a000-000000000115';

-- Down Migration

UPDATE students SET user_id = NULL WHERE id::text LIKE 'a0000000-0000-4000-a000-0000000001%';
DELETE FROM users WHERE id::text LIKE 'a0000000-0000-4000-a000-0000000003%';
ALTER TABLE users DROP CONSTRAINT chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role CHECK (role IN ('teacher', 'admin'));
