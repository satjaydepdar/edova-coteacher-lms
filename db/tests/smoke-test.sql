-- Functional smoke test — run as superuser (bypasses RLS for setup), then
-- switches to app_role + SET LOCAL to prove RLS actually restricts access.

BEGIN;

INSERT INTO users (id, email, first_name, last_name, role)
VALUES
    ('10000000-0000-0000-0000-000000000001', 'admin@edova.test', 'Ada', 'Admin', 'admin'),
    ('10000000-0000-0000-0000-000000000002', 'teacher1@edova.test', 'Meenakshi', 'Parameswaran', 'teacher'),
    ('10000000-0000-0000-0000-000000000003', 'teacher2@edova.test', 'Other', 'Teacher', 'teacher');

INSERT INTO subjects (id, name) VALUES ('20000000-0000-0000-0000-000000000001', 'Mathematics');

INSERT INTO classrooms (id, name, subject_id, class_level, academic_year)
VALUES ('30000000-0000-0000-0000-000000000001', 'Class 8 Math A', '20000000-0000-0000-0000-000000000001', 8, '2026-2027');

INSERT INTO co_teaching_assignments (classroom_id, teacher_id, role_type, is_primary, start_date)
VALUES ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'primary_teacher', TRUE, '2026-07-01');

INSERT INTO students (id, student_number, first_name, last_name)
VALUES ('40000000-0000-0000-0000-000000000001', 'S-0001', 'Riya', 'Sharma');

INSERT INTO enrollments (classroom_id, student_id) VALUES
    ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001');

INSERT INTO assignments (id, classroom_id, created_by, title, type, points_possible, status)
VALUES ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002', 'Chapter 4 Quiz', 'quiz', 20, 'published');

INSERT INTO submissions (id, assignment_id, student_id, status, academic_year)
VALUES ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001', 'submitted', '2026-2027');

INSERT INTO grades (submission_id, assignment_id, student_id, grader_id, points_earned, points_possible, status, academic_year)
VALUES ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
        '40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002',
        17, 20, 'published', '2026-2027');

-- Check 1: generated percentage column
DO $$
DECLARE v_pct NUMERIC;
BEGIN
    SELECT percentage INTO v_pct FROM grades WHERE student_id = '40000000-0000-0000-0000-000000000001';
    IF v_pct != 85.00 THEN
        RAISE EXCEPTION 'CHECK 1 FAILED: expected percentage 85.00, got %', v_pct;
    END IF;
    RAISE NOTICE 'CHECK 1 PASSED: generated percentage column = %', v_pct;
END $$;

-- Check 2: gradebook_snapshots trigger fired and aggregated correctly
DO $$
DECLARE v_earned NUMERIC; v_total NUMERIC; v_pct NUMERIC;
BEGIN
    SELECT earned_points, total_points, percentage INTO v_earned, v_total, v_pct
    FROM gradebook_snapshots
    WHERE classroom_id = '30000000-0000-0000-0000-000000000001'
      AND student_id = '40000000-0000-0000-0000-000000000001';
    IF v_earned != 17 OR v_total != 20 OR v_pct != 85.00 THEN
        RAISE EXCEPTION 'CHECK 2 FAILED: expected 17/20 (85.00), got %/% (%)', v_earned, v_total, v_pct;
    END IF;
    RAISE NOTICE 'CHECK 2 PASSED: gradebook_snapshots auto-updated to %/%  (%)', v_earned, v_total, v_pct;
END $$;

-- Check 3: partition placement — row landed in the correct year partition
DO $$
DECLARE v_partition TEXT;
BEGIN
    SELECT tableoid::regclass::text INTO v_partition FROM submissions
    WHERE id = '60000000-0000-0000-0000-000000000001';
    IF v_partition != 'submissions_y2026' THEN
        RAISE EXCEPTION 'CHECK 3 FAILED: expected submissions_y2026, got %', v_partition;
    END IF;
    RAISE NOTICE 'CHECK 3 PASSED: row correctly routed to partition %', v_partition;
END $$;

-- Check 4: RLS — teacher2 (not assigned to this classroom) should see nothing
SET LOCAL ROLE app_role;
SET LOCAL app.current_user_id = '10000000-0000-0000-0000-000000000003';
DO $$
DECLARE v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM classrooms;
    IF v_count != 0 THEN
        RAISE EXCEPTION 'CHECK 4 FAILED: teacher2 should see 0 classrooms, saw %', v_count;
    END IF;
    RAISE NOTICE 'CHECK 4 PASSED: unrelated teacher correctly sees 0 classrooms under RLS';
END $$;
RESET ROLE;

-- Check 5: RLS — teacher1 (assigned) should see exactly 1 classroom and its grade
SET LOCAL ROLE app_role;
SET LOCAL app.current_user_id = '10000000-0000-0000-0000-000000000002';
DO $$
DECLARE v_classrooms INT; v_grades INT;
BEGIN
    SELECT COUNT(*) INTO v_classrooms FROM classrooms;
    SELECT COUNT(*) INTO v_grades FROM grades;
    IF v_classrooms != 1 OR v_grades != 1 THEN
        RAISE EXCEPTION 'CHECK 5 FAILED: expected 1 classroom / 1 grade, got % / %', v_classrooms, v_grades;
    END IF;
    RAISE NOTICE 'CHECK 5 PASSED: assigned teacher correctly sees % classroom, % grade', v_classrooms, v_grades;
END $$;
RESET ROLE;

ROLLBACK;
