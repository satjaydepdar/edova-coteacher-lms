"""
Orchestrates one document end-to-end: route -> convert -> generate
metadata -> write OKF concept. This is the "ETL pipeline with two LLM
calls in it" from the architecture discussion — not an agent. Every step
runs in a fixed order; nothing here decides *whether* to convert or
*what order* to do things in, only *what* the type-specific conversion
produces.
"""

import re
from pathlib import Path
from typing import Optional

from watcher.chapter_router import route_from_path
from watcher.converters import document_converter, excel_converter, image_converter, text_converter, video_converter
from watcher.metadata_generator import generate_metadata
from watcher.okf_writer import ConceptSpec, write_concept
from watcher.type_router import detect_type

_CONVERTERS = {
    "pdf": document_converter,
    "docx": document_converter,
    "video": video_converter,
    "image": image_converter,
    "excel": excel_converter,
    "text": text_converter,
}

# Matches the convention already established by hand for the biology
# bundle — Video concepts get a videos/ subfolder, most other types sit
# directly in the chapter dir.
_SUBFOLDER_BY_TYPE = {
    "Video": "videos",
    "Worksheet": "worksheets",
    "QuestionBank": "question-bank",
}


def process_document(source_path: Path, brain_root: Path, okf_root: Path) -> Optional[Path]:
    """
    Full pipeline for one newly-arrived file. Returns the written concept
    file path, or None if the file was skipped — skips are always logged
    with a reason, never silent.
    """
    kind = detect_type(source_path)
    if kind is None:
        return None

    route = route_from_path(source_path, brain_root)
    if route is None:
        print(f"[pipeline] {source_path} isn't under a recognizable {{subject}}-knowledge/ workspace — skipping")
        return None
    if route.chapter_slug is None:
        print(
            f"[pipeline] {source_path} has no chapters/<slug>/ in its path — chapter can't be "
            f"determined from folder placement alone. Move it under chapters/<slug>/ to route "
            f"automatically, or add an LLM-based classifier fallback (deliberately not built yet — "
            f"see the architecture discussion this pipeline came from)."
        )
        return None

    converter = _CONVERTERS.get(kind)
    if converter is None:
        print(f"[pipeline] no converter registered for kind={kind}")
        return None

    try:
        conversion = converter.convert(source_path)
    except Exception as e:
        print(f"[pipeline] conversion failed for {source_path}: {e}")
        return None

    metadata = generate_metadata(
        conversion.text_content,
        filename_hint=source_path.stem,
        chapter_hint=route.chapter_title,
    )

    bundle_dir = okf_root / route.subject_slug
    subfolder = _SUBFOLDER_BY_TYPE.get(conversion.suggested_okf_type)

    spec = ConceptSpec(
        bundle_dir=bundle_dir,
        chapter_slug=route.chapter_slug,
        chapter_title=route.chapter_title,
        concept_slug=_slugify(source_path.stem),
        okf_type=conversion.suggested_okf_type,
        title=metadata["title"],
        description=metadata["description"],
        source_path=source_path,
        subfolder=subfolder,
        tags=metadata["tags"],
        extra_frontmatter={**conversion.extra_frontmatter, "status": "completed"},
        subject_title=route.subject_title,
    )
    concept_file = write_concept(spec)
    print(f"[pipeline] wrote OKF concept: {concept_file}")
    return concept_file


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "untitled"
