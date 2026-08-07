"""Repository layer — each repo owns the SQL for its aggregate. Handlers
keep the connection lifecycle (per-call connect via get_conn, RealDictCursor
rows, commit/close in the handler); repo methods take the open cursor so
multi-statement requests stay in a single transaction, exactly as the
pre-extraction monolith did."""

import psycopg2
import psycopg2.extras

from settings import settings


def get_conn():
    return psycopg2.connect(settings.DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)


class UserRepo:
    """users + user_sessions, plus the students row behind a student login."""

    @staticmethod
    def find_active_by_email(cur, email: str):
        cur.execute(
            "SELECT * FROM users WHERE email = %s AND deleted_at IS NULL AND status = 'active'",
            (email,),
        )
        return cur.fetchone()

    @staticmethod
    def find_by_id(cur, user_id: str):
        cur.execute("SELECT * FROM users WHERE id = %s AND deleted_at IS NULL", (user_id,))
        return cur.fetchone()

    @staticmethod
    def create_session(cur, session_id: str, user_id: str, token_jti: str, expires_at) -> None:
        cur.execute(
            "INSERT INTO user_sessions (id, user_id, token_jti, expires_at) VALUES (%s, %s, %s, %s)",
            (session_id, user_id, token_jti, expires_at),
        )

    @staticmethod
    def session_is_valid(cur, token_jti: str) -> bool:
        cur.execute(
            "SELECT 1 FROM user_sessions WHERE token_jti = %s AND revoked_at IS NULL"
            " AND expires_at > NOW()",
            (token_jti,),
        )
        return cur.fetchone() is not None

    @staticmethod
    def revoke_session(cur, token_jti: str) -> None:
        cur.execute("UPDATE user_sessions SET revoked_at = NOW() WHERE token_jti = %s", (token_jti,))

    @staticmethod
    def find_student_id(cur, user_id: str):
        cur.execute("SELECT id FROM students WHERE user_id = %s AND deleted_at IS NULL", (user_id,))
        row = cur.fetchone()
        return row["id"] if row else None


class ClassroomRepo:
    """classrooms + the roster (enrollments/students) reads."""

    @staticmethod
    def list_all(cur):
        cur.execute(
            """
            SELECT c.id, c.name, c.section, c.class_level, c.academic_year,
                   s.name AS subject, u.display_name AS teacher_name
            FROM classrooms c
            JOIN subjects s ON s.id = c.subject_id
            JOIN co_teaching_assignments cta
                ON cta.classroom_id = c.id AND cta.is_primary AND cta.status = 'active'
            JOIN users u ON u.id = cta.teacher_id
            WHERE c.deleted_at IS NULL
            ORDER BY c.class_level, c.section
            """
        )
        return cur.fetchall()

    @staticmethod
    def exists(cur, classroom_id: str) -> bool:
        cur.execute("SELECT 1 FROM classrooms WHERE id = %s AND deleted_at IS NULL", (classroom_id,))
        return cur.fetchone() is not None

    @staticmethod
    def list_students(cur, classroom_id: str):
        cur.execute(
            """
            SELECT st.id, st.student_number, st.first_name, st.last_name, st.class_level
            FROM enrollments e
            JOIN students st ON st.id = e.student_id
            WHERE e.classroom_id = %s AND e.status = 'active' AND st.deleted_at IS NULL
            ORDER BY st.student_number
            """,
            (classroom_id,),
        )
        return cur.fetchall()

    @staticmethod
    def list_student_subjects(cur, student_id: str):
        cur.execute(
            """
            SELECT DISTINCT s.id, s.name AS subject_name
            FROM enrollments e
            JOIN classrooms c ON c.id = e.classroom_id
            JOIN subjects s ON s.id = c.subject_id
            WHERE e.student_id = %s AND e.status = 'active'
            """,
            (student_id,),
        )
        return cur.fetchall()


