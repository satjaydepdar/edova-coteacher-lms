"""
Writes new OKF concept files into a bundle — the deterministic counterpart
to OKFBundleParser (which reads them). This is the part of the pipeline
where correctness matters more than flexibility: computed paths, not
hand-counted ../, and idempotent index/log updates so re-processing the
same source file twice doesn't duplicate bundle entries.
"""

import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

import frontmatter

# Human-readable index.md section heading per OKF type, used when a
# ConceptSpec doesn't specify one explicitly (e.g. "Video" -> "Videos").
_DEFAULT_SECTION_BY_TYPE = {
    "Video": "Videos",
    "Worksheet": "Worksheets",
    "QuestionBank": "Question Bank",
    "AnswerKey": "Answer Keys",
    "Assessment": "Assessments",
    "Lesson": "Lessons",
    "Module": "Modules",
    "Reference": "References",
}


@dataclass
class ConceptSpec:
    bundle_dir: Path            # e.g. OKF/biology-knowledge
    chapter_slug: str           # e.g. "life-processes"
    chapter_title: str          # e.g. "Life Processes" — human-readable, for frontmatter chapter: and index headings
    concept_slug: str           # e.g. "digestive-system"
    okf_type: str               # "Video", "Reference", "Module", etc.
    title: str
    description: str
    source_path: Path           # absolute path to the actual source file this concept points at
    subfolder: Optional[str] = None       # e.g. "videos" — None means the concept file sits directly in the chapter dir
    tags: List[str] = field(default_factory=list)
    section_heading: Optional[str] = None  # index.md section — defaults from okf_type via _DEFAULT_SECTION_BY_TYPE
    extra_frontmatter: Dict = field(default_factory=dict)  # e.g. {"duration": "00:01:40", "status": "completed"}
    subject_title: Optional[str] = None    # e.g. "Biology Knowledge" — only needed the first time a bundle is created


def write_concept(spec: ConceptSpec) -> Path:
    """
    Write a new OKF concept file (creating chapter/bundle scaffolding as
    needed) and update the surrounding index.md/log.md files. Returns the
    concept's absolute file path. Safe to call again for the same
    concept_slug — file writes and index/log updates are idempotent.
    """
    bundle_dir = Path(spec.bundle_dir)
    chapter_dir = bundle_dir / "chapters" / spec.chapter_slug
    concept_dir = chapter_dir / spec.subfolder if spec.subfolder else chapter_dir
    concept_file = concept_dir / f"{spec.concept_slug}.md"

    _ensure_bundle_scaffold(bundle_dir, spec.subject_title or bundle_dir.name)
    _ensure_chapter_scaffold(bundle_dir, spec.chapter_slug, spec.chapter_title)
    if spec.subfolder:
        _ensure_subfolder_index(chapter_dir, spec.subfolder)

    concept_dir.mkdir(parents=True, exist_ok=True)
    resource_rel = _compute_relative_resource(concept_file, Path(spec.source_path))
    _write_concept_file(concept_file, spec, resource_rel)

    section = spec.section_heading or _DEFAULT_SECTION_BY_TYPE.get(spec.okf_type, spec.okf_type + "s")
    link = f"{spec.subfolder}/{spec.concept_slug}.md" if spec.subfolder else f"{spec.concept_slug}.md"
    _update_index(chapter_dir / "index.md", section, spec.title, link)
    if spec.subfolder:
        _update_index(chapter_dir / spec.subfolder / "index.md", None, spec.title, f"{spec.concept_slug}.md")

    _update_log(
        chapter_dir / "log.md",
        f"**Creation**: Added [{spec.title}]({link}) concept, pointing at `{resource_rel}`.",
    )
    _update_log(
        bundle_dir / "log.md",
        f"**Creation**: Added [{spec.title}]({'chapters/' + spec.chapter_slug + '/' + link}) "
        f"under {spec.chapter_title}.",
    )

    return concept_file


def _compute_relative_resource(concept_file: Path, source_path: Path) -> str:
    """Same computation used throughout this session — os.path.relpath, not
    hand-counted ../, then verified it actually resolves before returning."""
    rel = os.path.relpath(source_path.resolve(), start=concept_file.parent)
    rel = rel.replace(os.sep, "/")
    resolved = (concept_file.parent / rel).resolve()
    if resolved != source_path.resolve():
        raise ValueError(
            f"computed resource path doesn't round-trip: {rel} resolves to {resolved}, expected {source_path}"
        )
    return rel


def _write_concept_file(concept_file: Path, spec: ConceptSpec, resource_rel: str) -> None:
    metadata = {
        "type": spec.okf_type,
        "title": spec.title,
        "description": spec.description,
        "resource": resource_rel,
        "tags": spec.tags,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "chapter": spec.chapter_title,
        **spec.extra_frontmatter,
    }
    post = frontmatter.Post(f"# {spec.title}\n\n{spec.description}\n", **metadata)
    concept_file.write_text(frontmatter.dumps(post, sort_keys=False) + "\n", encoding="utf-8")


