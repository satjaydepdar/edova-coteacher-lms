"""
CURRICULUM — Settings > Curriculum tab (edova-web).
Clerk-compatible contract (ncert_rag/clerk/api.py), served from Postgres.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from api.repositories import CurriculumRepo, get_curriculum_repo
from api.schemas import AcademicYearOut, CurriculumOut, SubjectIn, SubjectOut

router = APIRouter()


@router.get("/api/academic-years", response_model=List[AcademicYearOut])
def list_academic_years(repo: CurriculumRepo = Depends(get_curriculum_repo)):
    return repo.list_academic_years()


@router.get("/api/curriculums/classes", response_model=List[str])
def list_curriculum_classes(year: str, board: str = "CBSE",
                            repo: CurriculumRepo = Depends(get_curriculum_repo)):
    """Distinct classes that have a curriculum row for this year/board — feeds
    the Settings > Syllabus tab's Class filter from real Master Data instead
    of a static option list."""
    return repo.list_curriculum_classes(year, board)


@router.get("/api/curriculums", response_model=CurriculumOut)
def get_curriculum(year: str, board: str = "CBSE",
                   class_label: str = Query(alias="class"),
                   repo: CurriculumRepo = Depends(get_curriculum_repo)):
    """Get-or-create the curriculum card for a year/board/class combo — the
    Settings page always shows the card, so a missing combo is an empty
    curriculum, not an error."""
    if not year or not class_label:
        raise HTTPException(status_code=422, detail="year and class are required")
    return repo.get_or_create_curriculum(year, board, class_label)


@router.post("/api/curriculums/{cur_id}/subjects", response_model=SubjectOut)
def add_subject(cur_id: str, body: SubjectIn,
                repo: CurriculumRepo = Depends(get_curriculum_repo)):
    if not body.subject_code.strip() or not body.subject_name.strip():
        raise HTTPException(status_code=422,
                            detail="subject_code and subject_name are required")
    return repo.add_subject(cur_id, body)


@router.delete("/api/curriculums/{cur_id}/subjects/{subject_id}")
def delete_subject(cur_id: str, subject_id: str,
                   repo: CurriculumRepo = Depends(get_curriculum_repo)):
    repo.delete_subject(cur_id, subject_id)
    return {"status": "deleted"}
