"""Resource-assignment endpoints -- a teacher assigning a catalogued
Learning Resource (OKF video/PDF) to a class, straight from Learning
Resources. Distinct from routers/assignments.py's homework assignments
(grades, due dates, submissions): this is what Student Learning Hub reads
to decide which chapters/media to actually show a student."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from deps import _authenticated_user, _student_id_for_user
from repositories import ResourceAssignmentRepo, get_conn

from .classrooms import _require_classroom

router = APIRouter()


class ResourceAssignmentIn(BaseModel):
    resource_id: str
    resource_title: str
    resource_type: str
    chapter_number: Optional[int] = None
    s3_key: Optional[str] = None


class ResourceAssignmentOut(BaseModel):
    id: str
    classroom_id: str
    resource_id: str
    resource_title: str
    resource_type: str
    chapter_number: Optional[int]
    s3_key: Optional[str]
    assigned_at: str


@router.post(
    "/api/classrooms/{classroom_id}/resource-assignments",
    response_model=ResourceAssignmentOut,
    status_code=201,
)
def assign_resource(classroom_id: str, body: ResourceAssignmentIn, authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            _require_classroom(cur, classroom_id)
            row = ResourceAssignmentRepo.create(
                cur, str(uuid.uuid4()), classroom_id, body.resource_id, body.resource_title,
                body.resource_type, body.chapter_number, body.s3_key, user["id"],
            )
            conn.commit()
            return ResourceAssignmentOut(
                id=row["id"], classroom_id=row["classroom_id"], resource_id=row["resource_id"],
                resource_title=row["resource_title"], resource_type=row["resource_type"],
                chapter_number=row["chapter_number"], s3_key=row["s3_key"],
                assigned_at=row["assigned_at"].isoformat(),
            )
    finally:
        conn.close()


class MyResourceAssignmentOut(BaseModel):
    id: str
    resource_id: str
    resource_title: str
    resource_type: str
    chapter_number: Optional[int]
    s3_key: Optional[str]
    subject: str
    assigned_at: str


@router.get("/api/students/me/resource-assignments", response_model=List[MyResourceAssignmentOut])
def list_my_resource_assignments(authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            student_id = _student_id_for_user(cur, user["id"])
            return [
                MyResourceAssignmentOut(
                    id=r["id"], resource_id=r["resource_id"], resource_title=r["resource_title"],
                    resource_type=r["resource_type"], chapter_number=r["chapter_number"],
                    s3_key=r["s3_key"], subject=r["subject"], assigned_at=r["assigned_at"].isoformat(),
                )
                for r in ResourceAssignmentRepo.list_for_student(cur, student_id)
            ]
    finally:
        conn.close()
