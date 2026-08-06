"""Classroom + roster read endpoints."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from repositories import ClassroomRepo, get_conn

router = APIRouter()


class ClassroomOut(BaseModel):
    id: str
    name: str
    section: Optional[str]
    class_level: int
    academic_year: str
    subject: str
    teacher_name: str


class StudentOut(BaseModel):
    id: str
    student_number: str
    first_name: str
    last_name: str
    class_level: Optional[int]


def _require_classroom(cur, classroom_id: str) -> None:
    try:
        uuid.UUID(classroom_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="classroom not found")
    if not ClassroomRepo.exists(cur, classroom_id):
        raise HTTPException(status_code=404, detail="classroom not found")


# Read-only, no auth gate -- classroom/roster reads stay open; assignment
# writes are the endpoints that actually require a session.
@router.get("/api/classrooms", response_model=List[ClassroomOut])
def list_classrooms():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            return ClassroomRepo.list_all(cur)
    finally:
        conn.close()


@router.get("/api/classrooms/{classroom_id}/students", response_model=List[StudentOut])
def list_classroom_students(classroom_id: str):
    try:
        uuid.UUID(classroom_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="classroom not found")
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if not ClassroomRepo.exists(cur, classroom_id):
                raise HTTPException(status_code=404, detail="classroom not found")
            return ClassroomRepo.list_students(cur, classroom_id)
    finally:
        conn.close()