def _ensure_bundle_scaffold(bundle_dir: Path, subject_title: str) -> None:
    bundle_dir.mkdir(parents=True, exist_ok=True)
    (bundle_dir / "chapters").mkdir(exist_ok=True)

    index_path = bundle_dir / "index.md"
    if not index_path.exists():
        index_path.write_text(
            '---\nokf_version: "0.1"\n---\n\n'
            f"# {subject_title} — OKF Bundle\n\n"
            "## Chapters\n\nSee [chapters/index.md](chapters/index.md).\n\n"
            "See [log.md](log.md) for the change history.\n",
            encoding="utf-8",
        )

    log_path = bundle_dir / "log.md"
    if not log_path.exists():
        log_path.write_text(f"# {subject_title} — Change Log\n", encoding="utf-8")

    chapters_index = bundle_dir / "chapters" / "index.md"
    if not chapters_index.exists():
        chapters_index.write_text("# Chapters\n", encoding="utf-8")


def _ensure_chapter_scaffold(bundle_dir: Path, chapter_slug: str, chapter_title: str) -> None:
    chapter_dir = bundle_dir / "chapters" / chapter_slug
    is_new = not chapter_dir.exists()
    chapter_dir.mkdir(parents=True, exist_ok=True)

    index_path = chapter_dir / "index.md"
    if not index_path.exists():
        index_path.write_text(f"# {chapter_title}\n\nSee [log.md](log.md) for the change history.\n", encoding="utf-8")

    log_path = chapter_dir / "log.md"
    if not log_path.exists():
        log_path.write_text(f"# {chapter_title} — Change Log\n", encoding="utf-8")

    if is_new:
        _update_index(
            bundle_dir / "chapters" / "index.md", None, chapter_title, f"{chapter_slug}/index.md"
        )


def _ensure_subfolder_index(chapter_dir: Path, subfolder: str) -> None:
    sub_index = chapter_dir / subfolder / "index.md"
    sub_index.parent.mkdir(parents=True, exist_ok=True)
    if not sub_index.exists():
        sub_index.write_text(f"# {subfolder.capitalize()}\n", encoding="utf-8")


def _update_index(index_path: Path, section: Optional[str], title: str, rel_link: str) -> None:
    """
    Idempotently add "* [title](rel_link) - " under a "## {section}" heading
    (creating the section if it doesn't exist), or as a bare top-level bullet
    if section is None. Skips the write entirely if that exact link is
    already present anywhere in the file — safe to call twice.
    """
    bullet = f"* [{title}]({rel_link})"
    text = index_path.read_text(encoding="utf-8") if index_path.exists() else "# Index\n"

    if rel_link in text:
        return  # already linked — idempotent no-op

    lines = text.splitlines()

    if section is None:
        lines.append(bullet)
        index_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return

    heading = f"## {section}"
    if heading in text:
        # Insert after the last bullet in that section (i.e. right before
        # the next "##" heading, or end of file).
        start = lines.index(heading)
        insert_at = len(lines)
        for i in range(start + 1, len(lines)):
            if lines[i].startswith("## "):
                insert_at = i
                break
        # Trim trailing blank lines within the section before inserting.
        while insert_at > start + 1 and lines[insert_at - 1].strip() == "":
            insert_at -= 1
        lines.insert(insert_at, bullet)
    else:
        # New section — append before a trailing "See [log.md]" line if
        # present, else at the end.
        trailer_idx = next((i for i, l in enumerate(lines) if l.startswith("See [log.md]")), None)
        block = ["", heading, "", bullet]
        if trailer_idx is not None:
            lines[trailer_idx:trailer_idx] = block + [""]
        else:
            lines.extend(block)

    index_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def _update_log(log_path: Path, entry_text: str) -> None:
    """
    Idempotently add a bullet under today's date section (newest-first,
    per the OKF spec's log.md convention) — creates the date section right
    after the H1 title if it doesn't exist yet. Skips if entry_text is
    already present anywhere in the file.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    text = log_path.read_text(encoding="utf-8") if log_path.exists() else "# Log\n"

    if entry_text in text:
        return

    lines = text.splitlines()
    date_heading = f"## {today}"
    bullet = f"* {entry_text}"

    if date_heading in lines:
        idx = lines.index(date_heading)
        insert_at = idx + 1
        while insert_at < len(lines) and lines[insert_at].startswith("* "):
            insert_at += 1
        lines.insert(insert_at, bullet)
    else:
        # New date section goes right after the H1 (line 0), newest-first.
        lines[1:1] = ["", date_heading, bullet]

    log_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