class AssignmentRepo:
    """assignments + submissions + grades."""

    @staticmethod
    def create(
        cur, new_id: str, classroom_id: str, created_by: str, title: str, description: str,
        points_possible: float, due_date, attachments, submission_type: str, sections,
        topic_label: str = "",
    ):
        cur.execute(
            """
            INSERT INTO assignments
                (id, classroom_id, created_by, title, description, type,
                 points_possible, due_date, attachments, settings, status)
            VALUES (%s, %s, %s, %s, %s, 'homework', %s, %s, %s, %s, 'published')
            RETURNING id, title, description, due_date, points_possible, attachments, settings, created_at
            """,
            (
                new_id, classroom_id, created_by, title, description,
                points_possible, due_date,
                psycopg2.extras.Json(attachments),
                psycopg2.extras.Json({"submission_type": submission_type, "sections": sections, "topic_label": topic_label}),
            ),
        )
        return cur.fetchone()

    @staticmethod
    def list_for_classroom(cur, classroom_id: str):
        cur.execute(
            """
            SELECT id, title, description, due_date, points_possible, attachments, settings, created_at
            FROM assignments
            WHERE classroom_id = %s AND deleted_at IS NULL
            ORDER BY created_at DESC
            """,
            (classroom_id,),
        )
        return cur.fetchall()

    @staticmethod
    def list_for_student(cur, student_id: str):
        cur.execute(
            """
            SELECT a.id, a.title, a.description, a.due_date, a.points_possible, a.settings,
                   c.class_level, c.section, s.name AS subject,
                   sub.status AS sub_status, sub.submitted_at, sub.is_late, sub.text_response,
                   sub.answers,
                   g.points_earned, g.feedback
            FROM assignments a
            JOIN classrooms c ON c.id = a.classroom_id
            JOIN subjects s ON s.id = c.subject_id
            JOIN enrollments e ON e.classroom_id = a.classroom_id
                AND e.student_id = %s AND e.status = 'active'
            LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = %s
            LEFT JOIN grades g ON g.assignment_id = a.id AND g.student_id = %s
            WHERE a.deleted_at IS NULL
            ORDER BY a.due_date NULLS LAST, a.created_at DESC
            """,
            (student_id, student_id, student_id),
        )
        return cur.fetchall()

    @staticmethod
    def find_with_classroom(cur, assignment_id: str):
        cur.execute(
            "SELECT a.classroom_id, a.due_date, c.academic_year FROM assignments a"
            " JOIN classrooms c ON c.id = a.classroom_id WHERE a.id = %s AND a.deleted_at IS NULL",
            (assignment_id,),
        )
        return cur.fetchone()

    @staticmethod
    def enrollment_active(cur, classroom_id: str, student_id: str) -> bool:
        cur.execute(
            "SELECT 1 FROM enrollments WHERE classroom_id = %s AND student_id = %s AND status = 'active'",
            (classroom_id, student_id),
        )
        return cur.fetchone() is not None

    @staticmethod
    def find_submission(cur, assignment_id: str, student_id: str):
        cur.execute(
            "SELECT id FROM submissions WHERE assignment_id = %s AND student_id = %s",
            (assignment_id, student_id),
        )
        return cur.fetchone()

    @staticmethod
    def update_submission(cur, text_response: str, is_late: bool, submission_id: str, answers=None):
        cur.execute(
            """
            UPDATE submissions SET text_response = %s, submitted_at = NOW(), is_late = %s,
                status = 'submitted', attempt_number = attempt_number + 1,
                answers = COALESCE(%s, answers)
            WHERE id = %s
            RETURNING assignment_id, status, submitted_at, is_late, text_response
            """,
            (text_response, is_late,
             psycopg2.extras.Json(answers) if answers is not None else None, submission_id),
        )
        return cur.fetchone()

    @staticmethod
    def create_submission(
        cur, new_id: str, assignment_id: str, student_id: str, text_response: str,
        is_late: bool, academic_year: str, answers=None,
    ):
        cur.execute(
            """
            INSERT INTO submissions
                (id, assignment_id, student_id, submission_type, text_response,
                 submitted_at, is_late, status, academic_year, answers)
            VALUES (%s, %s, %s, 'final', %s, NOW(), %s, 'submitted', %s, %s)
            RETURNING assignment_id, status, submitted_at, is_late, text_response
            """,
            (new_id, assignment_id, student_id, text_response, is_late, academic_year,
             psycopg2.extras.Json(answers if answers is not None else [])),
        )
        return cur.fetchone()

    @staticmethod
    def list_submissions(cur, assignment_id: str):
        cur.execute(
            """
            SELECT student_id, status, submitted_at, is_late, text_response, answers
            FROM submissions WHERE assignment_id = %s
            """,
            (assignment_id,),
        )
        return cur.fetchall()

    @staticmethod
    def find_grading_context(cur, assignment_id: str):
        cur.execute(
            """
            SELECT a.points_possible, c.academic_year FROM assignments a
            JOIN classrooms c ON c.id = a.classroom_id
            WHERE a.id = %s AND a.deleted_at IS NULL
            """,
            (assignment_id,),
        )
        return cur.fetchone()

    @staticmethod
    def find_grade(cur, assignment_id: str, student_id: str):
        cur.execute(
            "SELECT id FROM grades WHERE assignment_id = %s AND student_id = %s",
            (assignment_id, student_id),
        )
        return cur.fetchone()

    @staticmethod
    def update_grade(
        cur, points_earned, points_possible: float, feedback: str, grader_id: str, grade_id: str
    ):
        cur.execute(
            """
            UPDATE grades SET points_earned = %s, points_possible = %s, feedback = %s,
                grader_id = %s, status = 'published', published_at = NOW()
            WHERE id = %s
            RETURNING assignment_id, student_id, points_earned, points_possible, feedback, status
            """,
            (points_earned, points_possible, feedback, grader_id, grade_id),
        )
        return cur.fetchone()

    @staticmethod
    def create_grade(
        cur, new_id: str, assignment_id: str, student_id: str, grader_id: str, points_earned,
        points_possible: float, feedback: str, academic_year: str,
    ):
        cur.execute(
            """
            INSERT INTO grades
                (id, assignment_id, student_id, grader_id, points_earned, points_possible,
                 feedback, academic_year, status, published_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'published', NOW())
            RETURNING assignment_id, student_id, points_earned, points_possible, feedback, status
            """,
            (
                new_id, assignment_id, student_id, grader_id, points_earned,
                points_possible, feedback, academic_year,
            ),
        )
        return cur.fetchone()

    @staticmethod
    def list_grades(cur, assignment_id: str):
        cur.execute(
            """
            SELECT assignment_id, student_id, points_earned, points_possible, feedback, status
            FROM grades WHERE assignment_id = %s
            """,
            (assignment_id,),
        )
        return cur.fetchall()


