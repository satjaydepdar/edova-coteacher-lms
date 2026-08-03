"""
DTOs for the embedded course-CRUD API — the clerk-compatible contract that
edova-web already speaks (paths AND field-for-field response shapes pinned
from ncert_rag/clerk/api.py), now served from Postgres.

Naming follows the clerk's wire format, not the PG column names, where the
two differ (e.g. the clerk's `subject_id` on class-section payloads is the
PG `curriculum_subject_id`).
"""

from typing import List, Optional

from pydantic import BaseModel


# ============================================================
# CURRICULUM — Settings > Curriculum tab (edova-web)
# ============================================================

class AcademicYearOut(BaseModel):
    # Clerk shape: PG has no s_no column — the repo synthesizes it with
    # ROW_NUMBER() OVER (ORDER BY year_label) so the wire keeps clerk's
    # {id, s_no, year_label} triple (and drops PG-only is_active).
    id: str
    s_no: int
    year_label: str


class SubjectOut(BaseModel):
    """The clerk's subject_row serializer."""
    id: str
    s_no: int
    subject_code: str
    subject_name: str
    subject_type: str
    credits: int
    total_marks: Optional[int] = None
    total_chapters: Optional[int] = None
    syllabus_json: dict


class CurriculumOut(BaseModel):
    """The clerk's curriculum_response serializer."""
    id: str
    year_label: str
    board: str
    class_label: str
    updated_at: str
    subjects: List[SubjectOut]


class SubjectIn(BaseModel):
    subject_code: str
    subject_name: str
    subject_type: str = "Core"
    credits: int = 0
    total_marks: Optional[int] = None
    total_chapters: Optional[int] = None
    syllabus_json: dict = {}


# ============================================================
# SYLLABUS — Settings > Master Data tab (edova-web)
# Per-subject detail tree: units (marks) → chapters → topics.
# ============================================================

class ChapterIn(BaseModel):
    number: Optional[int] = None
    name: str
    topics: List[str] = []


class UnitIn(BaseModel):
    number: Optional[int] = None
    name: str
    marks: Optional[int] = None
    chapters: List[ChapterIn] = []


class SyllabusIn(BaseModel):
    units: List[UnitIn] = []


class SyllabusTopicOut(BaseModel):
    id: str
    s_no: int
    title: str


class SyllabusChapterOut(BaseModel):
    id: str
    s_no: int
    number: Optional[int] = None
    name: str
    topics: List[SyllabusTopicOut]


class SyllabusUnitOut(BaseModel):
    id: str
    s_no: int
    number: Optional[int] = None  # migration 0020; clerk emits it too
    name: str
    marks: Optional[int] = None
    chapters: List[SyllabusChapterOut]


class SyllabusOut(BaseModel):
    """The clerk's syllabus_response serializer."""
    subject_id: str
    subject_name: str
    units: List[SyllabusUnitOut]


# ============================================================
# LESSON PLANS — Lesson Planner > AI Generator > "Save to My Plans"
# ============================================================

class LessonPlanIn(BaseModel):
    topic: str
    title: str = ""
    class_label: str
    section: Optional[str] = None
    subject: str
    curriculum_subject_id: Optional[str] = None
    duration_minutes: int = 45
    standards: List[str] = []
    objective: str = ""
    outcomes: List[str] = []
    materials: List[str] = []
    warmup: str = ""
    instruction: str = ""
    activity: str = ""
    assessment: str = ""
    homework: str = ""
    # Bloom's Taxonomy pills the teacher tagged this plan with at generation
    # time. Persisted to lesson_plan_bloom_levels; not read back or used
    # anywhere yet (see LessonPlanner.tsx).
    bloom_levels: List[str] = []


class LessonPlanOut(LessonPlanIn):
    """The clerk's plan_row serializer — standards/materials go out as
    parsed arrays (PG JSONB gives them back natively)."""
    id: str
    created_at: str


# ============================================================
# CLASS SECTIONS + PER-TOPIC PROGRESS — Lesson Planner "This Week",
# Syllabus Map, Settings > Syllabus tab (edova-web)
# ============================================================

class ClassSectionOut(BaseModel):
    """The clerk's get-or-create class-section response. `subject_id` is the
    curriculum-subject id (clerk wire name, PG column curriculum_subject_id)."""
    id: str
    section: str
    subject_id: str
    subject_name: str
    class_label: str
    year_label: str


class DoneTopicOut(BaseModel):
    topic_id: str
    taught_on: Optional[str] = None


class SectionProgressOut(BaseModel):
    section_id: str
    subject_id: str
    done_topics: List[DoneTopicOut]


class TopicTickIn(BaseModel):
    done: bool
    taught_on: Optional[str] = None


class TopicTickOut(BaseModel):
    section_id: str
    topic_id: str
    done: bool


# ============================================================
# MEMORY — behavioral memory layer (migration 0027)
# ============================================================

class MemoryEventIn(BaseModel):
    user_id: str
    role: str                       # 'student' | 'teacher'
    event_type: str                 # 'quiz_mistake' | 'note_saved' | …
    chapter: Optional[str] = None
    topic_id: Optional[str] = None
    subject: Optional[str] = None
    payload: dict = {}


class MemoryEventOut(BaseModel):
    id: str


class RecommendationOut(BaseModel):
    id: str
    kind: str
    title: str
    body: str
    cta_label: str
    cta_url: str
    chapter: Optional[str] = None
    status: str
    created_at: str
