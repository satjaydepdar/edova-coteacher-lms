"""Calendar-event endpoints."""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Header
from pydantic import BaseModel

from deps import _authenticated_user
from repositories import CalendarRepo, get_conn

router = APIRouter()


class CalendarEventIn(BaseModel):
    title: str
    event_type: str  # meeting/holiday/exam/event (assignment due dates come from real assignments, not this)
    start_at: str  # ISO 8601
    end_at: Optional[str] = None
    is_all_day: bool = False
    visibility: str = "school"  # or "private"
    classroom_id: Optional[str] = None


class CalendarEventOut(BaseModel):
    id: str
    title: str
    event_type: str
    start_at: str
    end_at: Optional[str]
    is_all_day: bool
    visibility: str
    classroom_id: Optional[str]


def _calendar_event_out(row) -> CalendarEventOut:
    return CalendarEventOut(
        id=row["id"],
        title=row["title"],
        event_type=row["event_type"],
        start_at=row["start_at"].isoformat(),
        end_at=row["end_at"].isoformat() if row["end_at"] else None,
        is_all_day=row["is_all_day"],
        visibility=row["visibility"],
        classroom_id=row["classroom_id"],
    )


# Personal/school-scoped, unlike the fully-public classroom/roster reads --
# both GET and POST require a valid session (the first authenticated read
# endpoint; assignment writes were the first authenticated write).
@router.post("/api/calendar-events", response_model=CalendarEventOut, status_code=201)
def create_calendar_event(body: CalendarEventIn, authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            row = CalendarRepo.create_event(
                cur, str(uuid.uuid4()), body.classroom_id, user["id"], body.title, body.event_type,
                body.start_at, body.end_at, body.is_all_day, body.visibility,
            )
            conn.commit()
            return _calendar_event_out(row)
    finally:
        conn.close()


@router.get("/api/calendar-events", response_model=List[CalendarEventOut])
def list_calendar_events(authorization: Optional[str] = Header(None)):
    user, _ = _authenticated_user(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            return [_calendar_event_out(r) for r in CalendarRepo.list_visible(cur, user["id"])]
    finally:
        conn.close()
