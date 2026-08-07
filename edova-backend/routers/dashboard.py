"""Teacher Home dashboard — one request per page load; the backend derives
every widget server-side rather than making the browser fan out over
classrooms x assignments the way school-store does.

Three fields are deliberately null because NO service records the data yet,
and a dashboard must not invent numbers:
  metrics.avg_attendance -- the `attendance` table (migration 0008) has no
      writer and no reader anywhere in the codebase.
  metrics.classes_today  -- same story for `schedules`.
  classes[].planned_pct  -- `section_unit_pacing` holds planned dates, but
      nothing derives an expected-progress % from them.
The frontend renders an explicit "not tracked yet" state for each. When a
real source lands, fill the field in here and the UI picks it up.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from deps import _authenticated_user
from repositories import get_conn
from routers.calendar import CalendarEventOut, _calendar_event_out

router = APIRouter()


class DashboardMetricsOut(BaseModel):
    total_students: int
    pending_grading: int
    # Mean of grades.percentage across every scored grade in this teacher's
    # classrooms. None when nothing has been graded yet -- an unscored
    # gradebook has no average, and 0% would read as "everyone failed".
    class_average: Optional[float]
    # Share of expected submissions actually turned in, across every
    # published assignment. None when there is nothing to submit yet.
    submission_rate: Optional[float]
    avg_attendance: Optional[float]
    classes_today: Optional[int]


class CoTeacherOut(BaseModel):
    teacher_id: str
    name: str
    initials: str
    role_type: str
    is_primary: bool
    handoff_notes: Optional[str]


class DashboardClassOut(BaseModel):
    classroom_id: str
    name: str
    class_level: int
    section: Optional[str]
    subject: str
    student_count: int
    taught_pct: Optional[float]
    planned_pct: Optional[float]
    # Everyone else on this classroom's co-teaching assignment. The product's
    # namesake feature, and until now it was stored but never shown.
    co_teachers: List[CoTeacherOut] = []


class AssignmentStatusOut(BaseModel):
    assignment_id: str
    title: str
    classroom_id: str
    on_time: int
    late: int
    missing: int


class ActionItemOut(BaseModel):
    # severity drives the card's colour; `finding` is the observation and
    # `suggestion` the recommended response -- a recommendation has to say
    # what it noticed and what to do about it, or it's just a to-do.
    kind: str  # grading | overdue | low_scoring | at_risk | due_soon
    severity: str  # high | medium | low
    title: str
    finding: str
    suggestion: str
    cta_label: str
    cta_url: str
    count: int
    total: int
    assignment_id: Optional[str]
    classroom_id: Optional[str]


class ActivityOut(BaseModel):
    """One recent submission, for the topbar bell."""
    student_name: str
    initials: str
    assignment_title: str
    assignment_id: str
    submitted_at: str
    is_late: bool


class InterventionOut(BaseModel):
    student_id: str
    name: str
    initials: str
    classroom_name: str
    missing_count: int
    average_pct: Optional[float]
    reason: str  # missed | failing


class ClassOptionOut(BaseModel):
    classroom_id: str
    label: str


class TeacherDashboardOut(BaseModel):
    teacher_name: str
    metrics: DashboardMetricsOut
    class_options: List[ClassOptionOut]
    classes: List[DashboardClassOut]
    assignment_status: List[AssignmentStatusOut]
    upcoming: List[CalendarEventOut]
    action_items: List[ActionItemOut]
    interventions: List[InterventionOut]
    recent_activity: List[ActivityOut]
    # Echoed back so the UI can tell "showing everything" from "showing one
    # class" without tracking it separately.
    scoped_classroom_id: Optional[str]


# How many of the most recent assignments the status chart plots.
DASHBOARD_RECENT_ASSIGNMENTS = 6
# Submission rate below this on a published assignment is worth flagging.
LOW_SUBMISSION_PCT = 50.0
# Class average below this on one assignment suggests the material didn't land.
LOW_SCORE_PCT = 60.0
# How many recent submissions the bell feed carries.
ACTIVITY_FEED_LIMIT = 8
# A student needs at least this many un-submitted assignments to surface in
# "Needs Intervention" -- one missed homework is noise, not a signal.
INTERVENTION_MISSING_THRESHOLD = 2
# Published average below this counts as failing.
INTERVENTION_FAILING_PCT = 40.0


def _initials(name: str) -> str:
    parts = [p for p in name.split() if p]
    return "".join(p[0] for p in parts[:2]).upper() or "?"


def _taught_pct_by_key(cur) -> dict:
    """(year_label, class_label, section, subject_name) -> taught %, from the
    master syllabus tree and each section's ticked topics (migrations
    0016-0019).

    That tree is keyed by label ('2026-2027' / 'Class 10' / 'Section A' /
    'Mathematics') while `classrooms` is keyed by academic_year +
    class_level/section/subject_id -- the two halves of the schema were built
    in different phases and never reconciled (see db/README.md's "Known
    gaps"). Joining on the labels is the only bridge available today.

    The year label is part of the key because it has to be: the same
    'Class 10 / Mathematics' pair exists under several academic years at
    once, so a year-less key silently mixes one year's progress into
    another's. Board is NOT in the key -- `classrooms` has no board column --
    so a (year, class, section, subject) that resolves to more than one board
    is dropped rather than resolved arbitrarily. Any classroom with no
    unambiguous match gets taught_pct = None instead of a fabricated number.
    """
    cur.execute(
        """
        SELECT ay.year_label,
               cl.class_label,
               cs.section,
               csub.subject_name,
               COUNT(DISTINCT t.id) AS total_topics,
               COUNT(DISTINCT stp.syllabus_topic_id) FILTER (WHERE stp.done) AS done_topics
        FROM class_sections cs
        JOIN curriculum_subjects csub ON csub.id = cs.curriculum_subject_id
        JOIN curriculums cl ON cl.id = csub.curriculum_id
        JOIN academic_years ay ON ay.id = cl.academic_year_id
        LEFT JOIN syllabus_units u ON u.curriculum_subject_id = csub.id
        LEFT JOIN syllabus_chapters ch ON ch.unit_id = u.id
        LEFT JOIN syllabus_topics t ON t.chapter_id = ch.id
        LEFT JOIN section_topic_progress stp
            ON stp.section_id = cs.id AND stp.syllabus_topic_id = t.id
        WHERE cs.deleted_at IS NULL
        GROUP BY ay.year_label, cl.board, cl.class_label, cs.section, csub.subject_name
        """
    )
    out: dict = {}
    ambiguous = set()
    for r in cur.fetchall():
        if not r["total_topics"]:
            continue
        key = (r["year_label"], r["class_label"], r["section"], r["subject_name"])
        pct = round((r["done_topics"] / r["total_topics"]) * 100, 1)
        # Same key from two boards -> we cannot tell which one the classroom
        # follows. Drop it; "not tracked" beats a coin flip.
        if key in out and out[key] != pct:
            ambiguous.add(key)
        out[key] = pct
    for key in ambiguous:
        del out[key]
    return out


def _teacher_classroom_ids(cur, user) -> tuple:
    """Classrooms this account may see: everything for an admin, actively
    co-taught classrooms for a teacher. Empty tuple means "none"."""
    if user["role"] == "admin":
        cur.execute("SELECT id FROM classrooms WHERE deleted_at IS NULL")
    else:
        cur.execute(
            """
            SELECT c.id FROM classrooms c
            JOIN co_teaching_assignments cta ON cta.classroom_id = c.id
                AND cta.teacher_id = %s AND cta.status = 'active'
            WHERE c.deleted_at IS NULL
            """,
            (user["id"],),
        )
    return tuple(r["id"] for r in cur.fetchall())


def _recent_submissions(cur, classroom_ids: tuple, limit: int) -> List[ActivityOut]:
    if not classroom_ids:
        return []
    cur.execute(
        """
        SELECT s.assignment_id, s.submitted_at, s.is_late, a.title,
               st.first_name || ' ' || st.last_name AS student_name
        FROM submissions s
        JOIN assignments a ON a.id = s.assignment_id
        JOIN students st ON st.id = s.student_id
        WHERE a.classroom_id IN %s AND a.deleted_at IS NULL
          AND s.submitted_at IS NOT NULL
        ORDER BY s.submitted_at DESC
        LIMIT %s
        """,
        (classroom_ids, limit),
    )
    return [
        ActivityOut(
            student_name=r["student_name"],
            initials=_initials(r["student_name"]),
            assignment_title=r["title"],
            assignment_id=r["assignment_id"],
            submitted_at=r["submitted_at"].isoformat(),
            is_late=r["is_late"],
        )
        for r in cur.fetchall()
    ]


# Standalone because the topbar bell renders on every page -- it must not
# have to pull the whole dashboard payload just to show a count.
@router.get("/api/teachers/me/activity", response_model=List[ActivityOut])
def teacher_activity(limit: int = ACTIVITY_FEED_LIMIT,
                     authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            return _recent_submissions(cur, _teacher_classroom_ids(cur, user),
                                       max(1, min(limit, 50)))
    finally:
        conn.close()


@router.get("/api/teachers/me/dashboard", response_model=TeacherDashboardOut)
def teacher_dashboard(
    classroom_id: Optional[str] = None,
    authorization: Optional[str] = Header(None),
):
    """`classroom_id` narrows every figure to one classroom. Without it the
    numbers average across every class the teacher holds, which hides the
    class that needs attention behind the ones that don't."""
    user, _ = _authenticated_user(authorization)
    if classroom_id:
        try:
            uuid.UUID(classroom_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="classroom not found")
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Admins oversee the whole school; a teacher sees only the
            # classrooms they hold an active co-teaching assignment on
            # (primary or not -- a co-teacher's dashboard is still theirs).
            if user["role"] == "admin":
                cur.execute(
                    """
                    SELECT c.id, c.name, c.class_level, c.section, c.academic_year,
                           s.name AS subject
                    FROM classrooms c
                    JOIN subjects s ON s.id = c.subject_id
                    WHERE c.deleted_at IS NULL
                    ORDER BY c.class_level, c.section
                    """
                )
            else:
                cur.execute(
                    """
                    SELECT c.id, c.name, c.class_level, c.section, c.academic_year,
                           s.name AS subject
                    FROM classrooms c
                    JOIN subjects s ON s.id = c.subject_id
                    JOIN co_teaching_assignments cta ON cta.classroom_id = c.id
                        AND cta.teacher_id = %s AND cta.status = 'active'
                    WHERE c.deleted_at IS NULL
                    ORDER BY c.class_level, c.section
                    """,
                    (user["id"],),
                )
            all_classrooms = cur.fetchall()

            # The selector needs every class regardless of what's selected, so
            # it's built before scoping -- otherwise picking one class would
            # leave you no way to pick another.
            class_options = [
                ClassOptionOut(
                    classroom_id=c["id"],
                    label=f"Class {c['class_level']} — {c['section']} · {c['subject']}",
                )
                for c in all_classrooms
            ]

            classrooms = (
                [c for c in all_classrooms if c["id"] == classroom_id]
                if classroom_id else all_classrooms
            )
            if classroom_id and not classrooms:
                raise HTTPException(status_code=404, detail="classroom not found")

            teacher_name = user["display_name"] or f"{user['first_name']} {user['last_name']}"
            empty_metrics = DashboardMetricsOut(
                total_students=0, pending_grading=0, class_average=None,
                submission_rate=None, avg_attendance=None, classes_today=None,
            )
            if not classrooms:
                # A brand-new teacher with no classes yet -- a real, valid
                # state, not an error. Everything below assumes a non-empty
                # id tuple for its IN clauses.
                return TeacherDashboardOut(
                    teacher_name=teacher_name, metrics=empty_metrics,
                    class_options=class_options, classes=[], assignment_status=[],
                    upcoming=[], action_items=[], interventions=[], recent_activity=[],
                    scoped_classroom_id=classroom_id,
                )

            classroom_ids = tuple(c["id"] for c in classrooms)

            # ---- rosters -------------------------------------------------
            cur.execute(
                """
                SELECT e.classroom_id, st.id, st.first_name, st.last_name
                FROM enrollments e
                JOIN students st ON st.id = e.student_id
                WHERE e.classroom_id IN %s AND e.status = 'active'
                  AND st.deleted_at IS NULL
                """,
                (classroom_ids,),
            )
            roster_by_classroom: dict = {}
            student_names: dict = {}
            for r in cur.fetchall():
                roster_by_classroom.setdefault(r["classroom_id"], []).append(r["id"])
                student_names[r["id"]] = f"{r['first_name']} {r['last_name']}"

            # ---- assignments + submissions + grades ----------------------
            cur.execute(
                """
                SELECT id, classroom_id, title, due_date, points_possible, created_at
                FROM assignments
                WHERE classroom_id IN %s AND deleted_at IS NULL
                ORDER BY created_at DESC
                """,
                (classroom_ids,),
            )
            assignments = cur.fetchall()

            submitted: dict = {}   # assignment_id -> {student_id: is_late}
            graded: dict = {}      # assignment_id -> {student_id: percentage}
            if assignments:
                assignment_ids = tuple(a["id"] for a in assignments)
                cur.execute(
                    """
                    SELECT assignment_id, student_id, is_late
                    FROM submissions
                    WHERE assignment_id IN %s AND submitted_at IS NOT NULL
                    """,
                    (assignment_ids,),
                )
                for r in cur.fetchall():
                    submitted.setdefault(r["assignment_id"], {})[r["student_id"]] = r["is_late"]
                cur.execute(
                    """
                    SELECT assignment_id, student_id, percentage
                    FROM grades
                    WHERE assignment_id IN %s AND points_earned IS NOT NULL
                    """,
                    (assignment_ids,),
                )
                for r in cur.fetchall():
                    graded.setdefault(r["assignment_id"], {})[r["student_id"]] = r["percentage"]

            # ---- co-teachers ----------------------------------------------
            # Everyone assigned to these classrooms except the viewer -- the
            # co-teaching relationship this whole product is named after.
            cur.execute(
                """
                SELECT cta.classroom_id, cta.teacher_id, cta.role_type,
                       cta.is_primary, cta.handoff_notes,
                       COALESCE(u.display_name, u.first_name || ' ' || u.last_name) AS name
                FROM co_teaching_assignments cta
                JOIN users u ON u.id = cta.teacher_id
                WHERE cta.classroom_id IN %s AND cta.status = 'active'
                  AND cta.teacher_id <> %s AND u.deleted_at IS NULL
                ORDER BY cta.is_primary DESC, u.display_name
                """,
                (classroom_ids, user["id"]),
            )
            co_teachers: dict = {}
            for r in cur.fetchall():
                co_teachers.setdefault(r["classroom_id"], []).append(CoTeacherOut(
                    teacher_id=r["teacher_id"],
                    name=r["name"],
                    initials=_initials(r["name"]),
                    role_type=r["role_type"],
                    is_primary=r["is_primary"],
                    handoff_notes=r["handoff_notes"] or None,
                ))

            # ---- classes table -------------------------------------------
            taught = _taught_pct_by_key(cur)
            classes = [
                DashboardClassOut(
                    classroom_id=c["id"],
                    name=c["name"],
                    class_level=c["class_level"],
                    section=c["section"],
                    subject=c["subject"],
                    student_count=len(roster_by_classroom.get(c["id"], [])),
                    taught_pct=taught.get(
                        (c["academic_year"], f"Class {c['class_level']}",
                         c["section"], c["subject"])
                    ),
                    planned_pct=None,
                    co_teachers=co_teachers.get(c["id"], []),
                )
                for c in classrooms
            ]

            # ---- assignment status (most recent N) -----------------------
            assignment_status = []
            for a in assignments[:DASHBOARD_RECENT_ASSIGNMENTS]:
                roster = roster_by_classroom.get(a["classroom_id"], [])
                subs = submitted.get(a["id"], {})
                on_time = sum(1 for sid in roster if sid in subs and not subs[sid])
                late = sum(1 for sid in roster if sid in subs and subs[sid])
                assignment_status.append(AssignmentStatusOut(
                    assignment_id=a["id"], title=a["title"], classroom_id=a["classroom_id"],
                    on_time=on_time, late=late, missing=len(roster) - on_time - late,
                ))
            assignment_status.reverse()  # oldest -> newest reads left-to-right

            # ---- metrics --------------------------------------------------
            # "Pending grading" is submitted-but-ungraded work: the queue a
            # teacher actually has to clear. Un-submitted work isn't pending
            # on them, it's pending on the student.
            pending_grading = sum(
                1
                for a in assignments
                for sid in submitted.get(a["id"], {})
                if sid not in graded.get(a["id"], {})
            )

            # Class average across every scored grade. Each grade counts once,
            # regardless of which assignment it belongs to -- averaging
            # per-assignment averages would silently weight a 3-student quiz
            # the same as a 30-student exam.
            all_pcts = [
                float(p)
                for marks in graded.values()
                for p in marks.values()
                if p is not None
            ]
            class_average = round(sum(all_pcts) / len(all_pcts), 1) if all_pcts else None

            # Expected submissions = every enrolled student × every published
            # assignment in their classroom.
            expected = sum(
                len(roster_by_classroom.get(a["classroom_id"], [])) for a in assignments
            )
            actual = sum(len(submitted.get(a["id"], {})) for a in assignments)
            submission_rate = round((actual / expected) * 100, 1) if expected else None

            metrics = DashboardMetricsOut(
                total_students=len(student_names),
                pending_grading=pending_grading,
                class_average=class_average,
                submission_rate=submission_rate,
                avg_attendance=None,
                classes_today=None,
            )

            # ---- recommendations -------------------------------------------
            # Rule-based, not LLM-backed: each rule states what it observed
            # and what to do about it, and every threshold is a named constant
            # above so a teacher could be told exactly why a card appeared.
            # Ordered by severity below, so the worst thing is read first.
            now = datetime.now(timezone.utc)
            action_items = []

            def _cls_label(cid: str) -> str:
                c = next((x for x in classrooms if x["id"] == cid), None)
                return f"Class {c['class_level']} - {c['section']}" if c else ""

            for a in assignments:
                roster = roster_by_classroom.get(a["classroom_id"], [])
                if not roster:
                    continue
                subs = submitted.get(a["id"], {})
                marks = graded.get(a["id"], {})
                label = _cls_label(a["classroom_id"])
                overdue = bool(a["due_date"] and a["due_date"] < now)
                sub_pct = (len(subs) / len(roster)) * 100

                # Past its due date and most of the class never handed it in.
                if overdue and sub_pct < LOW_SUBMISSION_PCT:
                    missing = len(roster) - len(subs)
                    action_items.append(ActionItemOut(
                        kind="overdue", severity="high",
                        title=a["title"],
                        finding=f"{missing} of {len(roster)} students never submitted this, "
                                f"and it closed {a['due_date'].strftime('%b %d')}.",
                        suggestion="Extend the deadline or check it was published to students.",
                        cta_label="Open assignment", cta_url=f"/assignment-tracker/{a['id']}",
                        count=missing, total=len(roster),
                        assignment_id=a["id"], classroom_id=a["classroom_id"],
                    ))

                # Graded, and the class did badly -- the material didn't land.
                scored = [float(p) for p in marks.values() if p is not None]
                if scored:
                    avg = sum(scored) / len(scored)
                    if avg < LOW_SCORE_PCT:
                        action_items.append(ActionItemOut(
                            kind="low_scoring", severity="high",
                            title=a["title"],
                            finding=f"Class averaged {round(avg)}% on this "
                                    f"({len(scored)} scored).",
                            suggestion="Worth a recap before moving on, or a remedial quiz.",
                            cta_label="Build remedial quiz", cta_url="/assessment-builder",
                            count=len(scored), total=len(roster),
                            assignment_id=a["id"], classroom_id=a["classroom_id"],
                        ))

                # Work is sitting in the grading queue.
                ungraded = [sid for sid in subs if sid not in marks]
                if ungraded:
                    action_items.append(ActionItemOut(
                        kind="grading", severity="medium",
                        title=f"Grade {a['title']}",
                        finding=f"{len(ungraded)} submission"
                                f"{'s' if len(ungraded) != 1 else ''} waiting in {label}.",
                        suggestion="Students can't see feedback until these are returned.",
                        cta_label="Start grading",
                        cta_url=f"/assignment-tracker/{a['id']}/evaluate",
                        count=len(ungraded), total=len(roster),
                        assignment_id=a["id"], classroom_id=a["classroom_id"],
                    ))

                # Due soon and still largely outstanding.
                if (a["due_date"] and now <= a["due_date"] <= now + timedelta(days=7)
                        and sub_pct < LOW_SUBMISSION_PCT):
                    action_items.append(ActionItemOut(
                        kind="due_soon", severity="low",
                        title=a["title"],
                        finding=f"Due {a['due_date'].strftime('%b %d')} and "
                                f"{round(sub_pct)}% submitted so far.",
                        suggestion="A reminder to the class would help.",
                        cta_label="Send reminder", cta_url="/announcements",
                        count=len(subs), total=len(roster),
                        assignment_id=a["id"], classroom_id=a["classroom_id"],
                    ))

            _SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}
            action_items.sort(key=lambda i: _SEVERITY_ORDER.get(i.severity, 3))

            # ---- interventions --------------------------------------------
            missing_by_student: dict = {}
            pct_by_student: dict = {}
            classroom_of_student: dict = {}
            for a in assignments:
                subs = submitted.get(a["id"], {})
                marks = graded.get(a["id"], {})
                for sid in roster_by_classroom.get(a["classroom_id"], []):
                    classroom_of_student.setdefault(sid, a["classroom_id"])
                    if sid not in subs:
                        missing_by_student[sid] = missing_by_student.get(sid, 0) + 1
                    if sid in marks and marks[sid] is not None:
                        pct_by_student.setdefault(sid, []).append(float(marks[sid]))

            interventions = []
            for sid, name in student_names.items():
                missing = missing_by_student.get(sid, 0)
                scores = pct_by_student.get(sid, [])
                average = round(sum(scores) / len(scores), 1) if scores else None
                failing = average is not None and average < INTERVENTION_FAILING_PCT
                if missing < INTERVENTION_MISSING_THRESHOLD and not failing:
                    continue
                cid = classroom_of_student.get(sid)
                cls = next((c for c in classrooms if c["id"] == cid), None)
                interventions.append(InterventionOut(
                    student_id=sid,
                    name=name,
                    initials=_initials(name),
                    classroom_name=(
                        f"Class {cls['class_level']} - {cls['section']}" if cls else ""
                    ),
                    missing_count=missing,
                    average_pct=average,
                    reason="failing" if failing else "missed",
                ))
            # Worst first, so the teacher's attention lands where it matters.
            interventions.sort(key=lambda i: (-i.missing_count, i.average_pct or 0))

            # A cohort falling behind is a class-level problem, not N separate
            # student problems -- so it earns one recommendation, not N cards.
            if len(interventions) >= INTERVENTION_MISSING_THRESHOLD:
                action_items.insert(0, ActionItemOut(
                    kind="at_risk", severity="high",
                    title=f"{len(interventions)} students falling behind",
                    finding=", ".join(i.name for i in interventions[:3])
                            + (f" and {len(interventions) - 3} others"
                               if len(interventions) > 3 else "")
                            + " are missing work or scoring low.",
                    suggestion="Consider contacting parents or setting catch-up work.",
                    cta_label="Draft parent emails", cta_url="/parent-communication",
                    count=len(interventions), total=len(student_names),
                    assignment_id=None, classroom_id=None,
                ))

            # ---- recent activity --------------------------------------------
            recent_activity = _recent_submissions(cur, classroom_ids, ACTIVITY_FEED_LIMIT)

            # ---- upcoming events -------------------------------------------
            cur.execute(
                """
                SELECT id, title, event_type, start_at, end_at, is_all_day, visibility, classroom_id
                FROM calendar_events
                WHERE deleted_at IS NULL AND start_at >= NOW()
                  AND (created_by = %s OR visibility = 'school')
                ORDER BY start_at
                LIMIT 5
                """,
                (user["id"],),
            )
            upcoming = [_calendar_event_out(r) for r in cur.fetchall()]

            return TeacherDashboardOut(
                teacher_name=teacher_name,
                metrics=metrics,
                class_options=class_options,
                classes=classes,
                assignment_status=assignment_status,
                upcoming=upcoming,
                action_items=action_items[:6],
                interventions=interventions[:5],
                recent_activity=recent_activity,
                scoped_classroom_id=classroom_id,
            )
    finally:
        conn.close()
