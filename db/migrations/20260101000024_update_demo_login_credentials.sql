-- Up Migration

-- ============================================================
-- Replace the demo teacher/admin login email + password (migration 0022)
-- with shorter demo credentials:
--   teacher@edova.co / teacher123!
--   admin@edova.co   / admin123!
-- ============================================================

UPDATE users
SET email = 'teacher@edova.co',
    password_hash = '$2b$12$JEaPuyEaPZHDrqylhqFIQeuhSxO4OusgHIGrAh7dR8FySVr7fMYSO'
WHERE id = 'a0000000-0000-4000-a000-000000000002';

UPDATE users
SET email = 'admin@edova.co',
    password_hash = '$2b$12$m7FOKbkp73Vo3TeUNt/m7erGjwafRutgY9BoSRw1UyaebcVgtIF6G'
WHERE id = 'a0000000-0000-4000-a000-000000000005';

-- Down Migration

UPDATE users
SET email = 'teacher.demo@edova.local',
    password_hash = '$2b$12$riG084/RAxyiX.Cr/W9JJOtxZSD6R2rnxuABrwnoujX.bn6wSzr1i'
WHERE id = 'a0000000-0000-4000-a000-000000000002';

UPDATE users
SET email = 'admin.demo@edova.local',
    password_hash = '$2b$12$iaIIM/LG2Dpi3p2CSoYvGuq3xpWr9aXD95yLq021Iabnmv01qBStu'
WHERE id = 'a0000000-0000-4000-a000-000000000005';
