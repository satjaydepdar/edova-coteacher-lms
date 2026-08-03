"""Chapter-id mapping — the SINGLE source of truth for how NCERT Class-10
book chapters map to OKF chapter ids, used by both services:

  - api/app.py (uploads): frontend chapter id  -> OKF chapter id  (to_okf_chapter)
  - clerk/api.py (resources): OKF chapter id   -> (subject, global chapter number)  (to_global_chapter_ref)

CBSE Class 10 NCERT: math chapters map directly (ch5 -> math-ch5); the
science book is split chemistry 1-4, biology 5-8, physics 9-13, while OKF
domain-local ids restart at ch1 per domain (biology-ch1 is book chapter 5).
CBSE Class 10 2026-27 specific — revisit if the syllabus changes.
"""
import re
from typing import Optional

# (domain, first global chapter, last global chapter) — the one place the
# science split is defined. Both directions below derive from this.
SCIENCE_DOMAIN_RANGES = (
    ("chemistry", 1, 4),
    ("biology", 5, 8),
    ("physics", 9, 13),
)

_GLOBAL_SUBJECT_SLUG = {"math": "Mathematics", "science": "Science"}

_OKF_ID_RE = re.compile(r"^[a-z]+-ch\d+$")
_FRONTEND_ID_RE = re.compile(r"(?:sci10-|math10-)?ch(\d+)")
_CHAPTER_REF_RE = re.compile(r"^(math|science|biology|chemistry|physics)-ch(\d+)$")


def to_okf_chapter(subject: str, chapter: str) -> tuple[str, str]:
    """Frontend chapter id -> (subject, OKF chapter id).

    OKF form (biology-ch1) passes through. Raises ValueError for unmappable
    ids (callers translate to their own error type — HTTPException, etc)."""
    if _OKF_ID_RE.fullmatch(chapter):
        return subject, chapter
    m = _FRONTEND_ID_RE.fullmatch(chapter)
    if not m:
        raise ValueError(f"cannot map chapter '{chapter}' - pass OKF chapter_id")
    n = int(m.group(1))
    if subject == "science":
        # Upper-bound match, exactly like the original branch chain: n<=4
        # chemistry, n<=8 biology, anything higher physics (unbounded).
        for domain, first, last in SCIENCE_DOMAIN_RANGES:
            if n <= last:
                return subject, f"{domain}-ch{n - first + 1}"
        domain, first, _ = SCIENCE_DOMAIN_RANGES[-1]
        return subject, f"{domain}-ch{n - first + 1}"
    return subject, f"math-ch{n}"


def to_global_chapter_ref(chapter_id: str) -> Optional[tuple[str, int]]:
    """OKF chapter id -> (subject display name, global book chapter number).

    'math-ch5' -> ('Mathematics', 5); 'science-ch9' -> ('Science', 9)
    (already-global, from an app upload); 'biology-ch1' -> ('Science', 5);
    'physics-ch3' -> ('Science', 11). None if the shape isn't recognized."""
    m = _CHAPTER_REF_RE.match(chapter_id or "")
    if not m:
        return None
    domain, local = m.group(1), int(m.group(2))
    if domain in _GLOBAL_SUBJECT_SLUG:
        return _GLOBAL_SUBJECT_SLUG[domain], local
    for name, first, _last in SCIENCE_DOMAIN_RANGES:
        if name == domain:
            return "Science", first + local - 1
    return None