class CalendarRepo:
    """calendar_events."""

    @staticmethod
    def create_event(
        cur, new_id: str, classroom_id, created_by: str, title: str, event_type: str,
        start_at: str, end_at, is_all_day: bool, visibility: str,
    ):
        cur.execute(
            """
            INSERT INTO calendar_events
                (id, classroom_id, created_by, title, event_type, start_at, end_at, is_all_day, visibility)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, title, event_type, start_at, end_at, is_all_day, visibility, classroom_id
            """,
            (
                new_id, classroom_id, created_by, title, event_type,
                start_at, end_at, is_all_day, visibility,
            ),
        )
        return cur.fetchone()

    @staticmethod
    def list_visible(cur, user_id: str):
        cur.execute(
            """
            SELECT id, title, event_type, start_at, end_at, is_all_day, visibility, classroom_id
            FROM calendar_events
            WHERE deleted_at IS NULL AND (created_by = %s OR visibility = 'school')
            ORDER BY start_at
            """,
            (user_id,),
        )
        return cur.fetchall()


class ResourceAssignmentRepo:
    """resource_assignments -- a teacher assigning a catalogued Learning
    Resource (OKF video/PDF) to a class. Distinct from AssignmentRepo
    (homework/grades/submissions); this is purely "this class can see this
    resource in Learning Hub," so it's a plain upsert with no status model."""

    @staticmethod
    def create(cur, new_id: str, classroom_id: str, resource_id: str, resource_title: str,
               resource_type: str, chapter_number, s3_key, assigned_by: str):
        cur.execute(
            """
            INSERT INTO resource_assignments
                (id, classroom_id, resource_id, resource_title, resource_type,
                 chapter_number, s3_key, assigned_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (classroom_id, resource_id) DO UPDATE SET
                resource_title = EXCLUDED.resource_title,
                resource_type = EXCLUDED.resource_type,
                chapter_number = EXCLUDED.chapter_number,
                s3_key = EXCLUDED.s3_key,
                assigned_at = NOW()
            RETURNING id, classroom_id, resource_id, resource_title, resource_type,
                      chapter_number, s3_key, assigned_at
            """,
            (new_id, classroom_id, resource_id, resource_title, resource_type,
             chapter_number, s3_key, assigned_by),
        )
        return cur.fetchone()

    @staticmethod
    def list_for_student(cur, student_id: str):
        cur.execute(
            """
            SELECT ra.id, ra.resource_id, ra.resource_title, ra.resource_type,
                   ra.chapter_number, ra.s3_key, ra.assigned_at,
                   s.name AS subject
            FROM resource_assignments ra
            JOIN classrooms c ON c.id = ra.classroom_id
            JOIN subjects s ON s.id = c.subject_id
            JOIN enrollments e ON e.classroom_id = ra.classroom_id
                AND e.student_id = %s AND e.status = 'active'
            ORDER BY ra.assigned_at DESC
            """,
            (student_id,),
        )
        return cur.fetchall()
