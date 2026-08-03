"""
CLASS SECTIONS + PER-TOPIC PROGRESS (edova-web: Lesson Planner "This Week",
Syllabus Map, Settings > Syllabus tab). Migration 0019.

A class_sections row is one section studying one subject ("Class 10 —
Section A · Mathematics"). It tracks its own taught-topic ticks against the
shared master syllabus tree: a row present in section_topic_progress means
taught; un-ticking deletes the row (sparse). Actual % for a unit =
taught / total topics. Clerk-compatible contract (ncert_rag/clerk/api.py),
served from Postgres.
"""

from typing import List

from fastapi import APIRouter, Depends, Query

from api.repositories import ClassSectionsRepo, get_class_sections_repo
from api.schemas import ClassSectionOut, SectionProgressOut, TopicTickIn, TopicTickOut

router = APIRouter()


@router.get("/api/class-sections/sections", response_model=List[str])
def list_class_sections(year: str, board: str = "CBSE",
                        class_label: str = Query(alias="class"),
                        repo: ClassSectionsRepo = Depends(get_class_sections_repo)):
    """Distinct sections for a class across all its subjects — feeds the
    Settings > Syllabus tab's Section filter from the real class_sections
    table (a section spans every subject it studies, so this ignores
    subject_id rather than requiring one)."""
    return repo.list_section_names(year, board, class_label)


@router.get("/api/class-sections", response_model=ClassSectionOut)
def get_class_section(year: str, subject: str, board: str = "CBSE",
                      class_label: str = Query(alias="class"),
                      section: str = "Section A",
                      repo: ClassSectionsRepo = Depends(get_class_sections_repo)):
    """Get-or-create the section for year/board/class/subject."""
    return repo.get_or_create_section(year, subject, board, class_label, section)


@router.get("/api/class-sections/{section_id}/progress", response_model=SectionProgressOut)
def section_progress(section_id: str,
                     repo: ClassSectionsRepo = Depends(get_class_sections_repo)):
    """The section's taught-topic ticks: topic ids + when they were taught."""
    return repo.get_progress(section_id)


@router.put("/api/class-sections/{section_id}/topics/{topic_id}", response_model=TopicTickOut)
def tick_topic(section_id: str, topic_id: str, body: TopicTickIn,
               repo: ClassSectionsRepo = Depends(get_class_sections_repo)):
    """Tick/untick a taught topic. A row present means taught; unticking
    deletes the row (sparse, like section_topic_progress in migration 0019)."""
    return repo.tick_topic(section_id, topic_id, body.done, body.taught_on)
