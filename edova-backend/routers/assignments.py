"""Assignment endpoints: assignments + submissions + grades."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from deps import _authenticated_user, _student_id_for_user
from domain import derive_submission_status, is_late_submission
from repositories import AssignmentRepo, get_conn

from .classrooms import _require_classroom

router = APIRouter()


class AssignmentIn(BaseModel):
    title: str
    description: str = ""
    due_date: Optional[str] = None  # ISO 8601
    points_possible: float = 100
    # The frontend's submission-method concept (written/pdf/mcq/media/coding)
    # -- a distinct idea from assignments.type's category enum
    # (homework/quiz/exam/...), so it's kept in `settings` JSONB rather than
    # force-fit into that column.
    submission_type: str = "written"
    attachments: List[dict] = []
    # Question sections carried from a saved assessment (Assessment Builder)
    # -- stored in settings JSONB next to submission_type, so the student
    # side can render the actual questions (MCQ runner etc.).
    sections: List[dict] = []
    # Chapter/topic the assessment targets — feeds the memory layer when the
    # student makes mistakes (struggle cards, common-mistake distractors).
    topic_label: str = ""


class AssignmentOut(BaseModel):
    id: str
    title: str
    description: str
    due_date: Optional[str]
    points_possible: float
    submission_type: str
    attachments: List[dict]
    sections: List[dict]
    created_at: str


def _assignment_out(row) -> AssignmentOut:
    return AssignmentOut(
        id=row["id"],
        title=row["title"],
        description=row["description"] or "",
        due_date=row["due_date"].isoformat() if row["due_date"] else None,
        points_possible=float(row["points_possible"]),
        submission_type=(row["settings"] or {}).get("submission_type", "written"),
        attachments=row["attachments"] or [],
        sections=(row["settings"] or {}).get("sections", []),
        created_at=row["created_at"].isoformat(),
    )


@router.post("/api/classrooms/{classroom_id}/assignments", response_model=AssignmentOut, status_code=201)
def create_assignment(classroom_id: str, body: AssignmentIn, authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            _require_classroom(cur, classroom_id)
            row = AssignmentRepo.create(
                cur, str(uuid.uuid4()), classroom_id, user["id"], body.title, body.description,
                body.points_possible, body.due_date, body.attachments, body.submission_type,
                body.sections, body.topic_label,
            )
            conn.commit()
            return _assignment_out(row)
    finally:
        conn.close()


@router.get("/api/classrooms/{classroom_id}/assignments", response_model=List[AssignmentOut])
def list_assignments(classroom_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            _require_classroom(cur, classroom_id)
            return [_assignment_out(r) for r in AssignmentRepo.list_for_classroom(cur, classroom_id)]
    finally:
        conn.close()


class MyAssignmentOut(BaseModel):
    id: str
    title: str
    description: str
    due_date: Optional[str]
    points_possible: float
    submission_type: str
    classroom_name: str
    submission_status: str  # not_started | submitted | late | graded
    submitted_at: Optional[str]
    text_response: Optional[str]
    points_earned: Optional[float]
    feedback: Optional[str]
    sections: List[dict] = []
    topic_label: str = ""
    # The student's stored MCQ answers — lets a submitted quiz reopen as a
    # read-only review instead of a blank quiz.
    answers: List[dict] = []


@router.get("/api/students/me/assignments", response_model=List[MyAssignmentOut])
def list_my_assignments(authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            student_id = _student_id_for_user(cur, user["id"])
            out = []
            for r in AssignmentRepo.list_for_student(cur, student_id):
                out.append(MyAssignmentOut(
                    id=r["id"],
                    title=r["title"],
                    description=r["description"] or "",
                    due_date=r["due_date"].isoformat() if r["due_date"] else None,
                    points_possible=float(r["points_possible"]),
                    submission_type=(r["settings"] or {}).get("submission_type", "written"),
                    classroom_name=f"Class {r['class_level']} — {r['section']} · {r['subject']}",
                    submission_status=derive_submission_status(r["points_earned"], r["sub_status"], r["is_late"]),
                    submitted_at=r["submitted_at"].isoformat() if r["submitted_at"] else None,
                    text_response=r["text_response"],
                    points_earned=float(r["points_earned"]) if r["points_earned"] is not None else None,
                    feedback=r["feedback"],
                    sections=(r["settings"] or {}).get("sections", []),
                    topic_label=(r["settings"] or {}).get("topic_label", ""),
                    answers=r["answers"] or [],
                ))
            return out
    finally:
        conn.close()


class SubmissionIn(BaseModel):
    text_response: str = ""
    # MCQ answers: [{question_id, selected}] where selected is the option
    # label ('A') or the option text. Scored server-side against the
    # assignment's settings.sections — the client never grades itself.
    answers: Optional[List[dict]] = None


class SubmissionOut(BaseModel):
    assignment_id: str
    status: str
    submitted_at: str
    is_late: bool
    text_response: str
    # Present when the submission carried MCQ answers and was auto-graded.
    score: Optional[float] = None
    max_score: Optional[float] = None
    results: List[dict] = []


def _score_mcq(sections: list, answers: list) -> dict:
    """Score MCQ answers against the questions stored in settings.sections.
    Points per question: question.marks, else section.pointsPer, else 1.
    Returns score, max_score, and a per-question review list."""
    chosen = {a.get("question_id"): str(a.get("selected", "")).strip() for a in answers}
    score = max_score = 0.0
    results = []
    for sec in sections:
        sec_points = sec.get("pointsPer") or 1
        for q in sec.get("questions", []):
            options = q.get("options") or []
            correct_opt = next((o for o in options if o.get("correct")), None)
            correct_text = (correct_opt or {}).get("text") or q.get("correctAnswer")
            if not correct_text:
                continue  # not an objectively gradable question (essay etc.)
            points = q.get("marks") or sec_points
            max_score += points
            sel = chosen.get(q.get("id"), "")
            correct_label = (correct_opt or {}).get("label", "")
            is_correct = bool(sel) and sel in (correct_text, correct_label)
            if is_correct:
                score += points
            results.append({
                "question_id": q.get("id"),
                "correct": is_correct,
                "correct_answer": correct_text,
                "explanation": q.get("explanation") or "",
            })
    return {"score": score, "max_score": max_score, "results": results}


@router.put("/api/assignments/{assignment_id}/submissions/me", response_model=SubmissionOut)
def submit_my_assignment(assignment_id: str, body: SubmissionIn, authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            student_id = _student_id_for_user(cur, user["id"])
            row = AssignmentRepo.find_with_classroom(cur, assignment_id)
            if row is None:
                raise HTTPException(status_code=404, detail="assignment not found")
            if not AssignmentRepo.enrollment_active(cur, row["classroom_id"], student_id):
                raise HTTPException(status_code=403, detail="not enrolled in this assignment's class")

            is_late = is_late_submission(row["due_date"])
            existing = AssignmentRepo.find_submission(cur, assignment_id, student_id)
            if existing:
                r = AssignmentRepo.update_submission(cur, body.text_response, is_late, existing["id"], body.answers)
            else:
                r = AssignmentRepo.create_submission(
                    cur, str(uuid.uuid4()), assignment_id, student_id, body.text_response,
                    is_late, row["academic_year"], body.answers,
                )

            # Auto-grade MCQ answers server-side and record the grade so the
            # teacher's tracker shows the score without manual evaluation.
            scored = None
            if body.answers is not None:
                cur.execute("SELECT settings FROM assignments WHERE id = %s", (assignment_id,))
                settings_row = cur.fetchone()
                sections = ((settings_row or {}).get("settings") or {}).get("sections", []) if settings_row else []
                if sections:
                    scored = _score_mcq(sections, body.answers)
                    ctx = AssignmentRepo.find_grading_context(cur, assignment_id)
                    existing_grade = AssignmentRepo.find_grade(cur, assignment_id, student_id)
                    if existing_grade:
                        AssignmentRepo.update_grade(
                            cur, scored["score"], ctx["points_possible"], "Auto-graded (MCQ)", user["id"], existing_grade["id"]
                        )
                    else:
                        AssignmentRepo.create_grade(
                            cur, str(uuid.uuid4()), assignment_id, student_id, user["id"],
                            scored["score"], ctx["points_possible"], "Auto-graded (MCQ)", ctx["academic_year"],
                        )
            conn.commit()
            return SubmissionOut(
                assignment_id=r["assignment_id"],
                status=r["status"],
                submitted_at=r["submitted_at"].isoformat(),
                is_late=r["is_late"],
                text_response=r["text_response"] or "",
                score=scored["score"] if scored else None,
                max_score=scored["max_score"] if scored else None,
                results=scored["results"] if scored else [],
            )
    finally:
        conn.close()


class RosterSubmissionOut(BaseModel):
    student_id: str
    status: str
    submitted_at: Optional[str]
    is_late: bool
    text_response: str
    answers: Optional[List[dict]] = None


@router.get("/api/assignments/{assignment_id}/submissions", response_model=List[RosterSubmissionOut])
def list_submissions(assignment_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            return [
                RosterSubmissionOut(
                    student_id=r["student_id"],
                    status=r["status"],
                    submitted_at=r["submitted_at"].isoformat() if r["submitted_at"] else None,
                    is_late=r["is_late"],
                    text_response=r["text_response"] or "",
                    answers=r["answers"] or [],
                )
                for r in AssignmentRepo.list_submissions(cur, assignment_id)
            ]
    finally:
        conn.close()


class GradeIn(BaseModel):
    points_earned: Optional[float] = None
    feedback: str = ""


class GradeOut(BaseModel):
    assignment_id: str
    student_id: str
    points_earned: Optional[float]
    points_possible: float
    feedback: str
    status: str


def _grade_out(row) -> GradeOut:
    return GradeOut(
        assignment_id=row["assignment_id"],
        student_id=row["student_id"],
        points_earned=float(row["points_earned"]) if row["points_earned"] is not None else None,
        points_possible=float(row["points_possible"]),
        feedback=row["feedback"] or "",
        status=row["status"],
    )


# Grading, independent of any submission row -- there is no real student
# submission flow yet (Student portal, separate roadmap item), so a grade
# here is keyed directly on (assignment_id, student_id) rather than gating
# on a "submitted" status nothing can ever set.
@router.put("/api/assignments/{assignment_id}/grades/{student_id}", response_model=GradeOut)
def upsert_grade(
    assignment_id: str, student_id: str, body: GradeIn, authorization: Optional[str] = Header(None)
):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            row = AssignmentRepo.find_grading_context(cur, assignment_id)
            if row is None:
                raise HTTPException(status_code=404, detail="assignment not found")
            points_possible, academic_year = row["points_possible"], row["academic_year"]

            existing = AssignmentRepo.find_grade(cur, assignment_id, student_id)
            if existing:
                row = AssignmentRepo.update_grade(
                    cur, body.points_earned, points_possible, body.feedback, user["id"], existing["id"]
                )
            else:
                row = AssignmentRepo.create_grade(
                    cur, str(uuid.uuid4()), assignment_id, student_id, user["id"], body.points_earned,
                    points_possible, body.feedback, academic_year,
                )
            conn.commit()
            return _grade_out(row)
    finally:
        conn.close()


@router.get("/api/assignments/{assignment_id}/grades", response_model=List[GradeOut])
def list_grades(assignment_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            return [_grade_out(r) for r in AssignmentRepo.list_grades(cur, assignment_id)]
    finally:
        conn.close()
