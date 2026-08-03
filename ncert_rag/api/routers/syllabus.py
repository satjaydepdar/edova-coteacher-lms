"""
SYLLABUS — Settings > Master Data tab (edova-web).
Per-subject syllabus detail tree: units (marks) → chapters → topics.
Clerk-compatible contract (ncert_rag/clerk/api.py), served from Postgres.
"""

from fastapi import APIRouter, Depends

from api.repositories import SyllabusRepo, get_syllabus_repo
from api.schemas import SyllabusIn, SyllabusOut

router = APIRouter()


@router.get("/api/curriculum-subjects/{subject_id}/syllabus", response_model=SyllabusOut)
def get_syllabus(subject_id: str, repo: SyllabusRepo = Depends(get_syllabus_repo)):
    return repo.get_syllabus(subject_id)


@router.put("/api/curriculum-subjects/{subject_id}/syllabus", response_model=SyllabusOut)
def put_syllabus(subject_id: str, body: SyllabusIn,
                 repo: SyllabusRepo = Depends(get_syllabus_repo)):
    """Replace the subject's whole syllabus tree in one transaction, then
    recompute the Curriculum-tab summary (syllabus_json unit→marks map and
    total_chapters) from the tree so summary and detail can't drift."""
    return repo.put_syllabus(subject_id, body)
