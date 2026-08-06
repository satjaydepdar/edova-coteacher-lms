"""Pure domain rules shared by the assignment handlers -- no I/O, no HTTP."""

from datetime import datetime, timezone


def derive_submission_status(points_earned, sub_status, is_late) -> str:
    """not_started | submitted | late | graded -- a grade wins over any
    submission state; otherwise lateness comes from the submission row."""
    if points_earned is not None:
        return "graded"
    if sub_status is not None:
        return "late" if is_late else "submitted"
    return "not_started"


def is_late_submission(due_date) -> bool:
    """A submission counts as late when the assignment has a due date and
    that due date is already in the past at submission time."""
    return bool(due_date and datetime.now(timezone.utc) > due_date)
