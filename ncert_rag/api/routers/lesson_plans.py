"""
LESSON PLANS — Lesson Planner > AI Generator > "Save to My Plans"
(edova-web). Persists the full generated draft so the teacher's library
survives reload and a saved plan can be re-opened in full (migration 0018).
Authless like the rest of this API today — plans are not yet scoped to a
teacher; that waits on the auth layer (see app module docstring).
Clerk-compatible contract (ncert_rag/clerk/api.py), served from Postgres.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException

from api.repositories import LessonPlanRepo, get_lesson_plan_repo
from api.schemas import LessonPlanIn, LessonPlanOut

router = APIRouter()


@router.get("/api/lesson-plans", response_model=List[LessonPlanOut])
def list_lesson_plans(repo: LessonPlanRepo = Depends(get_lesson_plan_repo)):
    """Newest first. Returns the full plan body (not just metadata) so the
    library can re-open a plan after reload without a second round-trip."""
    return repo.list_plans()


@router.post("/api/lesson-plans", response_model=LessonPlanOut)
def create_lesson_plan(body: LessonPlanIn,
                       repo: LessonPlanRepo = Depends(get_lesson_plan_repo)):
    if not body.topic.strip():
        raise HTTPException(status_code=422, detail="topic is required")
    return repo.save_plan(body)


@router.put("/api/lesson-plans/{plan_id}", response_model=LessonPlanOut)
def update_lesson_plan(plan_id: str, body: LessonPlanIn,
                       repo: LessonPlanRepo = Depends(get_lesson_plan_repo)):
    """Full-record replace — lets a saved plan be edited in place, including
    reassigning it to a different class_label/section."""
    if not body.topic.strip():
        raise HTTPException(status_code=422, detail="topic is required")
    return repo.update_plan(plan_id, body)


@router.delete("/api/lesson-plans/{plan_id}", status_code=204)
def delete_lesson_plan(plan_id: str, repo: LessonPlanRepo = Depends(get_lesson_plan_repo)):
    """Soft-delete (deleted_at), matching the schema's convention — a removed
    plan stays recoverable and out of the library list."""
    repo.delete_plan(plan_id)
