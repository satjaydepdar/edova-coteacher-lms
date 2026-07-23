"""
Determines which subject/chapter a dropped file belongs to. Folder
placement is the primary, free signal — a file under
edova-brain/biology-knowledge/chapters/life-processes/... already tells
you everything. Only falls through to "unknown" (for an LLM-based
classifier to resolve, or a human to place manually) when the drop
location genuinely doesn't encode it — e.g. a flat concept-videos/ folder
with no per-chapter structure.
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


@dataclass
class RouteResult:
    subject_slug: str          # e.g. "biology-knowledge"
    subject_title: str         # e.g. "Biology Knowledge"
    chapter_slug: Optional[str] = None   # e.g. "life-processes", or None if undetermined
    chapter_title: Optional[str] = None  # e.g. "Life Processes"


def _slug_to_title(slug: str) -> str:
    return " ".join(word.capitalize() for word in re.split(r"[-_]", slug) if word)


def route_from_path(source_path: Path, brain_root: Path) -> Optional[RouteResult]:
    """
    Deterministic routing from folder placement alone. Returns None if
    source_path isn't under a recognizable {subject}-knowledge/ workspace
    at all (e.g. a file dropped directly in edova-brain/ with no subject
    folder) — that's a "where does this even go" case, not something to
    guess at silently.
    """
    try:
        rel_parts = source_path.resolve().relative_to(brain_root.resolve()).parts
    except ValueError:
        return None

    # A file sitting directly in brain_root (rel_parts has just the
    # filename, no subdirectory) has no subject folder to route from at all.
    if len(rel_parts) < 2:
        return None

    subject_slug = rel_parts[0]
    if subject_slug == "OKF":
        return None  # never route files already inside the OKF bundle itself
    subject_title = _slug_to_title(subject_slug.removesuffix("-knowledge").removesuffix("-Knowledge"))

    # If the path already goes through chapters/{slug}/, that slug IS the
    # chapter — no guessing needed.
    if "chapters" in rel_parts:
        idx = rel_parts.index("chapters")
        if idx + 1 < len(rel_parts):
            chapter_slug = rel_parts[idx + 1]
            return RouteResult(
                subject_slug=subject_slug,
                subject_title=subject_title,
                chapter_slug=chapter_slug,
                chapter_title=_slug_to_title(chapter_slug),
            )

    # Flat drop folder (e.g. concept-videos/, references/ directly under
    # the subject) — chapter isn't derivable from the path alone.
    return RouteResult(subject_slug=subject_slug, subject_title=subject_title)
